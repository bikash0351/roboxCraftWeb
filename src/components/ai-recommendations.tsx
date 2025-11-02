
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Bot, Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getProductRecommendationsAction } from "@/app/actions";
import type { Product, ProductRecommendation } from "@/lib/data";
import { ProductCard } from "./product-card";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  browsingHistory: z.string().min(10, {
    message: "Please describe your browsing history (at least 10 characters).",
  }),
  preferences: z.string().min(10, {
    message: "Please describe your preferences (at least 10 characters).",
  }),
});

export default function AiRecommendations() {
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      browsingHistory: "",
      preferences: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setRecommendations([]);

    const result = await getProductRecommendationsAction(
      values.browsingHistory,
      values.preferences
    );

    setIsLoading(false);

    if ("error" in result) {
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: result.error,
      });
    } else {
      setRecommendations(result.products);
    }
  }

  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Bot className="h-10 w-10 text-primary" />
          <div>
            <CardTitle className="font-headline text-3xl font-bold">AI Product Recommendations</CardTitle>
            <CardDescription>Tell us what you've been looking at and what you like, and we'll suggest products for you!</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <FormField
                control={form.control}
                name="browsingHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Browsing History</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., 'Looked at Arduino boards, servo motors, and distance sensors.'"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Preferences</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., 'Interested in building a line-following robot, prefer open-source hardware.'"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Get Recommendations
            </Button>
          </form>
        </Form>
        
        {isLoading && (
            <div className="mt-8 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-muted-foreground">Our AI is thinking...</p>
            </div>
        )}

        {recommendations.length > 0 && (
          <div className="mt-12">
            <h3 className="font-headline text-2xl font-bold">Here are your recommendations:</h3>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
              {recommendations.map((product, index) => (
                <ProductCard key={index} product={{
                  id: `rec-${index}`,
                  name: product.name,
                  price: product.price,
                  costPrice: product.originalPrice,
                  imageIds: ['ai-product'],
                  category: 'Recommendation',
                  stock: 1, // dummy value
                  description: product.description,
                  imageUrl: product.imageUrl,
                }} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

