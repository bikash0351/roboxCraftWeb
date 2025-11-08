
"use client";

import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { updatePassword } from "firebase/auth";

const accountSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});


export default function AdminAccountPage() {
    const { admin, loading, isSuperAdmin, firebaseUser } = useAdminAuth();
    const router = useRouter();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof accountSchema>>({
        resolver: zodResolver(accountSchema),
        defaultValues: {
            username: "",
            password: "",
            confirmPassword: "",
        },
    });
    
    useEffect(() => {
        if (!loading && admin) {
            form.reset({
                username: isSuperAdmin ? "roboxcraft" : firebaseUser?.email || "",
                password: "",
                confirmPassword: "",
            });
        }
    }, [admin, loading, form, isSuperAdmin, firebaseUser]);


    useEffect(() => {
        if (!loading && !admin) {
            router.replace('/admin/login');
        }
    }, [admin, loading, router]);


    async function onSubmit(values: z.infer<typeof accountSchema>) {
        if (isSuperAdmin) {
            toast({
                variant: "destructive",
                title: "Update Not Allowed",
                description: "The superuser account cannot be modified from this panel.",
            });
            return;
        }

        if (!firebaseUser) {
             toast({ variant: "destructive", title: "Error", description: "No authenticated user found." });
             return;
        }

        if (values.password) {
            try {
                await updatePassword(firebaseUser, values.password);
                toast({
                    title: "Password Updated",
                    description: "Your password has been successfully changed.",
                });
                 form.reset({
                    ...form.getValues(),
                    password: "",
                    confirmPassword: "",
                });
            } catch (error: any) {
                console.error("Error updating password:", error);
                 toast({
                    variant: "destructive",
                    title: "Update Failed",
                    description: "Could not update password. You may need to re-authenticate.",
                });
            }
        } else {
            toast({
                title: "No Changes",
                description: "No new password was entered.",
            });
        }
    }

    if (loading || !admin) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="flex w-full flex-col">
             <Card>
                <CardHeader>
                    <CardTitle>Update Credentials</CardTitle>
                    <CardDescription>
                         {isSuperAdmin 
                            ? "The superuser account credentials cannot be changed here." 
                            : "Change your admin password here."
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-md">
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                <Input placeholder="roboxcraft" {...field} readOnly />
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
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                <Input type="password" placeholder="Leave blank to keep current" {...field} disabled={isSuperAdmin} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirm New Password</FormLabel>
                                <FormControl>
                                <Input type="password" placeholder="Confirm new password" {...field} disabled={isSuperAdmin} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={form.formState.isSubmitting || isSuperAdmin}>
                            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Account
                        </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
