import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Slate Sites — האתר של העסק שלך',
  description: 'אתר לעסק מתחיל בסיפור שלך. שומרים בריף והשראות, יוצרים תוכן בעזרת AI ומפרסמים דרך Slate Sites.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
