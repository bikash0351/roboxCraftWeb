
"use client";

import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2, PlusCircle } from "lucide-react";
import { collection, getDocs, query, orderBy, Timestamp, doc, deleteDoc, setDoc } from "firebase/firestore";
import { db, auth as firebaseAuth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface AdminUser {
    uid: string;
    email: string | null;
    creationTime?: Timestamp;
    lastLoginTime?: Timestamp;
}

const addAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});


export default function AdminUsersPage() {
    const { admin, loading } = useAdminAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const form = useForm<z.infer<typeof addAdminSchema>>({
        resolver: zodResolver(addAdminSchema),
        defaultValues: { email: "", password: "" },
    });

    useEffect(() => {
        if (!loading && !admin) {
            router.replace('/admin/login');
        }
    }, [admin, loading, router]);


    const fetchUsers = async () => {
         if (admin) {
            setDataLoading(true);
            try {
                const usersQuery = query(collection(db, "admins"), orderBy("creationTime", "desc"));
                const querySnapshot = await getDocs(usersQuery);
                const usersData = querySnapshot.docs.map(doc => doc.data() as AdminUser);
                setUsers(usersData);
            } catch (error) {
                console.error("Error fetching admin users:", error);
                toast({ variant: "destructive", title: "Failed to fetch admins."});
            } finally {
                setDataLoading(false);
            }
        }
    };

    useEffect(() => {
        if(admin) fetchUsers();
    }, [admin]);

    const handleAddAdmin = async (values: z.infer<typeof addAdminSchema>) => {
        try {
            // Note: This creates a user in the main Firebase Auth instance.
            // In a real multi-tenant app, you might use a separate Firebase project for admins.
            const userCredential = await createUserWithEmailAndPassword(firebaseAuth, values.email, values.password);
            const newAdmin = userCredential.user;

            await setDoc(doc(db, "admins", newAdmin.uid), {
                uid: newAdmin.uid,
                email: newAdmin.email,
                creationTime: Timestamp.now(),
                lastLoginTime: Timestamp.now(),
            });

            toast({ title: "Admin Created", description: `Admin user ${newAdmin.email} has been added.` });
            fetchUsers();
            setIsAddDialogOpen(false);
            form.reset();

        } catch (error: any) {
             console.error("Error creating admin user:", error);
             toast({
                variant: "destructive",
                title: "Creation Failed",
                description: error.code === 'auth/email-already-in-use' ? 'This email is already in use.' : 'Could not create admin user.',
            });
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        
        // This only deletes the Firestore record, not the Firebase Auth user.
        // A Cloud Function is required to safely delete the auth user.
        try {
            await deleteDoc(doc(db, "admins", userToDelete.uid));
            toast({ title: "Admin Record Deleted", description: `Record for ${userToDelete.email} has been removed.` });
            setUsers(users.filter(u => u.uid !== userToDelete.uid));
            setUserToDelete(null);
        } catch (error) {
            console.error("Error deleting admin user:", error);
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
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Admin Users</h1>
                 <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Admin
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Admin</DialogTitle>
                            <DialogDescription>Create a new user with admin privileges.</DialogDescription>
                        </DialogHeader>
                         <Form {...form}>
                            <form id="add-admin-form" onSubmit={form.handleSubmit(handleAddAdmin)} className="space-y-4 py-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                        <Input type="email" placeholder="admin@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                        <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" form="add-admin-form" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Create Admin
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Registered Admins</CardTitle>
                    <CardDescription>List of all users with access to the admin dashboard.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Last Active</TableHead>
                                <TableHead>Created On</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {users.length > 0 ? (
                            users.map(user => (
                                <TableRow key={user.uid}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="font-medium">{user.email}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{user.lastLoginTime ? new Date(user.lastLoginTime.seconds * 1000).toLocaleString() : 'Never'}</TableCell>
                                    <TableCell>{user.creationTime ? new Date(user.creationTime.seconds * 1000).toLocaleDateString() : 'Unknown'}</TableCell>
                                    <TableCell className="text-right">
                                         <Button variant="ghost" size="icon" onClick={() => setUserToDelete(user)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No admin users found. Add one to get started.
                                </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete the Firestore record for <span className="font-medium">{userToDelete?.email}</span>. It will not delete the user from Firebase Authentication. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">Delete Record</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
