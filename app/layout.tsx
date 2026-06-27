import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import BottomNav from '@/components/BottomNav';

const display = Bebas_Neue({ subsets: ['latin'], variable: '--font-display', weight: '400' });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });
const score = JetBrains_Mono({ subsets: ['latin'], variable: '--font-score' });

export const metadata: Metadata = {
  title: "Ridwan's World Cup 2026",
  description: 'A personal FIFA World Cup 2026 companion — live scores, predictions, and your favorite teams.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#11301F',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${score.variable} font-body antialiased`}>
        <div className="mx-auto min-h-screen max-w-md pb-24">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
