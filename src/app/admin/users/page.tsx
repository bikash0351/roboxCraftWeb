
"use client";

import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2 } from "lucide-react";
import { collection, getDocs, query, orderBy, Timestamp, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface AppUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    lastLoginTime: Timestamp | null;
    photoURL?: string;
}

export default function AdminUsersPage() {
    const { admin, loading } = useAdminAuth();
    const router = useRouter();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

    useEffect(() => {
        if (!loading && !admin) {
            router.replace('/admin/login');
        }
    }, [admin, loading, router]);


    const fetchUsers = async () => {
         if (admin) {
            setDataLoading(true);
            try {
                const usersQuery = query(collection(db, "users"), orderBy("lastLoginTime", "desc"));
                const querySnapshot = await getDocs(usersQuery);
                const usersData = querySnapshot.docs.map(doc => doc.data() as AppUser);
                setUsers(usersData);
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setDataLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [admin]);

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        
        // Note: Deleting a user from Firestore does not delete them from Firebase Authentication.
        // A Cloud Function would be required to do that securely. For this admin panel, we'll
        // just remove their Firestore record.
        try {
            await deleteDoc(doc(db, "users", userToDelete.uid));
            setUsers(users.filter(u => u.uid !== userToDelete.uid));
            setUserToDelete(null);
        } catch (error) {
            console.error("Error deleting user:", error);
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
                <h1 className="text-lg font-semibold md:text-2xl">Users</h1>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Registered Users</CardTitle>
                    <CardDescription>A list of all users who have signed up for your store.</CardDescription>
                </CardHeader>
                <CardContent>
                    {users.length > 0 ? (
                        <div className="divide-y divide-border">
                        {users.map(user => (
                            <div key={user.uid} className="py-4 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                     <Avatar>
                                        <AvatarImage src={user.photoURL} />
                                        <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{user.displayName || 'N/A'}</p>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-medium">Last Active</p>
                                        <p className="text-sm text-muted-foreground">{user.lastLoginTime ? new Date(user.lastLoginTime.seconds * 1000).toLocaleDateString() : 'Never'}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setUserToDelete(user)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">No users found.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will delete the user record for <span className="font-medium">{userToDelete?.email}</span> from the database. It cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

    