
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
import type { Course } from "@/lib/data";

export default function AdminCoursesPage() {
    const { admin, loading: adminLoading } = useAdminAuth();
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const { toast } = useToast();

    const fetchCourses = useCallback(async () => {
        setDataLoading(true);
        try {
            const coursesQuery = query(collection(db, "courses"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(coursesQuery);
            const coursesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as Course));
            setCourses(coursesData);
        } catch (error) {
            console.error("Error fetching courses:", error);
            toast({ variant: "destructive", title: "Failed to fetch courses" });
        } finally {
            setDataLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!adminLoading && !admin) {
            router.replace('/admin/login');
        } else if (admin) {
            fetchCourses();
        }
    }, [admin, adminLoading, router, fetchCourses]);

    const handleDeleteAlertOpen = (course: Course) => {
        setSelectedCourse(course);
        setDeleteAlertOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedCourse) return;
        try {
            // Note: This does not delete subcollections like lessons. 
            // A Cloud Function would be needed for recursive deletion.
            await deleteDoc(doc(db, "courses", selectedCourse.id));

            if (selectedCourse.featuredImage) {
                try {
                    const imageRef = ref(storage, selectedCourse.featuredImage);
                    await deleteObject(imageRef);
                } catch (storageError: any) {
                    if (storageError.code !== 'storage/object-not-found') throw storageError;
                }
            }

            toast({ title: "Course Deleted" });
            fetchCourses();
            setDeleteAlertOpen(false);
        } catch (error) {
            console.error("Error deleting course: ", error);
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
                <h1 className="text-lg font-semibold md:text-2xl">Courses</h1>
                <Button asChild>
                    <Link href="/admin/courses/new">
                        <PlusCircle className="mr-2 h-4 w-4" /> Create Course
                    </Link>
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Courses</CardTitle>
                    <CardDescription>Manage your educational courses here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Image</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {courses.length > 0 ? courses.map(course => (
                                <TableRow key={course.id}>
                                    <TableCell>
                                        <Image
                                            src={course.featuredImage || "https://placehold.co/64x64"}
                                            alt={course.title}
                                            width={64}
                                            height={64}
                                            className="aspect-square rounded-md object-cover"
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium max-w-xs truncate">{course.title}</TableCell>
                                    <TableCell>{course.createdAt ? format(course.createdAt.toDate(), "PPP") : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/admin/courses/edit/${course.id}`}>
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAlertOpen(course)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No courses found. Create your first one!
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
                            This action cannot be undone. This will permanently delete the course.
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
