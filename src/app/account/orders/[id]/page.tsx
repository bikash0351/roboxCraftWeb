
"use client";

import { useEffect, useState } from "react";
import { useParams, notFound, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc, type Timestamp, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderTracker } from "@/components/ui/order-tracker";
import { Loader2, ArrowLeft, Home, MapPin, Package, StickyNote, Bot, User } from "lucide-react";
import type { CartItem } from "@/components/cart-provider";
import { format } from "date-fns";


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
    mobileNumber: string;
    discount?: number;
    coupon?: string;
    subtotal: number;
    tax: number;
    shipping: number;
}

interface OrderNote {
    id: string;
    text: string;
    createdAt: Timestamp;
    author: 'Admin' | 'System' | 'Client';
}


export default function OrderDetailsPage() {
    const { user, loading: authLoading } = useAuth();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [notes, setNotes] = useState<OrderNote[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace(`/login?redirect=/account/orders/${id}`);
        }
    }, [user, authLoading, router, id]);
    
    useEffect(() => {
        if (user && id) {
            const fetchOrder = async () => {
                setLoading(true);
                try {
                    const orderRef = doc(db, "orders", id);
                    const orderSnap = await getDoc(orderRef);

                    if (orderSnap.exists() && orderSnap.data().userId === user.uid) {
                        setOrder({ id: orderSnap.id, ...orderSnap.data() } as Order);
                    } else {
                        notFound();
                    }
                } catch (error) {
                    console.error("Error fetching order:", error);
                    notFound();
                } finally {
                    setLoading(false);
                }
            };
            fetchOrder();

            const notesQuery = query(collection(db, "orders", id, "notes"), orderBy("createdAt", "desc"));
            const unsubscribe = onSnapshot(notesQuery, (snapshot) => {
                const notesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderNote));
                setNotes(notesData);
            });
            
            return () => unsubscribe();
        }
    }, [user, id]);

    if (loading || authLoading) {
        return (
            <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    if (!order) {
        return notFound();
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
         <div className="container mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
            <Button asChild variant="ghost" className="mb-4 -ml-4">
                <Link href="/account/orders">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders
                </Link>
            </Button>
            
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle className="font-headline text-2xl">Order #{order.id.slice(0, 7)}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Placed on {new Date(order.createdAt.seconds * 1000).toLocaleDateString()}
                            </p>
                        </div>
                        <Badge variant={getStatusVariant(order.status)} className="capitalize text-base px-4 py-2 self-start md:self-center">{order.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="p-4 border rounded-lg bg-muted/30">
                        <OrderTracker status={order.status} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Shipping Address</h3>
                            <div className="text-muted-foreground text-sm space-y-1">
                                <p>{order.fullName}</p>
                                <p>{order.address}, {order.city}</p>
                                <p>{order.country} - {order.postalCode}</p>
                                <p>Mobile: {order.mobileNumber}</p>
                            </div>
                        </div>
                        <div>
                             <h3 className="font-semibold mb-2 flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Order Summary</h3>
                            <div className="text-muted-foreground text-sm space-y-1">
                                <div className="flex justify-between"><span>Subtotal:</span> <span>₹{order.subtotal.toFixed(2)}</span></div>
                                {order.coupon && <div className="flex justify-between"><span>Coupon ({order.coupon}):</span> <span className="text-green-600">- ₹{order.discount?.toFixed(2)}</span></div>}
                                <div className="flex justify-between"><span>Shipping:</span> <span>₹{order.shipping.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>Tax (18%):</span> <span>₹{order.tax.toFixed(2)}</span></div>
                                <Separator className="my-1"/>
                                <div className="flex justify-between font-bold text-foreground"><span>Total:</span> <span>₹{order.total.toFixed(2)}</span></div>
                            </div>
                        </div>
                    </div>
                    
                    {notes.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-4 flex items-center gap-2"><StickyNote className="h-5 w-5" /> Updates from the seller</h3>
                             <div className="space-y-4 border p-4 rounded-lg">
                                {notes.map(note => (
                                    <div key={note.id} className="flex gap-3">
                                        <div className="flex-shrink-0">
                                            {note.author === 'Admin' ? <Bot className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-muted-foreground" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-muted-foreground">
                                                {note.author} • {note.createdAt ? format(note.createdAt.toDate(), 'PPpp') : '...'}
                                            </p>
                                            <p className="text-sm">{note.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <h3 className="font-semibold mb-4">Items in this order</h3>
                        <div className="space-y-4">
                            {order.items.map(item => {
                                const imageSrc = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : "https://placehold.co/64x64";
                                return (
                                <div key={item.id} className="flex items-center gap-4">
                                    <div className="relative h-16 w-16 flex-shrink-0 rounded-md bg-muted">
                                        <Image src={imageSrc} alt={item.name} fill className="object-cover" sizes="64px"/>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{item.name}</p>
                                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                    </div>
                                    <p className="text-sm font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                            )})}
                        </div>
                    </div>
                </CardContent>
            </Card>
         </div>
    );
}
