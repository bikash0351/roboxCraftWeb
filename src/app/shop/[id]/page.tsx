

"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useState, use } from "react";
import { ArrowRight, Star, Loader2, Share2, Twitter, Facebook, MessageCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { type Product } from "@/lib/data";
import { PlaceHolderImages as placeholderImages } from "@/lib/placeholder-images";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProductCard } from "@/components/product-card";
import { AddToCartButton } from "./add-to-cart-button";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, limit, or } from "firebase/firestore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";


function ShareButtons() {
    const [pageUrl, setPageUrl] = useState('');

    useEffect(() => {
        setPageUrl(window.location.href);
    }, []);

    const shareText = "Check out this awesome product!";

    return (
        <div className="flex gap-2">
             <Button asChild variant="outline" size="icon">
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`} target="_blank" rel="noopener noreferrer">
                    <Facebook className="h-5 w-5" />
                </a>
            </Button>
            <Button asChild variant="outline" size="icon">
                <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                </a>
            </Button>
            <Button asChild variant="outline" size="icon">
                <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + pageUrl)}`} target="_blank" rel="noopener noreferrer">
                   <MessageCircle className="h-5 w-5" />
                </a>
            </Button>
        </div>
    )
}


export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const productQuery = query(collection(db, "products"), where("id", "==", id), limit(1));
        const productSnapshots = await getDocs(productQuery);
        
        if (!productSnapshots.empty) {
          const productDoc = productSnapshots.docs[0];
          const productData = { firestoreId: productDoc.id, ...productDoc.data() } as Product;
          setProduct(productData);

          // Fetch similar products based on tags
          if (productData.tags && productData.tags.length > 0) {
            const similarQuery = query(
              collection(db, "products"),
              where("tags", "array-contains-any", productData.tags),
              where("id", "!=", productData.id),
              limit(4)
            );
            const similarSnap = await getDocs(similarQuery);
            const similarData = similarSnap.docs.map(doc => ({ ...doc.data(), id: doc.data().id || doc.id } as Product));
            setSimilarProducts(similarData);
          }

        } else {
          notFound();
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        notFound();
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);


  if (loading) {
    return (
      <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return notFound();
  }
  
  const productImages = product.imageIds
    ?.map((id) => placeholderImages.find((p) => p.id === id))
    .filter(Boolean);

  const selectedImage = productImages?.[selectedImageIndex];
  const hasDiscount = product.costPrice && product.costPrice > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(((product.costPrice - product.price) / product.costPrice) * 100)
    : 0;

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column - Image Gallery */}
        <div>
          <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted">
            {selectedImage && (
              <Image
                src={product.imageUrl || selectedImage.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                data-ai-hint={selectedImage.imageHint}
                priority
              />
            )}
             {!selectedImage && product.imageUrl && (
                <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            )}
             {!selectedImage && !product.imageUrl && (
                <Image
                src={"https://placehold.co/600x600"}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            )}
            {hasDiscount && (
              <Badge
                variant="destructive"
                className="absolute top-3 left-3 rounded-full h-12 w-12 flex items-center justify-center text-lg font-bold bg-primary text-primary-foreground border-2 border-background"
              >
                -{discountPercentage}%
              </Badge>
            )}
          </div>
          {productImages && productImages.length > 1 && (
            <div className="mt-4 grid grid-cols-5 gap-2">
              {productImages.map((image, index) => (
                image && (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className={cn(
                      "relative aspect-square w-full rounded-md overflow-hidden transition-all",
                      index === selectedImageIndex
                        ? "ring-2 ring-primary ring-offset-2"
                        : "opacity-70 hover:opacity-100"
                    )}
                  >
                    <Image
                      src={image.imageUrl}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="20vw"
                      data-ai-hint={image.imageHint}
                    />
                  </button>
                )
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Product Details */}
        <div className="flex flex-col">
          <h1 className="font-headline text-3xl md:text-4xl font-bold">{product.name}</h1>
          
           {product.shortDescription && <p className="mt-2 text-muted-foreground text-lg">{product.shortDescription}</p>}
          
          <div className="mt-4 flex items-center gap-2">
            <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-5 w-5 ${i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                ))}
            </div>
            <span className="text-sm text-muted-foreground">(123 reviews)</span>
          </div>
          
          <div className="mt-4 flex items-baseline gap-2">
            {hasDiscount && (
              <span className="text-xl text-muted-foreground line-through">
                ₹{product.costPrice?.toFixed(2)}
              </span>
            )}
            <span className="text-3xl font-bold text-foreground">
              ₹{product.price.toFixed(2)}
            </span>
          </div>

          <Separator className="my-6" />

          <div className="flex flex-col sm:flex-row gap-4">
            <AddToCartButton product={product} />
            <Button size="lg" className="w-full sm:w-auto">Buy Now</Button>
          </div>
           
           <div className="mt-6 flex items-center gap-4">
                <Popover>
                    <PopoverTrigger asChild>
                         <Button variant="outline" className="w-full sm:w-auto">
                            <Share2 className="mr-2 h-4 w-4" /> Share
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto">
                        <ShareButtons />
                    </PopoverContent>
                </Popover>
           </div>
        </div>
      </div>

      {/* Full Description & Reviews */}
       <div className="mt-16">
        <Tabs defaultValue="description" className="w-full">
            <TabsList>
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="py-6">
                 <div className="prose prose-sm max-w-none text-muted-foreground">
                    {product.description ? <p>{product.description}</p> : <p>No full description available for this product.</p>}
                </div>
            </TabsContent>
            <TabsContent value="reviews" className="py-6">
                <h3 className="text-xl font-bold font-headline mb-4">Customer Reviews</h3>
                <div className="space-y-6">
                    {/* Placeholder Review 1 */}
                    <div className="border-b pb-4">
                        <div className="flex items-center mb-2">
                           <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                ))}
                            </div>
                            <p className="ml-4 font-semibold">Great Kit!</p>
                        </div>
                        <p className="text-muted-foreground">This was the perfect starter kit for my son. He loved it!</p>
                        <p className="text-xs text-muted-foreground mt-2">By John D. on July 24, 2024</p>
                    </div>
                    {/* Placeholder Review 2 */}
                    <div className="border-b pb-4">
                         <div className="flex items-center mb-2">
                           <div className="flex items-center">
                                {[...Array(4)].map((_, i) => (
                                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                ))}
                                 <Star className="h-5 w-5 text-gray-300" />
                            </div>
                            <p className="ml-4 font-semibold">Good value</p>
                        </div>
                        <p className="text-muted-foreground">Had some trouble with one of the sensors, but customer support was helpful. Overall, a good product for the price.</p>
                         <p className="text-xs text-muted-foreground mt-2">By Jane S. on July 22, 2024</p>
                    </div>
                </div>
            </TabsContent>
        </Tabs>
      </div>

      {similarProducts.length > 0 && (
        <div className="mt-16">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-3xl font-bold tracking-tight">Similar Products</h2>
            <Button variant="link" asChild>
              <Link href="/shop">View All <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {similarProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

    
}
