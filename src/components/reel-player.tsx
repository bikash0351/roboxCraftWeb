
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Reel } from "@/lib/data";
import { Heart, MessageCircle, Send, Loader2, Play, Pause } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Facebook, Twitter } from "lucide-react";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";

const ReelVideo = ({ reel, isVisible }: { reel: Reel, isVisible: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isVisible) {
            video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        } else {
            video.pause();
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
            {isLoading && (
                 <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Loader2 className="h-10 w-10 text-white/50 animate-spin" />
                </div>
            )}
            <video
                ref={videoRef}
                src={reel.videoUrl}
                loop
                playsInline
                className="w-full h-full object-contain"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onCanPlay={() => setIsLoading(false)}
            />
             {!isPlaying && !isLoading && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="h-20 w-20 text-white/70" fill="currentColor"/>
                </div>
            )}
        </div>
    );
};


interface ReelPlayerProps {
    reel: Reel;
}

const ShareButtons = ({ url }: { url: string }) => {
    const shareText = "Check out this awesome reel!";
    return (
      <div className="flex gap-2">
        <Button asChild variant="outline" size="icon">
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Facebook className="h-5 w-5" />
          </a>
        </Button>
        <Button asChild variant="outline" size="icon">
          <a
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
          </a>
        </Button>
        <Button asChild variant="outline" size="icon">
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + url)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="h-5 w-5" />
          </a>
        </Button>
      </div>
    );
};


export function ReelPlayer({ reel }: ReelPlayerProps) {
    const [likes, setLikes] = useState(reel.likes);
    const [comments, setComments] = useState(reel.comments);
    const [shares, setShares] = useState(reel.shares);
    const [isLiked, setIsLiked] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    
    const [pageUrl, setPageUrl] = useState('');

    useEffect(() => {
        setPageUrl(window.location.origin + '/reels');
    }, []);

    const handleInteraction = async (field: "likes" | "comments" | "shares") => {
        const reelRef = doc(db, "reels", reel.id);
        await updateDoc(reelRef, { [field]: increment(1) });
    };

    const handleLike = () => {
        handleInteraction("likes");
        setLikes(prev => isLiked ? prev - 1 : prev + 1);
        setIsLiked(prev => !prev);
    };

    const handleComment = () => {
        handleInteraction("comments");
        setComments(prev => prev + 1);
    };

    const handleShare = () => {
        handleInteraction("shares");
        setShares(prev => prev + 1);
    };

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
            
            <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-20 md:pb-4 text-white bg-gradient-to-t from-black/60 to-transparent">
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
                        <Button variant="ghost" size="icon" onClick={handleComment} className="h-12 w-12 flex-col gap-1 text-white hover:bg-white/10 hover:text-white">
                            <MessageCircle className="h-7 w-7" />
                            <span className="text-xs">{comments}</span>
                        </Button>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={handleShare} className="h-12 w-12 flex-col gap-1 text-white hover:bg-white/10 hover:text-white">
                                    <Send className="h-7 w-7" />
                                    <span className="text-xs">{shares}</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2 bg-background/80 border-slate-700">
                                <ShareButtons url={pageUrl} />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>
        </div>
    );
}
