
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";

export function AuthModal() {
  const { user, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Don't do anything until auth state is confirmed
    if (loading) {
      return;
    }

    // Don't show if user is logged in or if modal has already been shown this session
    if (user || sessionStorage.getItem("promoModalShown")) {
      return;
    }

    // Show the modal after a delay
    const timer = setTimeout(() => {
      setIsOpen(true);
      sessionStorage.setItem("promoModalShown", "true");
    }, 3000); // 3-second delay

    return () => clearTimeout(timer);
  }, [user, loading]);

  const handleSignUp = () => {
    setIsOpen(false);
    router.push("/signup");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="rounded-full bg-primary/10 p-4 text-primary">
            <Gift className="h-12 w-12" />
          </div>
          <DialogTitle className="font-headline text-2xl mt-4">Get 10% Off!</DialogTitle>
          <DialogDescription className="mt-2 text-base text-muted-foreground">
            Register on RoboXCraft right now and get an exclusive 10% discount on your first order.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-2">
          <Button size="lg" onClick={handleSignUp}>
            Sign Up Now
          </Button>
          <Button size="lg" variant="outline" onClick={() => setIsOpen(false)}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
