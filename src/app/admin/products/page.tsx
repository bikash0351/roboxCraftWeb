

"use client";

import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Product } from "@/lib/data";
import { Loader2, PlusCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Textarea } from "@/components/ui/textarea";

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Name must be at least 3 characters long"),
  category: z.enum(["Kits", "Components"]),
  price: z.coerce.number().positive("Price must be a positive number"),
  costPrice: z.coerce.number().optional(),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
  stock: z.coerce.number().min(0, "Stock can't be negative"),
  imageUrl: z.string().optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
});

type ProductWithId = Product & { firestoreId: string };

function ProductFormFields() {
    const { control, setValue, watch } = useFormContext<z.infer<typeof productSchema>>();
    const costPrice = watch('costPrice');
    const price = watch('price');
    const discountPercentage = watch('discountPercentage');

    useEffect(() => {
        const cost = Number(costPrice) || 0;
        const currentPrice = Number(price) || 0;
        const discount = Number(discountPercentage) || 0;

        const priceChanged = currentPrice !== price;
        const costPriceChanged = cost !== costPrice;
        const discountChanged = discount !== discountPercentage;

        if (cost > 0) {
            // If discount is changed, calculate price
            if (discountChanged) {
                 const newPrice = cost * (1 - discount / 100);
                 if (Math.abs(newPrice - currentPrice) > 0.01) {
                    setValue('price', Number(newPrice.toFixed(2)));
                 }
            } 
            // If price is changed, calculate discount
            else if (priceChanged) {
                if (currentPrice < cost) {
                    const newDiscount = ((cost - currentPrice) / cost) * 100;
                    if (Math.abs(newDiscount - discount) > 0.01) {
                        setValue('discountPercentage', Number(newDiscount.toFixed(2)));
                    }
                } else {
                     setValue('discountPercentage', 0);
                }
            }
        }
    }, [price, costPrice, discountPercentage, setValue]);

    return (
        <>
            <FormField
                control={control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Arduino Uno R3" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="shortDescription"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Short Description</FormLabel>
                        <FormControl>
                            <Textarea placeholder="A brief summary for the product page." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Full Description</FormLabel>
                        <FormControl>
                            <Textarea placeholder="The complete product description for the details tab." {...field} rows={6}/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="category"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Kits">Kits</SelectItem>
                        <SelectItem value="Components">Components</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                    control={control}
                    name="costPrice"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cost Price (₹)</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" placeholder="e.g., 59.99" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={control}
                    name="discountPercentage"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Discount (%)</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" placeholder="e.g., 10" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Selling Price (₹)</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" placeholder="e.g., 39.99" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <FormField
                control={control}
                name="stock"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Stock Quantity</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 100" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="tags"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., arduino, beginner, robotics" {...field} />
                        </FormControl>
                            <FormDescription>
                            Comma-separated tags for product discovery.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </>
    )
}

export default function AdminProductsPage() {
    const { admin, loading: adminLoading } = useAdminAuth();
    const router = useRouter();
    const [products, setProducts] = useState<ProductWithId[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<ProductWithId | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof productSchema>>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: "",
            category: "Kits",
            price: 0,
            costPrice: undefined,
            discountPercentage: undefined,
            stock: 0,
            imageUrl: "",
            shortDescription: "",
            description: "",
            tags: "",
        },
    });
     
    const fetchProducts = async () => {
        setDataLoading(true);
        try {
            const productsQuery = query(collection(db, "products"), orderBy("name"));
            const querySnapshot = await getDocs(productsQuery);
            const productsData = querySnapshot.docs.map(doc => ({ 
                firestoreId: doc.id,
                ...doc.data() 
            } as ProductWithId));
            setProducts(productsData);
        } catch (error) {
            console.error("Error fetching products:", error);
            toast({ variant: "destructive", title: "Failed to fetch products" });
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (!adminLoading && !admin) {
            router.replace('/admin/login');
        } else if (admin) {
            fetchProducts();
        }
    }, [admin, adminLoading, router]);

    const handleDialogOpen = (product: ProductWithId | null = null) => {
        setSelectedProduct(product);
        setImageFile(null);
        if (product) {
            form.reset({
                ...product,
                costPrice: product.costPrice || undefined,
                tags: product.tags?.join(', ') || '',
            });
        } else {
            form.reset({
                name: "",
                category: "Kits",
                price: 0,
                costPrice: undefined,
                discountPercentage: undefined,
                stock: 0,
                imageUrl: "",
                shortDescription: "",
                description: "",
                tags: "",
            });
        }
        setDialogOpen(true);
    };

    const handleDeleteAlertOpen = (product: ProductWithId) => {
        setSelectedProduct(product);
        setDeleteAlertOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof productSchema>) => {
        setIsUploading(true);
        let imageUrl = selectedProduct?.imageUrl || '';

        try {
            if (imageFile) {
                const storageRef = ref(storage, `products/${Date.now()}-${imageFile.name}`);
                await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(storageRef);
            }

            const tagsArray = values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
            
            // Exclude discountPercentage from the data saved to Firestore
            const { discountPercentage, ...productDataToSave } = values;
            
            const productData = { 
                ...productDataToSave, 
                imageUrl,
                tags: tagsArray,
             };

            if (selectedProduct) {
                const productRef = doc(db, "products", selectedProduct.firestoreId);
                await updateDoc(productRef, productData);
                toast({ title: "Product Updated", description: `${values.name} has been updated.` });
            } else {
                await addDoc(collection(db, "products"), {
                    ...productData,
                    id: `prod-${Date.now()}`,
                    imageIds: productData.imageUrl ? [] : ['ai-product'],
                });
                toast({ title: "Product Added", description: `${values.name} has been added.` });
            }
            fetchProducts();
            setDialogOpen(false);
        } catch (error) {
            console.error("Error saving product: ", error);
            toast({ variant: "destructive", title: "Save Failed", description: "Could not save product to the database." });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedProduct) return;
        try {
            await deleteDoc(doc(db, "products", selectedProduct.firestoreId));
            toast({ title: "Product Deleted", description: `${selectedProduct.name} has been deleted.` });
            fetchProducts();
            setDeleteAlertOpen(false);
        } catch (error) {
            console.error("Error deleting product: ", error);
            toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete product." });
        }
    };

    const isLoading = adminLoading || dataLoading;

    if (isLoading || !admin) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Products</h1>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleDialogOpen()}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{selectedProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                            <DialogDescription>
                                {selectedProduct ? 'Update the details of your product.' : 'Fill in the details for the new product.'}
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form id="product-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                               <ProductFormFields />
                                <FormItem>
                                    <FormLabel>Product Image</FormLabel>
                                    <FormControl>
                                        <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                                    </FormControl>
                                        <FormDescription>
                                        Upload a new image. If none is chosen, a default image will be used.
                                    </FormDescription>
                                </FormItem>
                            </form>
                        </Form>
                        <DialogFooter>
                             <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" form="product-form" disabled={form.formState.isSubmitting || isUploading}>
                                {(form.formState.isSubmitting || isUploading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {selectedProduct ? 'Save Changes' : 'Create Product'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>All Products</CardTitle>
                    <CardDescription>Manage your products here. View, edit, or delete them.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="hidden w-[100px] sm:table-cell">Image</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.length > 0 ? products.map(product => {
                                const productImage = PlaceHolderImages.find(p => p.id === (product.imageIds && product.imageIds[0] || 'ai-product'));
                                const hasDiscount = product.costPrice && product.costPrice > product.price;

                                return (
                                <TableRow key={product.firestoreId}>
                                    <TableCell className="hidden sm:table-cell">
                                        <Image
                                            alt={product.name}
                                            className="aspect-square rounded-md object-cover"
                                            height="64"
                                            src={product.imageUrl || productImage?.imageUrl || "https://placehold.co/64x64"}
                                            width="64"
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{product.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>₹{product.price.toFixed(2)}</span>
                                            {hasDiscount && <span className="text-xs text-muted-foreground line-through">₹{product.costPrice?.toFixed(2)}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>{product.stock}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleDialogOpen(product)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteAlertOpen(product)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )}) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No products found. Add your first product!
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the product
                            &quot;{selectedProduct?.name}&quot;.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

    