
"use client";

import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";

const couponSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(20).transform(val => val.toUpperCase()),
  discountPercentage: z.coerce.number().min(1, "Discount must be at least 1%").max(90, "Discount cannot exceed 90%"),
  type: z.enum(["Universal", "Kits", "Components"]),
});

export interface Coupon extends z.infer<typeof couponSchema> {
  firestoreId: string;
}

export default function AdminCouponsPage() {
    const { admin, loading: adminLoading } = useAdminAuth();
    const router = useRouter();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof couponSchema>>({
        resolver: zodResolver(couponSchema),
        defaultValues: {
            code: "",
            discountPercentage: 10,
            type: "Universal",
        },
    });
     
    const fetchCoupons = async () => {
        setDataLoading(true);
        try {
            const couponsQuery = query(collection(db, "coupons"), orderBy("code"));
            const querySnapshot = await getDocs(couponsQuery);
            const couponsData = querySnapshot.docs.map(doc => ({ 
                firestoreId: doc.id,
                ...doc.data() 
            } as Coupon));
            setCoupons(couponsData);
        } catch (error) {
            console.error("Error fetching coupons:", error);
            toast({ variant: "destructive", title: "Failed to fetch coupons" });
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (!adminLoading && !admin) {
            router.replace('/admin/login');
        } else if (admin) {
            fetchCoupons();
        }
    }, [admin, adminLoading, router]);

    const handleDialogOpen = () => {
        form.reset();
        setDialogOpen(true);
    };

    const handleDeleteAlertOpen = (coupon: Coupon) => {
        setSelectedCoupon(coupon);
        setDeleteAlertOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof couponSchema>) => {
        try {
            await addDoc(collection(db, "coupons"), values);
            toast({ title: "Coupon Added", description: `Coupon "${values.code}" has been created.` });
            fetchCoupons();
            setDialogOpen(false);
        } catch (error) {
            console.error("Error saving coupon: ", error);
            toast({ variant: "destructive", title: "Save Failed", description: "Could not save coupon to the database." });
        }
    };

    const handleDelete = async () => {
        if (!selectedCoupon) return;
        try {
            await deleteDoc(doc(db, "coupons", selectedCoupon.firestoreId));
            toast({ title: "Coupon Deleted", description: `Coupon "${selectedCoupon.code}" has been deleted.` });
            fetchCoupons();
            setDeleteAlertOpen(false);
        } catch (error) {
            console.error("Error deleting coupon: ", error);
            toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete coupon." });
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
                <h1 className="text-lg font-semibold md:text-2xl">Coupons</h1>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleDialogOpen}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Coupon
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add New Coupon</DialogTitle>
                            <DialogDescription>
                                Create a new discount coupon for your customers.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form id="coupon-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                                <FormField
                                    control={form.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Coupon Code</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., SUMMER10" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="discountPercentage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Discount Percentage (%)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="e.g., 15" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Coupon Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Universal">Universal</SelectItem>
                                                <SelectItem value="Kits">Kits Only</SelectItem>
                                                <SelectItem value="Components">Components Only</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                        <DialogFooter>
                             <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" form="coupon-form" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Coupon
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>All Coupons</CardTitle>
                    <CardDescription>Manage your discount coupons here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Discount</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {coupons.length > 0 ? coupons.map(coupon => (
                                <TableRow key={coupon.firestoreId}>
                                    <TableCell className="font-medium">{coupon.code}</TableCell>
                                    <TableCell>{coupon.discountPercentage}%</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{coupon.type}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAlertOpen(coupon)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No coupons found. Add your first coupon!
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
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the coupon
                            &quot;{selectedCoupon?.code}&quot;.
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
