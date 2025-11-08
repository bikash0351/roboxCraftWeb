
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Reel } from "@/lib/data";
import { Heart, MessageCircle, Send, Loader2, Play, Pause, X } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Facebook, Twitter } from "lucide-react";
import { collection, doc, updateDoc, increment, addDoc, getDocs, serverTimestamp, orderBy, query, type Timestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";

const ReelVideo = ({ reel, isVisible }: { reel: Reel, isVisible: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isVisible) {
            // Autoplay when visible
            video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        } else {
            // Pause and reset when not visible
            video.pause();
            video.currentTime = 0;
            setIsPlaying(false);
        }
    }, [isVisible]);

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play();
            setIsPlaying(true);
        } else {
            video.pause();
            setIsPlaying(false);
        }
    };
    
    return (
        <div className="absolute inset-0 bg-black flex items-center justify-center" onClick={togglePlay}>
            {reel.thumbnailUrl && (
                <Image
                    src={reel.thumbnailUrl}
                    alt={`${reel.description} thumbnail`}
                    fill
                    className={cn(
                        "object-cover transition-opacity duration-500",
                        isVideoLoaded ? "opacity-0" : "opacity-100"
                    )}
                    style={{ filter: 'blur(10px)' }}
                />
            )}
             
            {(isBuffering || !isVisible) && !isVideoLoaded && (
                 <div className="absolute inset-0 flex items-center justify-center z-20">
                    <Loader2 className="h-10 w-10 text-white/50 animate-spin" />
                </div>
            )}

            <video
                ref={videoRef}
                src={reel.videoUrl}
                loop
                playsInline
                className={cn(
                    "w-full h-full object-contain z-10 transition-opacity duration-500",
                    isVideoLoaded ? "opacity-100" : "opacity-0"
                )}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedData={() => {
                    setIsVideoLoaded(true);
                    setIsBuffering(false);
                }}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
            />

             {!isPlaying && isVideoLoaded && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20">
                    <Play className="h-20 w-20 text-white/70" fill="currentColor"/>
                </div>
            )}
        </div>
    );
};


interface ReelPlayerProps {
    reel: Reel;
}

interface Comment {
    id: string;
    username: string;
    userImage: string;
    text: string;
    createdAt: Timestamp;
}

