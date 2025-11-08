
"use client";

import { useEffect, useState } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, Timestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";
import type { CartItem } from "@/components/cart-provider";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Loader2, MoreHorizontal, Trash2, Edit, Eye, CircleDashed } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

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
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
    const { toast } = useToast();

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
        if (!authLoading && !admin) {
            router.replace('/admin/login');
        } else {
            fetchOrders();
        }
    }, [admin, authLoading, router]);

     const handleDelete = async () => {
        if (!orderToDelete) return;
        try {
            await deleteDoc(doc(db, "orders", orderToDelete.id));
            toast({ title: "Order Deleted", description: `Order #${orderToDelete.id.slice(0,7)} has been removed.` });
            setOrders(orders.filter(order => order.id !== orderToDelete.id));
            setOrderToDelete(null);
        } catch (error) {
            console.error("Error deleting order: ", error);
            toast({ variant: "destructive", title: "Deletion failed" });
        }
    };

    const handleUpdateStatus = async (orderId: string, status: Order['status']) => {
        try {
            const orderRef = doc(db, "orders", orderId);
            await updateDoc(orderRef, { status: status });
            toast({ title: "Order Status Updated", description: `Order status changed to ${status}.`});
            setOrders(orders.map(order => order.id === orderId ? { ...order, status } : order));
        } catch (error) {
            console.error("Error updating order status: ", error);
             toast({ variant: "destructive", title: "Update failed" });
        }
    };

    if (authLoading || loading || !admin) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    const getStatusVariant = (status: Order['status']) => {
        switch (status) {
            case 'pending': return 'secondary';
            case 'shipped': return 'default';
            case 'delivered': return 'default';
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
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
                                        <TableCell>
                                            <Badge variant={getStatusVariant(order.status)} className="capitalize">{order.status}</Badge>
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
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/admin/orders/${order.id}`}><Eye className="mr-2 h-4 w-4" />View Details</Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onSelect={() => handleUpdateStatus(order.id, 'shipped')}><Edit className="mr-2 h-4 w-4" />Mark as Shipped</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleUpdateStatus(order.id, 'delivered')}><Edit className="mr-2 h-4 w-4" />Mark as Delivered</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleUpdateStatus(order.id, 'cancelled')} className="text-destructive"><CircleDashed className="mr-2 h-4 w-4" />Mark as Cancelled</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                     <DropdownMenuItem onSelect={() => setOrderToDelete(order)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete Order</DropdownMenuItem>
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

            <AlertDialog open={!!orderToDelete} onOpenChange={(isOpen) => !isOpen && setOrderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the order #{orderToDelete?.id.slice(0,7)}.</AlertDialogDescription>
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
