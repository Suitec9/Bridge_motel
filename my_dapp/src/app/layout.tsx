import './globals.css';
import { Inter } from 'next/font/google';
import '@rainbow-me/rainbowkit/styles.css';
import { ClientProviders } from '@/providers/ClientProviders';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning={true}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}