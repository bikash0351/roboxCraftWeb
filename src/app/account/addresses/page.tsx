
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, MapPin, Plus, Home, Briefcase, Trash2, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const addressSchema = z.object({
    name: z.string().min(2, "Name is required"),
    mobileNumber: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
    pincode: z.string().regex(/^\d{6}$/, "Invalid Pincode"),
    locality: z.string().min(3, "Locality is required"),
    address: z.string().min(5, "Address is required"),
    cityDistrictTown: z.string().min(2, "City/District/Town is required"),
    state: z.string().min(2, "State is required"),
    landmark: z.string().optional(),
    alternatePhone: z.string().optional(),
    addressType: z.enum(["Home", "Work"]),
});

type Address = z.infer<typeof addressSchema> & { id: string };

export default function MyAddressesPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

    const form = useForm<z.infer<typeof addressSchema>>({
        resolver: zodResolver(addressSchema),
        defaultValues: {
            name: "",
            mobileNumber: "",
            pincode: "",
            locality: "",
            address: "",
            cityDistrictTown: "",
            state: "",
            landmark: "",
            alternatePhone: "",
            addressType: "Home",
        },
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login?redirect=/account/addresses');
        }
    }, [user, authLoading, router]);

    const fetchAddresses = async () => {
        if (!user) return;
        setDataLoading(true);
        try {
            const addressesRef = collection(db, `users/${user.uid}/addresses`);
            const q = query(addressesRef, orderBy("name")); // Sort by name or another field
            const querySnapshot = await getDocs(q);
            const userAddresses = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Address));
            setAddresses(userAddresses);
        } catch (error) {
            console.error("Error fetching addresses:", error);
            toast({ variant: "destructive", title: "Failed to load addresses." });
        } finally {
            setDataLoading(false);
        }
    };
    
    useEffect(() => {
        if (user) {
            fetchAddresses();
        }
    }, [user]);

    const handleOpenForm = (address: Address | null = null) => {
        setSelectedAddress(address);
        if (address) {
            form.reset(address);
        } else {
            form.reset({
                name: "", mobileNumber: "", pincode: "", locality: "", address: "",
                cityDistrictTown: "", state: "", landmark: "", alternatePhone: "", addressType: "Home"
            });
        }
        setIsFormOpen(true);
    };

    const handleOpenAlert = (address: Address) => {
        setSelectedAddress(address);
        setIsAlertOpen(true);
    }
    
    const onSubmit = async (values: z.infer<typeof addressSchema>) => {
        if (!user) return;
        try {
            const addressesRef = collection(db, `users/${user.uid}/addresses`);
            if (selectedAddress) {
                // Update
                const addressDoc = doc(db, `users/${user.uid}/addresses`, selectedAddress.id);
                await updateDoc(addressDoc, values);
                toast({ title: "Address Updated" });
            } else {
                // Add
                await addDoc(addressesRef, values);
                toast({ title: "Address Added" });
            }
            fetchAddresses();
            setIsFormOpen(false);
        } catch (error) {
            console.error("Error saving address:", error);
            toast({ variant: "destructive", title: "Failed to save address." });
        }
    };
    
    const handleDelete = async () => {
        if (!user || !selectedAddress) return;
        try {
            await deleteDoc(doc(db, `users/${user.uid}/addresses`, selectedAddress.id));
            toast({ title: "Address Deleted" });
            fetchAddresses();
            setIsAlertOpen(false);
        } catch (error) {
            console.error("Error deleting address:", error);
            toast({ variant: "destructive", title: "Failed to delete address." });
        }
    };

    if (authLoading || dataLoading || !user) {
        return (
            <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
            <div className="container mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <MapPin className="h-8 w-8 text-primary" />
                        <h1 className="font-headline text-3xl font-bold">My Addresses</h1>
                    </div>
                    <Button className="mt-4 sm:mt-0" onClick={() => handleOpenForm()}>
                        <Plus className="mr-2 h-4 w-4" /> Add New Address
                    </Button>
                </div>
                
                {addresses.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                        <MapPin className="mx-auto h-16 w-16 text-muted-foreground" />
                        <h2 className="mt-6 text-xl font-semibold">No Saved Addresses</h2>
                        <p className="mt-2 text-muted-foreground">You haven't saved any addresses yet. Add one now!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {addresses.map((address) => (
                            <Card key={address.id} className="flex flex-col">
                                <CardHeader className="flex flex-row justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">{address.name}</CardTitle>
                                        <CardDescription>{address.mobileNumber}</CardDescription>
                                    </div>
                                    <Badge variant="outline" className="capitalize flex items-center gap-1">
                                        {address.addressType === 'Home' ? <Home className="h-3 w-3"/> : <Briefcase className="h-3 w-3" />}
                                        {address.addressType}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="flex-grow text-muted-foreground text-sm space-y-1">
                                    <p>{address.address}, {address.locality}</p>
                                    <p>{address.cityDistrictTown}, {address.state} - {address.pincode}</p>
                                    <p>India</p>
                                    {address.landmark && <p>Landmark: {address.landmark}</p>}
                                </CardContent>
                                <CardFooter className="border-t pt-4 flex gap-2">
                                     <Button variant="ghost" size="sm" onClick={() => handleOpenForm(address)}>
                                        <Edit className="mr-2 h-4 w-4"/> Edit
                                     </Button>
                                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleOpenAlert(address)}>
                                        <Trash2 className="mr-2 h-4 w-4"/> Delete
                                     </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Add/Edit Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{selectedAddress ? 'Edit Address' : 'Add a New Address'}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="mobileNumber" render={({ field }) => (
                                <FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="pincode" render={({ field }) => (
                                    <FormItem><FormLabel>Pincode</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="state" render={({ field }) => (
                                    <FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                             <FormField control={form.control} name="address" render={({ field }) => (
                                <FormItem><FormLabel>Address (House No, Building, Street, Area)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="locality" render={({ field }) => (
                                <FormItem><FormLabel>Locality/Town</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="cityDistrictTown" render={({ field }) => (
                                <FormItem><FormLabel>City/District</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="landmark" render={({ field }) => (
                                <FormItem><FormLabel>Landmark (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="addressType" render={({ field }) => (
                                <FormItem><FormLabel>Address Type</FormLabel><FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2">
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Home" id="home" /></FormControl><FormLabel htmlFor="home" className="font-normal">Home</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Work" id="work" /></FormControl><FormLabel htmlFor="work" className="font-normal">Work</FormLabel></FormItem>
                                    </RadioGroup>
                                </FormControl><FormMessage /></FormItem>
                            )}/>
                            <DialogFooter className="pt-4 col-span-full">
                                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                     {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Address
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Delete Alert Dialog */}
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete this address.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

    