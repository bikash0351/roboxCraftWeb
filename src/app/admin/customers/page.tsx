
"use client";

import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2 } from "lucide-react";
import { collection, getDocs, query, orderBy, Timestamp, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Customer {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    registrationTime?: Timestamp;
    lastLoginTime?: Timestamp;
}

export default function AdminCustomersPage() {
    const { admin, loading } = useAdminAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

    useEffect(() => {
        if (!loading && !admin) {
            router.replace('/admin/login');
        }
    }, [admin, loading, router]);

    const fetchCustomers = async () => {
         if (admin) {
            setDataLoading(true);
            try {
                // First, get all admin UIDs
                const adminsQuery = query(collection(db, "admins"));
                const adminsSnapshot = await getDocs(adminsQuery);
                const adminUids = new Set(adminsSnapshot.docs.map(doc => doc.data().uid));

                // Then, get all users and filter out the admins
                const customersQuery = query(collection(db, "users"), orderBy("registrationTime", "desc"));
                const querySnapshot = await getDocs(customersQuery);
                
                const allUsersData = querySnapshot.docs.map(doc => doc.data() as Customer);
                const customersData = allUsersData.filter(user => !adminUids.has(user.uid));

                setCustomers(customersData);
            } catch (error) {
                console.error("Error fetching customers:", error);
                toast({ variant: "destructive", title: "Failed to fetch customers."});
            } finally {
                setDataLoading(false);
            }
        }
    };

    useEffect(() => {
        if(admin) fetchCustomers();
    }, [admin]);

    const handleDeleteCustomer = async () => {
        if (!customerToDelete) return;
        
        // This only deletes the Firestore record, not the Firebase Auth user.
        // A Cloud Function is required to safely delete the auth user.
        try {
            await deleteDoc(doc(db, "users", customerToDelete.uid));
            toast({ title: "Customer Record Deleted", description: `Record for ${customerToDelete.email} has been removed.` });
            setCustomers(customers.filter(c => c.uid !== customerToDelete.uid));
            setCustomerToDelete(null);
        } catch (error) {
            console.error("Error deleting customer record:", error);
            toast({ variant: "destructive", title: "Deletion Failed" });
        }
    }

    if (loading || dataLoading ||!admin) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-lg font-semibold md:text-2xl">Customers</h1>
             <Card>
                <CardHeader>
                    <CardTitle>Registered Customers</CardTitle>
                    <CardDescription>List of all customers who have created an account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Last Active</TableHead>
                                <TableHead>Joined On</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {customers.length > 0 ? (
                            customers.map(customer => (
                                <TableRow key={customer.uid}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                {customer.photoURL && <AvatarImage src={customer.photoURL} alt={customer.displayName || ''} />}
                                                <AvatarFallback>{customer.displayName?.charAt(0).toUpperCase() || customer.email?.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="font-medium">{customer.displayName || 'N/A'}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{customer.email}</TableCell>
                                    <TableCell>{customer.lastLoginTime ? new Date(customer.lastLoginTime.seconds * 1000).toLocaleString() : 'Never'}</TableCell>
                                    <TableCell>{customer.registrationTime ? new Date(customer.registrationTime.seconds * 1000).toLocaleDateString() : 'Unknown'}</TableCell>
                                    <TableCell className="text-right">
                                         <Button variant="ghost" size="icon" onClick={() => setCustomerToDelete(customer)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No customers found.
                                </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={!!customerToDelete} onOpenChange={(isOpen) => !isOpen && setCustomerToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete the Firestore record for <span className="font-medium">{customerToDelete?.email}</span>. It will not delete the user from Firebase Authentication. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteCustomer} className="bg-destructive hover:bg-destructive/90">Delete Record</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
