import type { Metadata } from 'next';
import { AdminGate } from '@/components/admin-gate';
import { ConvexClientProvider } from '@/components/convex-provider';
import '@excalidraw/excalidraw/index.css';
import './globals.css';

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
      <body>
        <ConvexClientProvider>
          <AdminGate>{children}</AdminGate>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
