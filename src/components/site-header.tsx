
"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Input } from "./ui/input";
import React from "react";


export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/reels") {
    return null;
  }
  
  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const searchQuery = formData.get('search') as string;
    if(searchQuery) {
        router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  }

  return (
    <header className="fixed top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-20 max-w-7xl items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/roboxcraft.png"
            alt="Roboxcraft Logo"
            className="h-10 w-10 text-primary object-contain"
          />
        </Link>
        <div className="flex-1">
          <form onSubmit={handleSearch} className="relative w-full">
            <Input
              type="search"
              name="search"
              placeholder="Search for products"
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          </form>
        </div>
      </div>
    </header>
  );
}
