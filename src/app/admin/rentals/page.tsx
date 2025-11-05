
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

const rentalPlanSchema = z.object({
  duration: z.coerce.number().int().positive("Duration must be a positive integer."),
  feePercentage: z.coerce.number().min(0, "Fee cannot be negative.").max(100, "Fee cannot exceed 100%."),
});

export interface RentalPlan extends z.infer<typeof rentalPlanSchema> {
  id: string;
}

export default function AdminRentalPlansPage() {
    const { admin, loading: adminLoading } = useAdminAuth();
    const router = useRouter();
    const [plans, setPlans] = useState<RentalPlan[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<RentalPlan | null>(null);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof rentalPlanSchema>>({
        resolver: zodResolver(rentalPlanSchema),
        defaultValues: { duration: 7, feePercentage: 30 },
    });

    const fetchPlans = useCallback(async () => {
        setDataLoading(true);
        try {
            const plansQuery = query(collection(db, "rentalPlans"), orderBy("duration"));
            const querySnapshot = await getDocs(plansQuery);
            const plansData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as RentalPlan));
            setPlans(plansData);
        } catch (error) {
            console.error("Error fetching rental plans:", error);
            toast({ variant: "destructive", title: "Failed to fetch rental plans" });
        } finally {
            setDataLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!adminLoading && !admin) {
            router.replace('/admin/login');
        } else if (admin) {
            fetchPlans();
        }
    }, [admin, adminLoading, router, fetchPlans]);

    const handleDialogOpen = () => {
        form.reset({ duration: 7, feePercentage: 30 });
        setDialogOpen(true);
    };

    const handleDeleteAlertOpen = (plan: RentalPlan) => {
        setSelectedPlan(plan);
        setDeleteAlertOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof rentalPlanSchema>) => {
        try {
            await addDoc(collection(db, "rentalPlans"), values);
            toast({ title: "Rental Plan Added", description: `A ${values.duration}-day plan has been created.` });
            fetchPlans();
            setDialogOpen(false);
        } catch (error) {
            console.error("Error saving plan: ", error);
            toast({ variant: "destructive", title: "Save Failed", description: "Could not save rental plan." });
        }
    };

    const handleDelete = async () => {
        if (!selectedPlan) return;
        try {
            await deleteDoc(doc(db, "rentalPlans", selectedPlan.id));
            toast({ title: "Plan Deleted", description: `The rental plan has been deleted.` });
            fetchPlans();
            setDeleteAlertOpen(false);
        } catch (error) {
            console.error("Error deleting plan: ", error);
            toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete the plan." });
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
                <h1 className="text-lg font-semibold md:text-2xl">Rental Plans</h1>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleDialogOpen}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Rental Plan
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add New Rental Plan</DialogTitle>
                            <DialogDescription>
                                Create a new plan for renting out kits.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form id="plan-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                                <FormField control={form.control} name="duration" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Duration (Days)</FormLabel>
                                        <FormControl><Input type="number" placeholder="e.g., 7" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="feePercentage" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fee (%)</FormLabel>
                                        <FormControl><Input type="number" placeholder="e.g., 30" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </form>
                        </Form>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" form="plan-form" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Plan
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Rental Plans</CardTitle>
                    <CardDescription>These plans will be available for customers renting kits.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Duration</TableHead>
                                <TableHead>Fee</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {plans.length > 0 ? plans.map(plan => (
                                <TableRow key={plan.id}>
                                    <TableCell className="font-medium">{plan.duration} days</TableCell>
                                    <TableCell>{plan.feePercentage}%</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAlertOpen(plan)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        No rental plans found. Add one to get started!
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
                            This action cannot be undone. This will permanently delete the rental plan for {selectedPlan?.duration} days.
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
