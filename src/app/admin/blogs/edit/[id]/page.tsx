
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BlogForm } from "@/components/blog-form";
import type { BlogPost } from "@/lib/data";
import { Loader2 } from "lucide-react";

export default function EditBlogPostPage() {
    const params = useParams();
    const id = params.id as string;
    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const fetchPost = async () => {
            setLoading(true);
            const docRef = doc(db, "blogs", id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setPost({ id: docSnap.id, ...docSnap.data() } as BlogPost);
            } else {
                // Handle post not found
                console.log("No such document!");
            }
            setLoading(false);
        };

        fetchPost();
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    if (!post) {
        return <div className="text-center">Blog post not found.</div>;
    }

    return <BlogForm existingPost={post} />;
}
