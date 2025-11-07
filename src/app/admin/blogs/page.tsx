
"use client";

import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PlusCircle, Trash2, Edit } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy, Timestamp } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import Image from "next/image";
import { format } from "date-fns";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  featuredImage: string;
  createdAt: Timestamp;
}

export default function AdminBlogsPage() {
    const { admin, loading: adminLoading } = useAdminAuth();
    const router = useRouter();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
    const { toast } = useToast();

    const fetchPosts = useCallback(async () => {
        setDataLoading(true);
        try {
            const postsQuery = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(postsQuery);
            const postsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as BlogPost));
            setPosts(postsData);
        } catch (error) {
            console.error("Error fetching blog posts:", error);
            toast({ variant: "destructive", title: "Failed to fetch posts" });
        } finally {
            setDataLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!adminLoading && !admin) {
            router.replace('/admin/login');
        } else if (admin) {
            fetchPosts();
        }
    }, [admin, adminLoading, router, fetchPosts]);

    const handleDeleteAlertOpen = (post: BlogPost) => {
        setSelectedPost(post);
        setDeleteAlertOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedPost) return;
        try {
            // Delete Firestore document
            await deleteDoc(doc(db, "blogs", selectedPost.id));

            // Delete featured image from Storage
            if (selectedPost.featuredImage) {
                try {
                    const imageRef = ref(storage, selectedPost.featuredImage);
                    await deleteObject(imageRef);
                } catch (storageError: any) {
                    // It's possible the file doesn't exist, so we don't want to block deletion
                    if (storageError.code !== 'storage/object-not-found') {
                        throw storageError;
                    }
                }
            }

            toast({ title: "Blog Post Deleted" });
            fetchPosts();
            setDeleteAlertOpen(false);
        } catch (error) {
            console.error("Error deleting post: ", error);
            toast({ variant: "destructive", title: "Delete Failed" });
        }
    };

    const isLoading = adminLoading || dataLoading;

    if (isLoading || !admin) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Blog Posts</h1>
                <Button asChild>
                    <Link href="/admin/blogs/new">
                        <PlusCircle className="mr-2 h-4 w-4" /> Create Post
                    </Link>
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Posts</CardTitle>
                    <CardDescription>Manage your blog posts here. Create, edit, or delete articles.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Image</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {posts.length > 0 ? posts.map(post => (
                                <TableRow key={post.id}>
                                    <TableCell>
                                        <Image
                                            src={post.featuredImage || "https://placehold.co/64x64"}
                                            alt={post.title}
                                            width={64}
                                            height={64}
                                            className="aspect-square rounded-md object-cover"
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium max-w-xs truncate">{post.title}</TableCell>
                                    <TableCell className="text-muted-foreground">/{post.slug}</TableCell>
                                    <TableCell>{post.createdAt ? format(post.createdAt.toDate(), "PPP") : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/admin/blogs/edit/${post.id}`}>
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAlertOpen(post)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No blog posts found. Write your first one!
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the blog post.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
