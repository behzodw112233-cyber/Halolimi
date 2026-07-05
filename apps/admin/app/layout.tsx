import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ConvexClientProvider } from '@/components/convex-provider';
import { BackgroundRipple } from '@/components/ui/background-ripple';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'Halolmi — Admin panel',
  description: 'Halolmi animal marketplace admin dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <body className={inter.className}>
        <ConvexClientProvider>
          <div className="relative flex h-screen overflow-hidden bg-neutral-50">
            <BackgroundRipple />
            <div className="relative z-10 flex min-w-0 flex-1">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
              </div>
            </div>
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
