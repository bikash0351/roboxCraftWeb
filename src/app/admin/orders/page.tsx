
"use client";

import { useEffect, useState } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, Timestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";
import type { CartItem } from "@/components/cart-provider";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, MoreHorizontal, Trash2, Edit, Eye } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Order {
    id: string;
    createdAt: Timestamp;
    total: number;
    status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
    items: CartItem[];
    fullName: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    discount?: number;
    coupon?: string;
}

export default function AdminOrdersPage() {
    const { admin, loading: authLoading } = useAdminAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !admin) {
            router.replace('/admin/login');
        }
    }, [admin, authLoading, router]);

    const fetchOrders = async () => {
        if (admin) {
            setLoading(true);
            try {
                const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(ordersQuery);
                const allOrders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
                setOrders(allOrders);
            } catch (error) {
                console.error("Error fetching orders:", error);
            } finally {
                setLoading(false);
            }
        }
    };
    
    useEffect(() => {
        fetchOrders();
    }, [admin]);

     const handleDelete = async (orderId: string) => {
        try {
            await deleteDoc(doc(db, "orders", orderId));
            setOrders(orders.filter(order => order.id !== orderId));
        } catch (error) {
            console.error("Error deleting order: ", error);
        }
    };

    const handleUpdateStatus = async (orderId: string, status: Order['status']) => {
        try {
            const orderRef = doc(db, "orders", orderId);
            await updateDoc(orderRef, { status: status });
            setOrders(orders.map(order => order.id === orderId ? { ...order, status } : order));
        } catch (error) {
            console.error("Error updating order status: ", error);
        }
    };

    if (authLoading || loading || !admin) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
             <h1 className="text-lg font-semibold md:text-2xl">Orders</h1>
            <Card>
                <CardHeader>
                    <CardTitle>All Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Coupon</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length > 0 ? (
                                orders.map(order => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">#{order.id.slice(0, 7)}</TableCell>
                                        <TableCell>{order.fullName}</TableCell>
                                        <TableCell>{new Date(order.createdAt.seconds * 1000).toLocaleDateString()}</TableCell>
                                        <TableCell>₹{order.total.toFixed(2)}</TableCell>
                                        <TableCell>{order.coupon || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Badge variant={order.status === 'pending' ? 'secondary' : 'default'} className="capitalize">{order.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleUpdateStatus(order.id, 'shipped')}><Edit className="mr-2 h-4 w-4" />Mark as Shipped</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleUpdateStatus(order.id, 'delivered')}><Edit className="mr-2 h-4 w-4" />Mark as Delivered</DropdownMenuItem>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>This will permanently delete the order.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(order.id)}>Continue</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24">No orders found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
