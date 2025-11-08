

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, type Timestamp } from "firebase/firestore";
import type { CartItem } from "@/components/cart-provider";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Package, ShoppingCart, Eye } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { OrderTracker } from "@/components/ui/order-tracker";

interface Order {
    id: string;
    createdAt: Timestamp;
    total: number;
    status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
    items: CartItem[];
}

export default function MyOrdersPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login?redirect=/account/orders');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const fetchOrders = async () => {
            if (user) {
                setLoading(true);
                try {
                    const ordersQuery = query(
                        collection(db, "orders"),
                        where("userId", "==", user.uid),
                        orderBy("createdAt", "desc")
                    );
                    const querySnapshot = await getDocs(ordersQuery);
                    const userOrders = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    } as Order));
                    setOrders(userOrders);
                } catch (error) {
                    console.error("Error fetching orders:", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        if (user) {
            fetchOrders();
        }
    }, [user]);

    if (authLoading || loading) {
        return (
            <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    if (orders.length === 0) {
        return (
             <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center gap-6 text-center">
                <ShoppingCart className="h-24 w-24 text-muted-foreground" />
                <h1 className="font-headline text-3xl font-bold">No Orders Yet</h1>
                <p className="text-muted-foreground">You haven't placed any orders with us. Let's change that!</p>
                <Button asChild>
                    <Link href="/shop">Start Shopping</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 mb-8">
                <Package className="h-8 w-8 text-primary" />
                <h1 className="font-headline text-3xl font-bold">My Orders</h1>
            </div>
            
            <div className="space-y-8">
                {orders.map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-muted/50 p-4">
                            <div className="grid gap-0.5">
                                <CardTitle className="font-semibold text-base">Order #{order.id.slice(0, 7)}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Date: {new Date(order.createdAt.seconds * 1000).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="w-full md:w-auto">
                                <OrderTracker status={order.status} />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="max-h-40 overflow-y-auto pr-2">
                                {order.items.map((item) => {
                                    const imageSrc = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : "https://placehold.co/64x64";
                                    return (
                                    <div key={item.id} className="flex items-center gap-4">
                                        <div className="relative h-16 w-16 flex-shrink-0 rounded-md bg-muted">
                                            <Image 
                                                src={imageSrc} 
                                                alt={item.name} 
                                                fill 
                                                className="object-cover"
                                                sizes="64px"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Qty: {item.quantity}
                                            </p>
                                        </div>
                                        <p className="text-sm font-medium">
                                            ₹{(item.price * item.quantity).toFixed(2)}
                                        </p>
                                    </div>
                                )})}
                            </div>
                        </CardContent>
                        <CardFooter className="bg-muted/50 p-4 flex items-center justify-between">
                            <Button asChild variant="outline">
                                <Link href={`/account/orders/${order.id}`}><Eye className="mr-2 h-4 w-4" />Track Order</Link>
                            </Button>
                            <p className="font-semibold">Total: ₹{order.total.toFixed(2)}</p>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
