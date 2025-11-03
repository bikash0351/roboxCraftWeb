
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, LogOut, MapPin, Package, Loader2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AccountPage() {
    const { user, loading, signOut, updateUserProfilePicture } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login?redirect=/account');
        }
    }, [user, loading, router]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && user) {
            setUploading(true);
            try {
                await updateUserProfilePicture(file);
                toast({
                    title: "Profile Picture Updated",
                    description: "Your new avatar has been saved.",
                });
            } catch (error) {
                console.error("Error uploading profile picture:", error);
                toast({
                    variant: "destructive",
                    title: "Upload Failed",
                    description: "Could not update your profile picture. Please try again.",
                });
            } finally {
                setUploading(false);
            }
        }
    };


    if (loading || !user) {
        return (
            <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    const userImage = user.photoURL;
    const userInitial = user.displayName?.charAt(0) || user.email?.charAt(0) || "A";


    return (
        <div className="container mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-start md:text-left">
                <div className="relative group">
                    <Avatar className="h-24 w-24 cursor-pointer" onClick={handleAvatarClick}>
                        {userImage && <AvatarImage src={userImage} alt={user.displayName || "User"} />}
                        <AvatarFallback>{userInitial.toUpperCase()}</AvatarFallback>
                    </Avatar>
                     <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={handleAvatarClick}>
                        {uploading ? (
                            <Loader2 className="h-8 w-8 text-white animate-spin" />
                        ) : (
                            <Pencil className="h-8 w-8 text-white" />
                        )}
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange}
                        accept="image/png, image/jpeg"
                        className="hidden"
                        disabled={uploading}
                    />
                </div>
                <div>
                    <h1 className="font-headline text-3xl font-bold">{user.displayName || "User"}</h1>
                    <p className="text-muted-foreground">{user.email}</p>
                </div>
            </div>

            <Separator className="my-8" />

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Account Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Link href="/account/orders" className="flex w-full items-center justify-between rounded-lg p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground">
                        <div className="flex items-center gap-4">
                            <Package className="h-6 w-6" />
                            <span className="font-medium">My Orders</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                    <Separator />
                    <Link href="/account/addresses" className="flex w-full items-center justify-between rounded-lg p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground">
                        <div className="flex items-center gap-4">
                            <MapPin className="h-6 w-6" />
                            <span className="font-medium">My Addresses</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                    <Separator />
                    <button 
                        onClick={signOut}
                        className="flex w-full items-center justify-between rounded-lg p-4 text-left text-destructive transition-colors hover:bg-destructive/10">
                        <div className="flex items-center gap-4">
                            <LogOut className="h-6 w-6" />
                            <span className="font-medium">Logout</span>
                        </div>
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </CardContent>
            </Card>
        </div>
    );
}

    
