
'use client';
import './globals.css';
import { cn } from '@/lib/utils';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CartProvider } from '@/components/cart-provider';
import { Toaster } from '@/components/ui/toaster';
import { usePathname } from 'next/navigation';
import { ContentFooter } from '@/components/content-footer';
import { AuthProvider } from '@/components/auth-provider';
import { AuthModal } from '@/components/auth-modal';
import { ThemeProvider } from '@/components/theme-provider';
import { WishlistProvider } from '@/components/wishlist-provider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isReelsPage = pathname === '/reels';
  const isAdminPage = pathname.startsWith('/admin');

  if (isAdminPage) {
    return <>{children}</>;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn(
          'font-body antialiased',
          !isReelsPage && 'pb-16 md:pb-0'
        )}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <div className="relative flex min-h-dvh flex-col bg-background">
                  <SiteHeader />
                  <main className={cn(
                    "flex-1",
                    !isReelsPage && "pt-20" 
                  )}>
                    {children}
                  </main>
                  {!isReelsPage && <ContentFooter />}
                  <SiteFooter />
                </div>
                <Toaster />
                <AuthModal />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
