

"use client";

import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useForm, FormProvider, useFormContext, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Product } from "@/lib/data";
import { Loader2, PlusCircle, MoreHorizontal, Edit, Trash2, GripVertical, Check, ChevronsUpDown, X } from "lucide-react";
import Image from "next/image";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";


interface Tag {
  id: string;
  name: string;
}

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Name must be at least 3 characters long"),
  category: z.enum(["Kits", "Components"]),
  price: z.coerce.number().positive("Price must be a positive number"),
  costPrice: z.coerce.number().optional(),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
  stock: z.coerce.number().min(0, "Stock can't be negative"),
  imageUrls: z.array(z.string()).default([]),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  kitContents: z.string().optional(),
});

type ProductWithId = Product & { firestoreId: string };

// --- Image Management Component ---
function ImageManager() {
    const { getValues, setValue } = useFormContext<z.infer<typeof productSchema>>();
    const { admin } = useAdminAuth();
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>(getValues('imageUrls') || []);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    // Drag and Drop state
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const newFiles = Array.from(event.target.files);
            setImageFiles(prev => [...prev, ...newFiles]);
            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }
    };
    
    const handleUpload = async () => {
        if (!admin) {
             toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to upload images." });
             return;
        }
        if (imageFiles.length === 0) return;
        setIsUploading(true);

        const uploadPromises = imageFiles.map(file => {
            const storageRef = ref(storage, `products/${Date.now()}-${file.name}`);
            return uploadBytes(storageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
        });

        try {
            const urls = await Promise.all(uploadPromises);
            const currentUrls = getValues('imageUrls') || [];
            const newUrls = [...currentUrls, ...urls];
            setValue('imageUrls', newUrls, { shouldDirty: true });
            setImagePreviews(newUrls);
            setImageFiles([]); // Clear selected files
            toast({ title: "Images uploaded successfully" });
        } catch (error) {
            console.error("Error uploading images: ", error);
            toast({ variant: "destructive", title: "Upload Failed", description: "Please check your storage rules and network." });
        } finally {
            setIsUploading(false);
        }
    };
    
    const removeImage = (index: number) => {
        const currentUrls = getValues('imageUrls') || [];
        const newUrls = currentUrls.filter((_, i) => i !== index);
        setValue('imageUrls', newUrls, { shouldDirty: true });
        setImagePreviews(newUrls);
    };

    // Drag and Drop handlers
    const onDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const onDragEnter = (index: number) => {
        if (draggedIndex === null || draggedIndex === index) return;
        
        const currentUrls = [...imagePreviews];
        const draggedItem = currentUrls.splice(draggedIndex, 1)[0];
        currentUrls.splice(index, 0, draggedItem);
        
        setDraggedIndex(index);
        setImagePreviews(currentUrls);
        setValue('imageUrls', currentUrls, { shouldDirty: true });
    };

    const onDragEnd = () => {
        setDraggedIndex(null);
    };


    return (
        <FormItem>
            <FormLabel>Product Images</FormLabel>
            <FormDescription>Drag and drop to reorder images. The first image is the main one.</FormDescription>
            <div className="space-y-4">
                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {imagePreviews.map((url, index) => (
                        <div 
                            key={index} 
                            className="relative aspect-square group"
                            draggable
                            onDragStart={() => onDragStart(index)}
                            onDragEnter={() => onDragEnter(index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDragEnd={onDragEnd}
                        >
                            <Image src={url} alt={`Product image ${index + 1}`} fill className="object-cover rounded-md" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                                <Button type="button" variant="destructive" size="icon" className="h-8 w-8" onClick={() => removeImage(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <GripVertical className="absolute top-1 right-1 h-5 w-5 text-white/50 cursor-grab" />
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="flex items-center gap-2">
                    <FormControl>
                        <Input type="file" accept="image/*" multiple onChange={handleFileChange} />
                    </FormControl>
                    <Button type="button" onClick={handleUpload} disabled={imageFiles.length === 0 || isUploading}>
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
                    </Button>
                </div>
                <FormMessage />
            </div>
        </FormItem>
    );
}


function ProductFormFields() {
    const { control, setValue, watch, getValues } = useFormContext<z.infer<typeof productSchema>>();
    const costPrice = watch('costPrice');
    const price = watch('price');
    const discountPercentage = watch('discountPercentage');
    const category = watch('category');
    const [allTags, setAllTags] = useState<Tag[]>([]);
    
    useEffect(() => {
        const fetchTags = async () => {
            const tagsQuery = query(collection(db, "productTags"), orderBy("name"));
            const querySnapshot = await getDocs(tagsQuery);
            setAllTags(querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
        };
        fetchTags();
    }, []);


    useEffect(() => {
        const cost = Number(costPrice) || 0;
        const currentPrice = Number(price) || 0;
        const discount = Number(discountPercentage) || 0;

        if (cost > 0) {
            if (discount > 0) {
                 const newPrice = cost * (1 - discount / 100);
                 if (Math.abs(newPrice - currentPrice) > 0.01) {
                    setValue('price', Number(newPrice.toFixed(2)));
                 }
            } 
            else if (currentPrice < cost) {
                const newDiscount = ((cost - currentPrice) / cost) * 100;
                if (Math.abs(newDiscount - discount) > 0.01) {
                    setValue('discountPercentage', Number(newDiscount.toFixed(2)));
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

            {category === 'Kits' && (
                <FormField
                    control={control}
                    name="kitContents"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>What's Included (for Kits)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="List each component on a new line. e.g.,&#10;1x Arduino Uno R3&#10;1x USB Cable&#10;20x Jumper Wires" {...field} value={field.value ?? ''}/>
                            </FormControl>
                             <FormDescription>
                                Each item on a new line will be shown as a list on the product page.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}

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
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn("w-full justify-between h-auto", !field.value?.length && "text-muted-foreground")}
                                    >
                                        <div className="flex gap-1 flex-wrap">
                                            {field.value?.map((tag) => (
                                                <Badge
                                                    variant="secondary"
                                                    key={tag}
                                                    className="mr-1 mb-1"
                                                    onClick={() => {
                                                        const newValue = field.value?.filter((t) => t !== tag) || [];
                                                        field.onChange(newValue);
                                                    }}
                                                >
                                                    {tag}
                                                    <X className="ml-1 h-3 w-3" />
                                                </Badge>
                                            ))}
                                            {field.value?.length === 0 && "Select tags..."}
                                        </div>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search tags..." />
                                    <CommandList>
                                        <CommandEmpty>No tags found.</CommandEmpty>
                                        <CommandGroup>
                                            {allTags.map((tag) => (
                                                <CommandItem
                                                    value={tag.name}
                                                    key={tag.id}
                                                    onSelect={() => {
                                                        const currentValue = field.value || [];
                                                        const isSelected = currentValue.includes(tag.name);
                                                        if (isSelected) {
                                                            field.onChange(currentValue.filter((t) => t !== tag.name));
                                                        } else {
                                                            field.onChange([...currentValue, tag.name]);
                                                        }
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            field.value?.includes(tag.name) ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {tag.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <FormDescription>Select tags that apply to this product.</FormDescription>
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
            imageUrls: [],
            shortDescription: "",
            description: "",
            tags: [],
            kitContents: "",
        },
    });

     const { kits, components } = useMemo(() => {
        const kits: ProductWithId[] = [];
        const components: ProductWithId[] = [];
        products.forEach(product => {
            if (product.category === 'Kits') {
                kits.push(product);
            } else if (product.category === 'Components') {
                components.push(product);
            }
        });
        return { kits, components };
    }, [products]);
     
    const fetchProducts = useCallback(async () => {
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
    }, [toast]);

    useEffect(() => {
        if (!adminLoading && !admin) {
            router.replace('/admin/login');
        } else if (admin) {
            fetchProducts();
        }
    }, [admin, adminLoading, router, fetchProducts]);

    const handleDialogOpen = (product: ProductWithId | null = null) => {
        setSelectedProduct(product);
        if (product) {
            form.reset({
                ...product,
                costPrice: product.costPrice || undefined,
                discountPercentage: product.discountPercentage || undefined,
                tags: product.tags || [],
                kitContents: Array.isArray(product.kitContents) ? product.kitContents.join('\n') : '',
                imageUrls: product.imageUrls || [],
            });
        } else {
            form.reset({
                name: "",
                category: "Kits",
                price: 0,
                costPrice: undefined,
                discountPercentage: undefined,
                stock: 0,
                imageUrls: [],
                shortDescription: "",
                description: "",
                tags: [],
                kitContents: "",
            });
        }
        setDialogOpen(true);
    };

    const handleDeleteAlertOpen = (product: ProductWithId) => {
        setSelectedProduct(product);
        setDeleteAlertOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof productSchema>) => {
        try {
            const kitContentsArray = values.kitContents ? values.kitContents.split('\n').map(item => item.trim()).filter(item => item) : [];
            
            const productData = { 
                ...values, 
                kitContents: values.category === 'Kits' ? kitContentsArray : [],
             };

            if (selectedProduct) {
                const productRef = doc(db, "products", selectedProduct.firestoreId);
                await updateDoc(productRef, productData);
                toast({ title: "Product Updated", description: `${values.name} has been updated.` });
            } else {
                await addDoc(collection(db, "products"), {
                    ...productData,
                    id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                });
                toast({ title: "Product Added", description: `${values.name} has been added.` });
            }
            fetchProducts();
            setDialogOpen(false);
        } catch (error) {
            console.error("Error saving product: ", error);
            toast({ variant: "destructive", title: "Save Failed", description: "Could not save product to the database." });
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

    const ProductTable = ({ products, title }: { products: ProductWithId[], title: string }) => (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>Manage your {title.toLowerCase()}. View, edit, or delete them.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="hidden w-[100px] sm:table-cell">Image</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.length > 0 ? products.map(product => {
                            const hasDiscount = product.costPrice && product.costPrice > product.price;
                            const imageSrc = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : "https://placehold.co/64x64";

                            return (
                            <TableRow key={product.firestoreId}>
                                <TableCell className="hidden sm:table-cell">
                                    <Image
                                        alt={product.name}
                                        className="aspect-square rounded-md object-cover"
                                        height="64"
                                        src={imageSrc}
                                        width="64"
                                    />
                                </TableCell>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                
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
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No products found. Add your first product!
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
    
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
                        <FormProvider {...form}>
                            <form id="product-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                               <ProductFormFields />
                                <ImageManager />
                            </form>
                        </FormProvider>
                        <DialogFooter>
                             <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" form="product-form" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {selectedProduct ? 'Save Changes' : 'Create Product'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
             <Tabs defaultValue="kits" className="w-full">
                <TabsList>
                    <TabsTrigger value="kits">Kits ({kits.length})</TabsTrigger>
                    <TabsTrigger value="components">Components ({components.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="kits">
                    <ProductTable products={kits} title="Kits" />
                </TabsContent>
                <TabsContent value="components">
                    <ProductTable products={components} title="Components" />
                </TabsContent>
            </Tabs>
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
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}



    

    