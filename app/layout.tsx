import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PDF Samler',
  description: 'Merge flere PDF-filer lokalt i browseren',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da">
      <body className="bg-slate-50 text-slate-900 min-h-screen">{children}</body>
    </html>
  );
}
