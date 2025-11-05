
"use client";

import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";

const tagSchema = z.object({
  name: z.string().min(2, "Tag name must be at least 2 characters").max(50),
});

interface Tag {
  id: string;
  name: string;
}

export default function AdminTagsPage() {
    const { admin, loading: adminLoading } = useAdminAuth();
    const router = useRouter();
    const [tags, setTags] = useState<Tag[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof tagSchema>>({
        resolver: zodResolver(tagSchema),
        defaultValues: { name: "" },
    });

    const fetchTags = useCallback(async () => {
        setDataLoading(true);
        try {
            const tagsQuery = query(collection(db, "productTags"), orderBy("name"));
            const querySnapshot = await getDocs(tagsQuery);
            const tagsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
            } as Tag));
            setTags(tagsData);
        } catch (error) {
            console.error("Error fetching tags:", error);
            toast({ variant: "destructive", title: "Failed to fetch tags" });
        } finally {
            setDataLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!adminLoading && !admin) {
            router.replace('/admin/login');
        } else if (admin) {
            fetchTags();
        }
    }, [admin, adminLoading, router, fetchTags]);

    const handleDialogOpen = () => {
        form.reset({ name: "" });
        setDialogOpen(true);
    };

    const handleDeleteAlertOpen = (tag: Tag) => {
        setSelectedTag(tag);
        setDeleteAlertOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof tagSchema>) => {
        try {
            await addDoc(collection(db, "productTags"), {
                name: values.name,
            });
            toast({ title: "Tag Added", description: `Tag "${values.name}" has been created.` });
            fetchTags();
            setDialogOpen(false);
        } catch (error) {
            console.error("Error saving tag: ", error);
            toast({ variant: "destructive", title: "Save Failed", description: "Could not save tag." });
        }
    };

    const handleDelete = async () => {
        if (!selectedTag) return;
        try {
            await deleteDoc(doc(db, "productTags", selectedTag.id));
            toast({ title: "Tag Deleted", description: `Tag "${selectedTag.name}" has been deleted.` });
            fetchTags();
            setDeleteAlertOpen(false);
        } catch (error) {
            console.error("Error deleting tag: ", error);
            toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete tag." });
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
                <h1 className="text-lg font-semibold md:text-2xl">Product Tags</h1>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleDialogOpen}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Tag
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add New Tag</DialogTitle>
                            <DialogDescription>
                                Create a new tag to organize your products.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form id="tag-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tag Name</FormLabel>
                                        <FormControl><Input placeholder="e.g., Sensors" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </form>
                        </Form>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" form="tag-form" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Tag
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Tags</CardTitle>
                    <CardDescription>These tags can be assigned to products for better organization and filtering.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tag Name</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tags.length > 0 ? tags.map(tag => (
                                <TableRow key={tag.id}>
                                    <TableCell className="font-medium">{tag.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAlertOpen(tag)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center">
                                        No tags found. Add one to get started!
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
                            This action cannot be undone. This will permanently delete the tag
                            &quot;{selectedTag?.name}&quot;. This will not remove the tag from products that already have it.
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
