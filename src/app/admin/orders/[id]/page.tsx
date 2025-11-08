
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, notFound, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, orderBy, getDocs, Timestamp, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Home, MapPin, Package, StickyNote, Send, Bot, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
    userId: string;
}

interface OrderNote {
    id: string;
    text: string;
    createdAt: Timestamp;
    author: 'Admin' | 'System' | 'Client';
}


export default function AdminOrderDetailsPage() {
    const { admin, loading: authLoading } = useAdminAuth();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { toast } = useToast();

    const [order, setOrder] = useState<Order | null>(null);
    const [notes, setNotes] = useState<OrderNote[]>([]);
    const [newNote, setNewNote] = useState("");
    const [loading, setLoading] = useState(true);

    const fetchOrderData = useCallback(async () => {
        if (admin && id) {
            setLoading(true);
            try {
                const orderRef = doc(db, "orders", id);
                const orderSnap = await getDoc(orderRef);

                if (orderSnap.exists()) {
                    setOrder({ id: orderSnap.id, ...orderSnap.data() } as Order);
                    
                    const notesQuery = query(collection(db, "orders", id, "notes"), orderBy("createdAt", "desc"));
                    const notesSnap = await getDocs(notesQuery);
                    const notesData = notesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderNote));
                    setNotes(notesData);

                } else {
                    notFound();
                }
            } catch (error) {
                console.error("Error fetching order:", error);
                notFound();
            } finally {
                setLoading(false);
            }
        }
    }, [admin, id]);

     useEffect(() => {
        if (!authLoading && !admin) {
            router.replace(`/admin/login`);
        }
    }, [admin, authLoading, router]);

    useEffect(() => {
        fetchOrderData();
    }, [fetchOrderData]);

    const handleStatusChange = async (newStatus: Order['status']) => {
        if (!order) return;
        try {
            const orderRef = doc(db, "orders", order.id);
            await updateDoc(orderRef, { status: newStatus });
            setOrder({ ...order, status: newStatus });
            toast({ title: "Status Updated", description: `Order status set to ${newStatus}.` });
        } catch (error) {
             console.error("Error updating status:", error);
            toast({ variant: "destructive", title: "Update Failed" });
        }
    };
    
    const handleAddNote = async () => {
        if (!order || !newNote.trim()) return;
        try {
            const notesColRef = collection(db, "orders", order.id, "notes");
            await addDoc(notesColRef, {
                text: newNote,
                author: 'Admin',
                createdAt: serverTimestamp(),
            });
            setNewNote("");
            fetchOrderData(); // Re-fetch to get the new note with server timestamp
            toast({ title: "Note Added" });
        } catch (error) {
            console.error("Error adding note:", error);
            toast({ variant: "destructive", title: "Failed to add note" });
        }
    }


    if (loading || authLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    if (!order) {
        return notFound();
    }
    
    return (
         <div className="flex flex-col gap-4">
            <Button asChild variant="ghost" className="self-start -ml-4">
                <Link href="/admin/orders">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders
                </Link>
            </Button>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="font-headline text-2xl">Order #{order.id.slice(0, 7)}</CardTitle>
                                <CardDescription>
                                    Placed on {format(order.createdAt.toDate(), "PPPp")}
                                </CardDescription>
                            </div>
                            <Select value={order.status} onValueChange={handleStatusChange}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Change status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="shipped">Shipped</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent>
                             <h3 className="font-semibold mb-4 text-lg">Items</h3>
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
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><StickyNote className="h-5 w-5" /> Order Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {notes.map(note => (
                                    <div key={note.id} className="flex gap-3">
                                        <div className="flex-shrink-0">
                                            {note.author === 'Admin' ? <Bot className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-muted-foreground" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-muted-foreground">
                                                {note.author} • {note.createdAt ? format(note.createdAt.toDate(), 'PPpp') : '...'}
                                            </p>
                                            <p className="text-sm bg-muted/50 p-2 rounded-md">{note.text}</p>
                                        </div>
                                    </div>
                                ))}
                                {notes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No notes for this order yet.</p>}
                            </div>
                            <Separator className="my-4"/>
                             <div className="flex items-start gap-4">
                                <Textarea 
                                    placeholder="Add a note for the customer or for internal records..."
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                />
                                <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                                    <Send className="h-4 w-4"/>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                             <h3 className="font-semibold flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Shipping Address</h3>
                        </CardHeader>
                        <CardContent className="text-muted-foreground text-sm space-y-1">
                             <p className="font-semibold text-foreground">{order.fullName}</p>
                            <p>{order.address}, {order.city}</p>
                            <p>{order.country} - {order.postalCode}</p>
                            <p>Mobile: {order.mobileNumber}</p>
                        </CardContent>
                    </Card>
                    <Card>
                         <CardHeader>
                            <h3 className="font-semibold flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Order Summary</h3>
                         </CardHeader>
                        <CardContent className="text-sm space-y-1">
                             <div className="flex justify-between"><span>Subtotal:</span> <span>₹{order.subtotal.toFixed(2)}</span></div>
                            {order.coupon && <div className="flex justify-between"><span>Coupon ({order.coupon}):</span> <span className="text-green-600">- ₹{order.discount?.toFixed(2)}</span></div>}
                            <div className="flex justify-between"><span>Shipping:</span> <span>₹{order.shipping.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>Tax (18%):</span> <span>₹{order.tax.toFixed(2)}</span></div>
                            <Separator className="my-2"/>
                            <div className="flex justify-between font-bold text-foreground text-base"><span>Total:</span> <span>₹{order.total.toFixed(2)}</span></div>
                        </CardContent>
                    </Card>
                </div>
            </div>
         </div>
    );
}
