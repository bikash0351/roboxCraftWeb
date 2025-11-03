
"use client";

import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PlusCircle, Trash2, Calendar as CalendarIcon, Pause, Play } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, Timestamp, updateDoc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const couponSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(20).transform(val => val.toUpperCase()),
  discountType: z.enum(["percentage", "amount"]),
  discountValue: z.coerce.number().min(1, "Discount value must be at least 1"),
  categoryType: z.enum(["Universal", "Kits", "Components"]),
  expiryDate: z.date().optional(),
  status: z.enum(['active', 'paused']),
}).refine((data) => {
    if (data.discountType === 'percentage' && data.discountValue > 90) {
        return false;
    }
    return true;
}, {
    message: "Percentage discount cannot exceed 90%",
    path: ["discountValue"],
});

export interface Coupon extends z.infer<typeof couponSchema> {
  firestoreId: string;
  usageCount: number;
  expiryDate?: Timestamp;
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
            discountType: "percentage",
            discountValue: 10,
            categoryType: "Universal",
            status: 'active',
        },
    });

    const discountType = form.watch("discountType");
     
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

    const { activeCoupons, pausedCoupons, expiredCoupons } = useMemo(() => {
        const now = new Date();
        const active: Coupon[] = [];
        const paused: Coupon[] = [];
        const expired: Coupon[] = [];

        coupons.forEach(coupon => {
            const expiryDate = coupon.expiryDate?.toDate();
            if (expiryDate && expiryDate < now) {
                expired.push(coupon);
            } else if (coupon.status === 'paused') {
                paused.push(coupon);
            } else {
                active.push(coupon);
            }
        });
        return { activeCoupons: active, pausedCoupons: paused, expiredCoupons: expired };
    }, [coupons]);


    const handleDialogOpen = () => {
        form.reset({
            code: "",
            discountType: "percentage",
            discountValue: 10,
            categoryType: "Universal",
            status: 'active',
            expiryDate: undefined,
        });
        setDialogOpen(true);
    };

    const handleDeleteAlertOpen = (coupon: Coupon) => {
        setSelectedCoupon(coupon);
        setDeleteAlertOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof couponSchema>) => {
        try {
            const dataToSave: any = {
                ...values,
                usageCount: 0,
            };
            if (values.expiryDate) {
                dataToSave.expiryDate = Timestamp.fromDate(values.expiryDate);
            }

            await addDoc(collection(db, "coupons"), dataToSave);
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

    const toggleCouponStatus = async (coupon: Coupon) => {
        const newStatus = coupon.status === 'active' ? 'paused' : 'active';
        try {
            const couponRef = doc(db, "coupons", coupon.firestoreId);
            await updateDoc(couponRef, { status: newStatus });
            toast({ title: "Status Updated", description: `Coupon "${coupon.code}" is now ${newStatus}.` });
            fetchCoupons();
        } catch (error) {
            console.error("Error updating status:", error);
            toast({ variant: "destructive", title: "Update Failed" });
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
    
    const CouponTable = ({ coupons, title, isExpired = false }: { coupons: Coupon[], title: string, isExpired?: boolean }) => (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Usage</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {coupons.length > 0 ? coupons.map(coupon => (
                            <TableRow key={coupon.firestoreId}>
                                <TableCell className="font-medium">{coupon.code}</TableCell>
                                <TableCell>
                                    {coupon.discountValue}{coupon.discountType === 'percentage' ? '%' : '₹'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{coupon.categoryType}</Badge>
                                </TableCell>
                                 <TableCell>{coupon.usageCount}</TableCell>
                                <TableCell>{coupon.expiryDate ? format(coupon.expiryDate.toDate(), 'PPP') : 'Never'}</TableCell>
                                <TableCell className="text-right">
                                    {!isExpired && (
                                         <Button variant="ghost" size="icon" onClick={() => toggleCouponStatus(coupon)}>
                                            {coupon.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteAlertOpen(coupon)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No {title.toLowerCase()} coupons found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );

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
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Add New Coupon</DialogTitle>
                            <DialogDescription>
                                Create a new discount coupon for your customers.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form id="coupon-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                                <FormField control={form.control} name="code" render={({ field }) => (
                                    <FormItem><FormLabel>Coupon Code</FormLabel><FormControl><Input placeholder="e.g., SUMMER10" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="discountType" render={({ field }) => (
                                    <FormItem><FormLabel>Discount Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="amount">Fixed Amount (₹)</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="discountValue" render={({ field }) => (
                                        <FormItem><FormLabel>Value ({discountType === 'percentage' ? '%' : '₹'})</FormLabel><FormControl><Input type="number" placeholder="e.g., 15" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <FormField control={form.control} name="categoryType" render={({ field }) => (
                                <FormItem><FormLabel>Category Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Universal">Universal</SelectItem><SelectItem value="Kits">Kits Only</SelectItem><SelectItem value="Components">Components Only</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="expiryDate" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Expiry Date</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem><FormLabel>Initial Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="paused">Paused</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                )}/>
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
             <Tabs defaultValue="active" className="w-full">
                <TabsList>
                    <TabsTrigger value="active">Active ({activeCoupons.length})</TabsTrigger>
                    <TabsTrigger value="paused">Paused ({pausedCoupons.length})</TabsTrigger>
                    <TabsTrigger value="expired">Expired ({expiredCoupons.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="active">
                    <CouponTable coupons={activeCoupons} title="Active" />
                </TabsContent>
                <TabsContent value="paused">
                     <CouponTable coupons={pausedCoupons} title="Paused" />
                </TabsContent>
                <TabsContent value="expired">
                    <CouponTable coupons={expiredCoupons} title="Expired" isExpired={true} />
                </TabsContent>
            </Tabs>
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

    