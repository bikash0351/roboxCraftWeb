
"use client";

import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDocs, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Loader2, ArrowLeft, PlusCircle, Trash2, GripVertical } from "lucide-react";
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { Course, Lesson } from '@/lib/data';
import Image from 'next/image';
import { Separator } from "./ui/separator";

const TiptapEditor = dynamic(() => import('@/components/rich-text-editor'), { ssr: false });

const lessonSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Lesson title is required."),
  content: z.string().min(20, "Lesson content is required."),
  videoUrl: z.string().url().optional().or(z.literal('')),
});

const courseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  description: z.string().min(10, "Description is required.").max(300, "Description cannot be longer than 300 characters."),
  featuredImage: z.union([z.string().url("Invalid URL").optional(), z.instanceof(File).optional()]),
  lessons: z.array(lessonSchema).min(1, "At least one lesson is required."),
});

interface CourseFormProps {
    existingCourse?: Course;
}

export function CourseForm({ existingCourse }: CourseFormProps) {
    const { admin, loading: adminLoading } = useAdminAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [initialLessons, setInitialLessons] = useState<Lesson[]>([]);

    const form = useForm<z.infer<typeof courseSchema>>({
        resolver: zodResolver(courseSchema),
        defaultValues: existingCourse ? {
            title: existingCourse.title,
            description: existingCourse.description,
            featuredImage: existingCourse.featuredImage,
            lessons: [],
        } : {
            title: "",
            description: "",
            lessons: [{ title: '', content: '', videoUrl: '' }],
        },
    });

    const { fields, append, remove, move } = useFieldArray({
        control: form.control,
        name: "lessons",
    });

    useEffect(() => {
        if (existingCourse) {
            const fetchLessons = async () => {
                const lessonsQuery = query(collection(db, "courses", existingCourse.id, "lessons"), orderBy("order"));
                const querySnapshot = await getDocs(lessonsQuery);
                const lessonsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
                form.reset({ ...form.getValues(), lessons: lessonsData });
                setInitialLessons(lessonsData);
            };
            fetchLessons();
        }
    }, [existingCourse, form]);
    
    const handleImageUpload = async (file: File): Promise<string> => {
        if (!admin) throw new Error("Not authenticated");
        setIsUploading(true);
        try {
            const storageRef = ref(storage, `courses/${Date.now()}-${file.name}`);
            await uploadBytes(storageRef, file);
            return await getDownloadURL(storageRef);
        } finally {
            setIsUploading(false);
        }
    };
    
    const onSubmit = async (values: z.infer<typeof courseSchema>) => {
        if (!admin) {
            toast({ variant: "destructive", title: "Not authenticated" });
            return;
        }

        try {
            let imageUrl = existingCourse?.featuredImage || "";
            if (values.featuredImage instanceof File) {
                imageUrl = await handleImageUpload(values.featuredImage);
            }
            
            const courseData = {
                title: values.title,
                description: values.description,
                featuredImage: imageUrl,
                updatedAt: serverTimestamp(),
            };

            let courseId = existingCourse?.id;

            if (existingCourse) {
                const courseRef = doc(db, "courses", existingCourse.id);
                await updateDoc(courseRef, courseData);
            } else {
                const docRef = await addDoc(collection(db, "courses"), {
                    ...courseData,
                    createdAt: serverTimestamp(),
                });
                courseId = docRef.id;
            }
            
            if (!courseId) throw new Error("Course ID not found");

            // Batch write for lessons
            const batch = writeBatch(db);
            const lessonsCollectionRef = collection(db, "courses", courseId, "lessons");

            // Find lessons to delete
            const newLessonIds = new Set(values.lessons.map(l => l.id).filter(Boolean));
            initialLessons.forEach(initialLesson => {
                if (!newLessonIds.has(initialLesson.id)) {
                    batch.delete(doc(lessonsCollectionRef, initialLesson.id));
                }
            });

            values.lessons.forEach((lesson, index) => {
                const lessonData = { ...lesson, order: index };
                const lessonRef = lesson.id ? doc(lessonsCollectionRef, lesson.id) : doc(lessonsCollectionRef);
                batch.set(lessonRef, lessonData, { merge: true });
            });

            await batch.commit();

            toast({ title: existingCourse ? "Course Updated" : "Course Created" });
            router.push("/admin/courses");
            router.refresh();

        } catch (error) {
            console.error("Error saving course:", error);
            toast({ variant: "destructive", title: "An error occurred", description: "Could not save the course." });
        }
    };

    if (adminLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
    }
    
    return (
        <div className="container mx-auto max-w-4xl py-8">
            <Link href="/admin/courses" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back to All Courses
            </Link>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>{existingCourse ? "Edit Course" : "Create New Course"}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField control={form.control} name="title" render={({ field }) => (
                                <FormItem><FormLabel>Course Title</FormLabel><FormControl><Input placeholder="e.g., Introduction to Arduino" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem><FormLabel>Course Description</FormLabel><FormControl><Textarea placeholder="A brief summary of what this course is about." {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="featuredImage" render={({ field: { onChange, value, ...rest } }) => (
                                <FormItem>
                                    <FormLabel>Featured Image</FormLabel>
                                     {(existingCourse?.featuredImage || typeof value === 'object') && (
                                        <div className="relative w-full aspect-video rounded-md overflow-hidden my-2">
                                            <Image
                                                src={typeof value === 'string' ? value : (value ? URL.createObjectURL(value) : existingCourse?.featuredImage!)}
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
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Lessons</CardTitle>
                            <CardDescription>Add and manage lessons for this course.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {fields.map((field, index) => (
                                <div key={field.id} className="border p-4 rounded-md space-y-4 relative">
                                    <h3 className="font-semibold">Lesson {index + 1}</h3>
                                    <FormField control={form.control} name={`lessons.${index}.title`} render={({ field }) => (
                                        <FormItem><FormLabel>Lesson Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name={`lessons.${index}.videoUrl`} render={({ field }) => (
                                        <FormItem><FormLabel>Video URL (Optional)</FormLabel><FormControl><Input placeholder="https://www.youtube.com/watch?v=..." {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <Controller
                                        name={`lessons.${index}.content`}
                                        control={form.control}
                                        render={({ field: controllerField }) => (
                                            <FormItem>
                                                <FormLabel>Lesson Content</FormLabel>
                                                <TiptapEditor 
                                                    value={controllerField.value} 
                                                    onChange={controllerField.onChange} 
                                                    onImageUpload={handleImageUpload}
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="flex justify-end gap-2">
                                        {fields.length > 1 && (
                                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={() => append({ title: '', content: '', videoUrl: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4"/> Add Lesson
                            </Button>
                        </CardContent>
                    </Card>
                    
                    <Button type="submit" disabled={form.formState.isSubmitting || isUploading}>
                        {(form.formState.isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {existingCourse ? "Save Changes" : "Publish Course"}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
