import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Slate Sites — אתר שמתחיל בבריף טוב',
  description: 'Slate Sites הופכת את הסיפור, ההשראה והחומרים של העסק לאתר עסקי מוכן להשקה.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
