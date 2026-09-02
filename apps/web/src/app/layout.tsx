import type { Metadata } from 'next';
import { Archivo } from 'next/font/google';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'psepho — verify your vote',
  description: 'Create a poll in ten seconds, share a link, and get a result the people who voted can verify.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={archivo.variable}>
      <body className="min-h-screen bg-paper text-ink font-body selection:bg-patina selection:text-surface">
        {children}
      </body>
    </html>
  );
}
