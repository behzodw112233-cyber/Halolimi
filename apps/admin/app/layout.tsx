import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AdminGate } from '@/components/admin-gate';
import { ConvexClientProvider } from '@/components/convex-provider';
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
          <AdminGate>{children}</AdminGate>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
