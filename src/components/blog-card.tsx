
"use client";

import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { BlogPost as BlogPostType } from "@/lib/data";

export type BlogPost = BlogPostType;

interface BlogCardProps {
  post: BlogPost;
}

export function BlogCard({ post }: BlogCardProps) {
  const postDate = post.createdAt?.toDate ? format(post.createdAt.toDate(), "MMMM d, yyyy") : "Date not available";

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lg">
       <Link href={`/blog/${post.slug}`} className="flex flex-col flex-1">
        <div className="relative aspect-video w-full">
            <Image
            src={post.featuredImage || "https://placehold.co/600x400"}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
        </div>
        <CardHeader>
            <CardTitle className="font-headline text-xl">{post.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
            <p className="text-muted-foreground line-clamp-3">{post.excerpt}</p>
        </CardContent>
        <CardFooter className="flex items-center gap-4">
            <Avatar>
                <AvatarImage src="/images/roboxcraft.png" alt="RoboXCraft" />
                <AvatarFallback>RXC</AvatarFallback>
            </Avatar>
            <div>
                <p className="font-semibold">RoboXCraft</p>
                <p className="text-sm text-muted-foreground">{postDate}</p>
            </div>
        </CardFooter>
      </Link>
    </Card>
  );
}
