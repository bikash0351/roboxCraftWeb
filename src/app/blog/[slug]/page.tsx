
"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { type BlogPost } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";

export default function BlogPostPage() {
    const params = useParams();
    const slug = params.slug as string;
    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) return;

        const fetchPost = async () => {
            setLoading(true);
            try {
                const postsQuery = query(collection(db, "blogs"), where("slug", "==", slug), limit(1));
                const querySnapshot = await getDocs(postsQuery);

                if (querySnapshot.empty) {
                    notFound();
                } else {
                    const doc = querySnapshot.docs[0];
                    setPost({ id: doc.id, ...doc.data() } as BlogPost);
                }
            } catch (error) {
                console.error("Error fetching post:", error);
                notFound();
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [slug]);

    if (loading) {
        return (
            <div className="container mx-auto flex h-[80vh] flex-col items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!post) {
        return notFound();
    }
    
    const postDate = post.createdAt?.toDate ? format(post.createdAt.toDate(), "MMMM d, yyyy") : "Date not available";

    return (
        <article className="container mx-auto max-w-3xl py-12 px-4 sm:px-6 lg:px-8">
            <header className="text-center mb-8">
                <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight">
                    {post.title}
                </h1>
                <div className="mt-4 flex justify-center items-center gap-4 text-muted-foreground">
                     <Avatar>
                        <AvatarImage src="/images/roboxcraft.png" alt="RoboXCraft" />
                        <AvatarFallback>RXC</AvatarFallback>
                    </Avatar>
                     <div>
                        <span>By RoboXCraft</span>
                        <span className="mx-2">•</span>
                        <span>{postDate}</span>
                    </div>
                </div>
            </header>

            {post.featuredImage && (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-8 shadow-lg">
                    <Image
                        src={post.featuredImage}
                        alt={post.title}
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
            )}
            
            <div
                className="prose prose-lg dark:prose-invert max-w-none mx-auto"
                dangerouslySetInnerHTML={{ __html: post.content }}
            />
        </article>
    );
}
