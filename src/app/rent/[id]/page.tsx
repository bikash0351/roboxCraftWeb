
"use client";

import { notFound, useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useEffect, Suspense, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { addDoc, collection, serverTimestamp, getDocs, query, where, doc, getDoc, orderBy, increment, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import type { Product } from "@/lib/data";
import { Label } from "@/components/ui/label";
import type { Coupon } from "@/app/admin/coupons/page";
import { Badge } from "@/components/ui/badge";

const rentCheckoutSchema = z.object({
    fullName: z.string().min(2, "Full name is required"),
    mobileNumber: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
    email: z.string().email("Invalid email address"),
    address: z.string().min(5, "Address is required"),
    city: z.string().min(2, "City is required"),
    postalCode: z.string().regex(/^\d{6}$/, "Invalid Pincode"),
    country: z.string().min(2, "Country is required"),
    rentalPlanId: z.string({ required_error: "You must select a rental plan." }),
});

interface RentalPlan {
    id: string;
    duration: number;
    feePercentage: number;
}

const rentalPolicy = [
    {
        emoji: "🧩",
        title: "1. Rental Duration & Refund Policy",
        points: [
            "The rental duration starts from the date of kit delivery.",
            "Refunds will be processed as per the following structure:",
        ],
        subPoints: [
            "🕐 7 Days Rental: 30% of kit price will be deducted; 70% refundable.",
            "🕓 10 Days Rental: 35% of kit price will be deducted; 65% refundable.",
            "🕕 15 Days Rental: 40% of kit price will be deducted; 60% refundable.",
        ],
        footer: "Refunds will be initiated only after the kit is returned in good condition and verified by our team."
    },
    {
        emoji: "⚙️",
        title: "2. Kit Usage & Condition",
        points: [
            "Customers are responsible for keeping the kit and all components in working condition.",
            "Any missing or damaged components will result in additional charges, deducted from the refundable amount.",
            "Do not modify or reprogram components beyond the provided tutorials or project guide.",
        ]
    },
    {
        emoji: "📦",
        title: "3. Kit Return Process",
        points: [
            "Kits must be returned with all accessories, including sensors, motors, boards, and cables.",
            "Returns must be made on or before the due date. Late returns may lead to an additional ₹100/day penalty.",
            "RoboXCraft reserves the right to inspect kits before processing any refund.",
        ]
    },
    {
        emoji: "💳",
        title: "4. Payment & Refund",
        points: [
            "Full kit price will be charged initially during rental checkout.",
            "The applicable refundable amount will be credited within 5–7 business days after successful return verification.",
            "Refunds will be processed via the same payment method used for purchase.",
        ]
    },
    {
        emoji: "🚫",
        title: "5. Damage & Misuse Policy",
        points: [
            "If the kit is found physically damaged, burnt, or tampered, the refund will be forfeited entirely.",
            "RoboXCraft reserves the right to deny future rentals in case of repeated misuse or negligence.",
        ]
    },
    {
        emoji: "📲",
        title: "6. Customer Responsibility",
        points: [
            "Handle kits with care and follow RoboXCraft tutorials or manuals for project execution.",
            "Ensure proper packaging while returning the kit to avoid transit damage.",
            "Keep a copy of the return confirmation for reference until your refund is processed.",
        ]
    },
    {
        emoji: "⚖️",
        title: "7. RoboXCraft Rights",
        points: [
            "RoboXCraft reserves the right to modify, suspend, or terminate the rental policy at any time without prior notice.",
            "In case of any disputes, RoboXCraft’s decision will be final and binding.",
        ]
    }
];


function RentCheckoutForm() {
    const params = useParams();
    const productId = params.id as string;
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [product, setProduct] = useState<Product | null>(null);
    const [rentalPlans, setRentalPlans] = useState<RentalPlan[]>([]);
    const [loadingProduct, setLoadingProduct] = useState(true);
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);

    const shippingCost = 100.00;

    const form = useForm<z.infer<typeof rentCheckoutSchema>>({
        resolver: zodResolver(rentCheckoutSchema),
        defaultValues: {
            fullName: "",
            mobileNumber: "",
            email: "",
            address: "",
            city: "",
            postalCode: "",
            country: "India",
        },
    });

    const selectedPlanId = form.watch("rentalPlanId");

    const { rentalFee, refundAmount, securityDeposit, taxAmount, totalAmount, discountAmount } = useMemo(() => {
        if (!product || !selectedPlanId) {
            return { rentalFee: 0, refundAmount: 0, securityDeposit: 0, taxAmount: 0, totalAmount: 0, discountAmount: 0 };
        }
        const plan = rentalPlans.find(p => p.id === selectedPlanId);
        if (!plan) {
            return { rentalFee: 0, refundAmount: 0, securityDeposit: 0, taxAmount: 0, totalAmount: 0, discountAmount: 0 };
        }

        const baseRentalFee = (product.price * plan.feePercentage) / 100;

        let finalDiscount = 0;
        if (appliedCoupon) {
            // Rentals only apply to kits
            if (appliedCoupon.categoryType === "Universal" || appliedCoupon.categoryType === "Kits") {
                if (appliedCoupon.discountType === 'percentage') {
                    finalDiscount = (baseRentalFee * appliedCoupon.discountValue) / 100;
                } else {
                    finalDiscount = appliedCoupon.discountValue;
                }
            }
        }
        finalDiscount = Math.min(finalDiscount, baseRentalFee);

        const securityDeposit = product.price;
        const finalRentalFee = baseRentalFee - finalDiscount;
        const refundAmount = securityDeposit - finalRentalFee;
        const taxAmount = finalRentalFee * 0.18;
        const totalAmount = securityDeposit + taxAmount + shippingCost;

        return { rentalFee: finalRentalFee, refundAmount, securityDeposit, taxAmount, totalAmount, discountAmount: finalDiscount };
    }, [product, selectedPlanId, rentalPlans, shippingCost, appliedCoupon]);

    useEffect(() => {
        const fetchProductAndPlans = async () => {
            if (!productId) return;
            setLoadingProduct(true);
            try {
                // Fetch Product
                const productQuery = query(collection(db, "products"), where("id", "==", productId));
                const productSnapshots = await getDocs(productQuery);

                if (productSnapshots.empty || productSnapshots.docs[0].data().category !== 'Kits') {
                    return notFound();
                }
                const productDoc = productSnapshots.docs[0];
                setProduct({ firestoreId: productDoc.id, ...productDoc.data() } as Product);

                // Fetch Rental Plans
                const plansQuery = query(collection(db, "rentalPlans"), orderBy("duration"));
                const plansSnapshot = await getDocs(plansQuery);
                const plansData = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RentalPlan));
                setRentalPlans(plansData);

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoadingProduct(false);
            }
        };
        fetchProductAndPlans();
    }, [productId]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace(`/login?redirect=/rent/${productId}`);
        }
    }, [user, authLoading, router, productId]);

    useEffect(() => {
        if (user) {
            form.reset({
                ...form.getValues(),
                fullName: user.displayName || "",
                email: user.email || "",
            });
        }
    }, [user, form]);

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setCouponLoading(true);
        try {
            const q = query(collection(db, "coupons"), where("code", "==", couponCode.toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast({ variant: "destructive", title: "Invalid Coupon Code" });
                return;
            }

            const couponDoc = querySnapshot.docs[0];
            const couponData = { firestoreId: couponDoc.id, ...couponDoc.data() } as Coupon;

            const now = new Date();
            const expiryDate = couponData.expiryDate?.toDate();

            if (couponData.status !== 'active') {
                toast({ variant: "destructive", title: "Coupon is not active" });
                return;
            }

            if (expiryDate && expiryDate < now) {
                toast({ variant: "destructive", title: "This coupon has expired" });
                return;
            }

            if (couponData.categoryType === 'Components') {
                toast({ variant: "destructive", title: "Invalid Coupon", description: "This coupon is not valid for kit rentals." });
                return;
            }

            setAppliedCoupon(couponData);
            toast({ title: "Coupon Applied!", description: `Discount of ${couponData.discountValue}${couponData.discountType === 'percentage' ? '%' : '₹'} applied.` });
        } catch (error) {
            toast({ variant: "destructive", title: "Error applying coupon" });
        } finally {
            setCouponLoading(false);
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode("");
        toast({ title: "Coupon removed" });
    }

    async function onSubmit(data: z.infer<typeof rentCheckoutSchema>) {
        if (!user || !product || !selectedPlanId) return;

        const plan = rentalPlans.find(p => p.id === selectedPlanId);
        if (!plan) return;

        try {
            const rentalOrderData = {
                userId: user.uid,
                productId: product.id,
                productName: product.name,
                ...data,
                rentalPlan: plan,
                securityDeposit: product.price,
                rentalFee,
                taxAmount,
                shippingCost,
                totalPaid: totalAmount,
                potentialRefund: refundAmount,
                status: 'rented',
                createdAt: serverTimestamp(),
                coupon: appliedCoupon?.code || null,
                discount: discountAmount,
            };

            await addDoc(collection(db, "rentals"), rentalOrderData);

            if (appliedCoupon) {
                const couponRef = doc(db, "coupons", appliedCoupon.firestoreId);
                await updateDoc(couponRef, {
                    usageCount: increment(1)
                });
            }

            toast({
                title: "Rental Order Placed!",
                description: "Your rental has been confirmed. We'll ship your kit shortly.",
            });
            router.push("/order-confirmation");

        } catch (error) {
            console.error("Error placing rental order:", error);
            toast({
                variant: "destructive",
                title: "Order Failed",
                description: "There was a problem placing your rental order. Please try again.",
            });
        }
    }

    if (authLoading || loadingProduct || !user || !product) {
        return (
            <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    const imageSrc = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : "https://placehold.co/64x64";

    return (
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="font-headline text-3xl font-bold tracking-tight">Rent Kit</h1>
            <p className="text-muted-foreground mt-1">You are renting: <span className="font-semibold text-foreground">{product.name}</span></p>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="md:col-span-2 space-y-8">
                        {/* Rental Plan Selection */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Choose Your Rental Plan</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="rentalPlanId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {rentalPlans.map(plan => (
                                                        <FormItem key={plan.id}>
                                                            <Label htmlFor={plan.id} className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 text-center hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                                                                <RadioGroupItem value={plan.id} id={plan.id} className="sr-only" />
                                                                <span className="text-xl font-bold">{plan.duration}</span>
                                                                <span className="font-normal mb-2 text-sm">Days</span>
                                                                <Separator />
                                                                <span className="mt-2 text-xs text-muted-foreground">Fee: {plan.feePercentage}%</span>
                                                            </Label>
                                                        </FormItem>
                                                    ))}
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage className="pt-2" />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                        {/* Shipping Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Shipping Information</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Your Name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="mobileNumber" render={({ field }) => (<FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input placeholder="10-digit mobile number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="email" render={({ field }) => (<FormItem className="sm:col-span-2"><FormLabel>Email Address</FormLabel><FormControl><Input placeholder="you@example.com" type="email" {...field} value={field.value ?? ''} readOnly /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="address" render={({ field }) => (<FormItem className="sm:col-span-2"><FormLabel>Address</FormLabel><FormControl><Input placeholder="Your Address" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="Your City" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="postalCode" render={({ field }) => (<FormItem><FormLabel>Pincode</FormLabel><FormControl><Input placeholder="Your Pincode" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField
                                    control={form.control}
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem className="sm:col-span-2">
                                            <FormLabel>Country</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value ?? ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                        {/* Rental Policy */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Rental Policy</CardTitle>
                                <CardDescription>Please read the terms and conditions carefully before renting.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 text-sm text-muted-foreground">
                                {rentalPolicy.map((section, index) => (
                                    <div key={index}>
                                        <h4 className="font-semibold text-base text-foreground mb-2">{section.emoji} {section.title}</h4>
                                        <div className="space-y-2 pl-2">
                                            {section.points?.map((point, pIndex) => <p key={pIndex}>{point}</p>)}
                                            {section.subPoints && (
                                                <ul className="space-y-1 pl-4">
                                                    {section.subPoints.map((subPoint, sIndex) => <li key={sIndex}>{subPoint}</li>)}
                                                </ul>
                                            )}
                                            {section.footer && <p className="pt-2">{section.footer}</p>}
                                        </div>
                                        {index < rentalPolicy.length - 1 && <Separator className="mt-6" />}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Order Summary */}
                    <div className="md:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Rental Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative h-16 w-16 flex-shrink-0 rounded-md bg-muted">
                                        <Image src={imageSrc} alt={product.name} fill className="object-cover" sizes="64px" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{product.name}</p>
                                        <p className="text-sm text-muted-foreground">Rental</p>
                                    </div>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    {!appliedCoupon ? (
                                        <div className="flex items-end gap-2">
                                            <div className="flex-grow">
                                                <Label htmlFor="coupon">Coupon Code</Label>
                                                <Input id="coupon" placeholder="Enter coupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} disabled={couponLoading} />
                                            </div>
                                            <Button type="button" onClick={handleApplyCoupon} disabled={!couponCode || couponLoading}>
                                                {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center text-sm">
                                            <p className="text-muted-foreground">Coupon Applied:</p>
                                            <Badge>
                                                {appliedCoupon.code}
                                                <button type="button" onClick={removeCoupon} className="ml-2 font-bold text-lg leading-none">&times;</button>
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Security Deposit</span>
                                        <span>₹{securityDeposit.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Rental Fee</span>
                                        <span>₹{rentalFee.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-green-600">
                                        <span>Discount</span>
                                        <span>- ₹{discountAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Tax on Fee (18%)</span>
                                        <span>₹{taxAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Shipping</span>
                                        <span>₹{shippingCost.toFixed(2)}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total Due Today</span>
                                        <span>₹{totalAmount.toFixed(2)}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between text-sm text-green-600 font-medium">
                                        <span>Potential Refund</span>
                                        <span>₹{refundAmount.toFixed(2)}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">The potential refund is the security deposit minus the final rental fee. It will be processed after the kit is returned in good condition.</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Button type="submit" className="w-full mt-6" size="lg" disabled={form.formState.isSubmitting || !selectedPlanId}>
                            {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {form.formState.isSubmitting ? "Placing Order..." : "Pay and Rent"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}

export default function RentPage() {
    return (
        <Suspense fallback={
            <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        }>
            <RentCheckoutForm />
        </Suspense>
    )
}