const ShareSheet = ({ url, onShare }: { url: string, onShare: () => void }) => {
    const shareText = "Check out this awesome reel!";
    return (
      <SheetContent side="bottom" className="rounded-t-lg">
        <SheetHeader>
          <SheetTitle className="text-center">Share this Reel</SheetTitle>
        </SheetHeader>
        <div className="py-8 grid grid-cols-3 gap-4">
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" onClick={onShare} className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center"><Facebook className="h-8 w-8" /></div>
                <span>Facebook</span>
            </a>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" onClick={onShare} className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary">
                 <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center"><svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg></div>
                 <span>X (Twitter)</span>
            </a>
             <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + url)}`} target="_blank" rel="noopener noreferrer" onClick={onShare} className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary">
                 <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center"><MessageCircle className="h-8 w-8" /></div>
                 <span>WhatsApp</span>
            </a>
        </div>
      </SheetContent>
    );
};

const CommentsSheet = ({ reel, onCommentsUpdate }: { reel: Reel, onCommentsUpdate: (count: number) => void }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loadingComments, setLoadingComments] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchComments = useCallback(async () => {
        setLoadingComments(true);
        try {
            const commentsQuery = query(collection(db, `reels/${reel.id}/comments`), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(commentsQuery);
            const commentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
            setComments(commentsData);

            if (commentsData.length !== reel.comments) {
                const reelRef = doc(db, 'reels', reel.id);
                await updateDoc(reelRef, { comments: commentsData.length });
                onCommentsUpdate(commentsData.length);
            }
        } catch (error) {
            console.error("Error fetching comments:", error);
        } finally {
            setLoadingComments(false);
        }
    }, [reel.id, reel.comments, onCommentsUpdate]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);
    
    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const reelRef = doc(db, "reels", reel.id);
            const newCommentRef = doc(collection(db, `reels/${reel.id}/comments`));

            const commentData = {
                username: user.displayName || 'Anonymous',
                userImage: user.photoURL || '',
                text: newComment,
                createdAt: serverTimestamp()
            };

            batch.set(newCommentRef, commentData);
            batch.update(reelRef, { comments: increment(1) });
            
            await batch.commit();

            const updatedComments = [{ ...commentData, id: newCommentRef.id, createdAt: new Date() } as any, ...comments];
            setComments(updatedComments);
            onCommentsUpdate(updatedComments.length);
            setNewComment("");
        } catch (error) {
            console.error("Error posting comment:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SheetContent side="bottom" className="rounded-t-lg h-[80dvh] flex flex-col">
            <SheetHeader className="text-center">
                <SheetTitle>{comments.length} Comments</SheetTitle>
            </SheetHeader>
            <Separator className="my-2" />
            <ScrollArea className="flex-1 -mx-6 px-6">
                {loadingComments ? (
                    <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : comments.length === 0 ? (
                    <div className="flex justify-center items-center h-full text-muted-foreground">Be the first to comment!</div>
                ) : (
                    <div className="space-y-4 py-4">
                        {comments.map(comment => (
                            <div key={comment.id} className="flex gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={comment.userImage} alt={comment.username} />
                                    <AvatarFallback>{comment.username.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">{comment.username} • {comment.createdAt?.toDate().toLocaleDateString()}</p>
                                    <p className="text-sm">{comment.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
            <Separator />
            <SheetFooter className="py-2">
                <form onSubmit={handlePostComment} className="w-full flex items-center gap-2">
                     <Avatar className="h-8 w-8">
                        {user?.photoURL && <AvatarImage src={user.photoURL} />}
                        <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <Input 
                        placeholder="Add a comment..." 
                        className="flex-1" 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={!user || isSubmitting}
                    />
                    <Button type="submit" disabled={!newComment.trim() || isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Post'}
                    </Button>
                </form>
            </SheetFooter>
        </SheetContent>
    )
}

export function ReelPlayer({ reel }: ReelPlayerProps) {
    const [likes, setLikes] = useState(reel.likes);
    const [comments, setComments] = useState(reel.comments);
    const [shares, setShares] = useState(reel.shares);
    const [isLiked, setIsLiked] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    
    const [pageUrl, setPageUrl] = useState('');

    useEffect(() => {
        setPageUrl(window.location.origin + '/reels#' + reel.id);
    }, [reel.id]);

    const handleInteraction = useCallback(async (field: "likes" | "shares", value: number = 1) => {
        try {
            const reelRef = doc(db, "reels", reel.id);
            await updateDoc(reelRef, { [field]: increment(value) });
        } catch (error) {
            console.error(`Failed to update ${field}`, error);
        }
    }, [reel.id]);

    const handleLike = () => {
        const newValue = isLiked ? -1 : 1;
        handleInteraction("likes", newValue);
        setLikes(prev => prev + newValue);
        setIsLiked(prev => !prev);
    };

    const handleCommentsUpdate = useCallback((newCount: number) => {
        setComments(newCount);
    }, []);

    const handleShare = useCallback(() => {
        handleInteraction("shares");
        setShares(prev => prev + 1);
    }, [handleInteraction]);


    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            { threshold: 0.5 } // 50% of the element must be visible
        );

        const currentRef = containerRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, []);


    return (
        <div ref={containerRef} className="relative h-full w-full max-w-md mx-auto aspect-[9/16]">
            <ReelVideo reel={reel} isVisible={isVisible} />
            
            <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-20 md:pb-4 text-white bg-gradient-to-t from-black/60 to-transparent">
                <div className="flex items-end gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-10 w-10 border-2 border-white">
                                <AvatarImage src={reel.uploaderImage} alt={reel.uploaderName} />
                                <AvatarFallback>{reel.uploaderName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-bold">{reel.uploaderName}</span>
                        </div>
                        <p className="mt-2 text-sm">{reel.description}</p>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={handleLike} className="h-12 w-12 flex-col gap-1 text-white hover:bg-white/10 hover:text-white">
                            <Heart className={cn("h-7 w-7", isLiked && "fill-red-500 text-red-500")} />
                            <span className="text-xs">{likes}</span>
                        </Button>
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-12 w-12 flex-col gap-1 text-white hover:bg-white/10 hover:text-white">
                                    <MessageCircle className="h-7 w-7" />
                                    <span className="text-xs">{comments}</span>
                                </Button>
                            </SheetTrigger>
                            <CommentsSheet reel={reel} onCommentsUpdate={handleCommentsUpdate} />
                        </Sheet>
                         <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-12 w-12 flex-col gap-1 text-white hover:bg-white/10 hover:text-white">
                                    <Send className="h-7 w-7" />
                                    <span className="text-xs">{shares}</span>
                                </Button>
                            </SheetTrigger>
                            <ShareSheet url={pageUrl} onShare={handleShare} />
                        </Sheet>
                    </div>
                </div>
            </div>
        </div>
    );
}

    
