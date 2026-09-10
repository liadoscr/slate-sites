import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ORANGE.GEL — סטודיו לק ג׳ל ברמת גן',
  description: 'מניקור ג׳ל מדויק, בנייה אנטומית ונייל ארט עדין בסטודיו אינטימי ברמת גן.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
