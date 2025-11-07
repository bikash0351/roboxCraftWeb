
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
import { Loader2, PlusCircle, Trash2, Heart, MessageCircle, Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import Image from "next/image";

// Note: For this page to function correctly, Firebase Storage rules must allow public read access
// to the `reels/` path.
const reelSchema = z.object({
  description: z.string().min(3, "Description is required"),
  video: z.instanceof(File).refine(file => file.size > 0, "A video file is required."),
});

export interface Reel {
  id: string;
  videoUrl: string;
  videoPath: string; // To delete from storage
  description: string;
  likes: number;
  comments: number;
  shares: number;
  createdAt: any;
  uploaderName: string;
  uploaderImage: string;
}

export default function AdminReelsPage() {
    const { admin, loading: adminLoading } = useAdminAuth();
    const router = useRouter();
    const [reels, setReels] = useState<Reel[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof reelSchema>>({
        resolver: zodResolver(reelSchema),
        defaultValues: { description: "" },
    });

    const fetchReels = useCallback(async () => {
        setDataLoading(true);
        try {
            const reelsQuery = query(collection(db, "reels"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(reelsQuery);
            const reelsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as Reel));
            setReels(reelsData);
        } catch (error) {
            console.error("Error fetching reels:", error);
            toast({ variant: "destructive", title: "Failed to fetch reels" });
        } finally {
            setDataLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!adminLoading && !admin) {
            router.replace('/admin/login');
        } else if (admin) {
            fetchReels();
        }
    }, [admin, adminLoading, router, fetchReels]);

    const handleDialogOpen = () => {
        form.reset({ description: "" });
        setDialogOpen(true);
    };

    const handleDeleteAlertOpen = (reel: Reel) => {
        setSelectedReel(reel);
        setDeleteAlertOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof reelSchema>) => {
        try {
            const videoFile = values.video;
            const videoPath = `reels/${Date.now()}-${videoFile.name}`;
            const storageRef = ref(storage, videoPath);

            // Upload video
            await uploadBytes(storageRef, videoFile);
            const videoUrl = await getDownloadURL(storageRef);

            // Save metadata to Firestore
            await addDoc(collection(db, "reels"), {
                description: values.description,
                videoUrl,
                videoPath,
                likes: 0,
                comments: 0,
                shares: 0,
                createdAt: serverTimestamp(),
                uploaderName: "RoboXCraft",
                uploaderImage: "/images/roboxcraft.png",
            });

            toast({ title: "Reel Uploaded", description: "Your new reel is live." });
            fetchReels();
            setDialogOpen(false);
        } catch (error) {
            console.error("Error saving reel: ", error);
            toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload the reel." });
        }
    };

    const handleDelete = async () => {
        if (!selectedReel) return;
        try {
            // Delete Firestore document
            await deleteDoc(doc(db, "reels", selectedReel.id));

            // Delete video from Storage
            const videoRef = ref(storage, selectedReel.videoPath);
            await deleteObject(videoRef);

            toast({ title: "Reel Deleted" });
            fetchReels();
            setDeleteAlertOpen(false);
        } catch (error) {
            console.error("Error deleting reel: ", error);
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
                <h1 className="text-lg font-semibold md:text-2xl">Reels</h1>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleDialogOpen}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Reel
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add New Reel</DialogTitle>
                            <DialogDescription>Upload a video and add a description.</DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form id="reel-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                                <FormField control={form.control} name="video" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Video File</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="file" 
                                                accept="video/mp4,video/quicktime" 
                                                onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="e.g., Check out our new line-follower kit!" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </form>
                        </Form>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" form="reel-form" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Upload Reel
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Reels</CardTitle>
                    <CardDescription>Manage your short-form video content.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Preview</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Stats (L/C/S)</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reels.length > 0 ? reels.map(reel => (
                                <TableRow key={reel.id}>
                                    <TableCell>
                                        <video
                                            src={reel.videoUrl}
                                            className="aspect-square rounded-md object-cover h-16 w-16 bg-muted"
                                            playsInline
                                            muted
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium max-w-xs truncate">{reel.description}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Heart className="h-3 w-3"/> {reel.likes}
                                            <MessageCircle className="h-3 w-3"/> {reel.comments}
                                            <Send className="h-3 w-3"/> {reel.shares}
                                        </div>
                                    </TableCell>
                                    <TableCell>{reel.createdAt ? new Date(reel.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAlertOpen(reel)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No reels found. Upload one to get started!
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
                            This action cannot be undone. This will permanently delete the reel.
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
