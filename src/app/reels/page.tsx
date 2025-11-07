
"use client";

import { ReelPlayer } from "@/components/reel-player";
import { type Reel as ReelType } from "@/lib/data";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ReelsPage() {
  const [reels, setReels] = useState<ReelType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReels = async () => {
      try {
        const reelsQuery = query(collection(db, "reels"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(reelsQuery);
        const reelsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as ReelType));
        setReels(reelsData);
      } catch (error) {
        console.error("Error fetching reels:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReels();
  }, []);

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="h-dvh flex items-center justify-center bg-black text-white">
        <p>No reels to show right now. Check back later!</p>
      </div>
    );
  }

  return (
    <div className="h-dvh snap-y snap-mandatory overflow-y-auto bg-black">
      {reels.map((reel) => (
        <div key={reel.id} className="h-full w-full flex-shrink-0 snap-start relative flex items-center justify-center">
          <ReelPlayer reel={reel} />
        </div>
      ))}
    </div>
  );
}
