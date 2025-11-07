
"use client";

import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Loader2, ArrowLeft, Upload } from "lucide-react";
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { BlogPost } from '@/lib/data';
import Image from 'next/image';

// Dynamically import the editor to avoid SSR issues
const TiptapEditor = dynamic(() => import('@/components/rich-text-editor'), { ssr: false });

const blogSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  slug: z.string().min(3, "Slug must be at least 3 characters long.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  excerpt: z.string().min(10, "Excerpt is required.").max(200, "Excerpt cannot be longer than 200 characters."),
  content: z.string().min(100, "Content must be at least 100 characters long."),
  featuredImage: z.union([z.string().url("Invalid URL"), z.instanceof(File).optional()]),
});

interface BlogFormProps {
    existingPost?: BlogPost;
}

export function BlogForm({ existingPost }: BlogFormProps) {
    const { admin, loading: adminLoading } = useAdminAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);

    const form = useForm<z.infer<typeof blogSchema>>({
        resolver: zodResolver(blogSchema),
        defaultValues: existingPost ? {
            ...existingPost,
            featuredImage: existingPost.featuredImage
        } : {
            title: "",
            slug: "",
            excerpt: "",
            content: "",
        },
    });
    
    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    };

    const titleValue = form.watch("title");
    useEffect(() => {
        if (titleValue && !form.getValues("slug") && !existingPost) {
            form.setValue("slug", generateSlug(titleValue), { shouldValidate: true });
        }
    }, [titleValue, form, existingPost]);
    
    const handleImageUpload = async (file: File): Promise<string> => {
        if (!admin) throw new Error("Not authenticated");
        setIsUploading(true);
        try {
            const storageRef = ref(storage, `blogs/${Date.now()}-${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            return downloadURL;
        } finally {
            setIsUploading(false);
        }
    };
    
    const onSubmit = async (values: z.infer<typeof blogSchema>) => {
        if (!admin) {
            toast({ variant: "destructive", title: "Not authenticated" });
            return;
        }

        try {
            let imageUrl = existingPost?.featuredImage || "";

            if (values.featuredImage instanceof File) {
                imageUrl = await handleImageUpload(values.featuredImage);
            }
            
            const postData = {
                title: values.title,
                slug: values.slug,
                excerpt: values.excerpt,
                content: values.content,
                featuredImage: imageUrl,
                updatedAt: serverTimestamp(),
            };

            if (existingPost) {
                const postRef = doc(db, "blogs", existingPost.id);
                await updateDoc(postRef, postData);
                toast({ title: "Post Updated", description: "Your blog post has been successfully updated." });
            } else {
                await addDoc(collection(db, "blogs"), {
                    ...postData,
                    createdAt: serverTimestamp(),
                    authorName: "RoboXCraft",
                    authorImage: "/images/roboxcraft.png"
                });
                toast({ title: "Post Created", description: "Your new blog post is now live." });
            }
            router.push("/admin/blogs");
            router.refresh();

        } catch (error) {
            console.error("Error saving post:", error);
            toast({ variant: "destructive", title: "An error occurred", description: "Could not save the blog post." });
        }
    };

    if (adminLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
    }
    
    return (
        <div className="container mx-auto max-w-4xl py-8">
            <Link href="/admin/blogs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back to All Posts
            </Link>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>{existingPost ? "Edit Blog Post" : "Create New Blog Post"}</CardTitle>
                             <CardDescription>Fill out the details below to {existingPost ? "update your" : "create a new"} blog post.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField control={form.control} name="title" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl><Input placeholder="Your amazing blog post title" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="slug" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Slug</FormLabel>
                                    <FormControl><Input placeholder="your-amazing-blog-post-title" {...field} /></FormControl>
                                     <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="featuredImage" render={({ field: { onChange, value, ...rest } }) => (
                                <FormItem>
                                    <FormLabel>Featured Image</FormLabel>
                                     {(existingPost?.featuredImage || typeof value === 'object') && (
                                        <div className="relative w-full aspect-video rounded-md overflow-hidden my-2">
                                            <Image
                                                src={typeof value === 'string' ? value : (value ? URL.createObjectURL(value) : existingPost?.featuredImage!)}
                                                alt="Featured image preview"
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    )}
                                    <FormControl>
                                        <Input type="file" accept="image/*" onChange={e => onChange(e.target.files?.[0])} {...rest} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="excerpt" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Excerpt</FormLabel>
                                    <FormControl><Textarea placeholder="A short, catchy summary of your post..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <Controller
                                name="content"
                                control={form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Content</FormLabel>
                                        <TiptapEditor 
                                            value={field.value} 
                                            onChange={field.onChange} 
                                            onImageUpload={handleImageUpload}
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                    <Button type="submit" disabled={form.formState.isSubmitting || isUploading}>
                        {(form.formState.isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {existingPost ? "Save Changes" : "Publish Post"}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
