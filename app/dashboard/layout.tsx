import type { Metadata } from 'next';
import '../slate-ui.css';

export const metadata: Metadata = {
  title: 'האתרים שלי | Slate Sites',
  description: 'הבריפים, התוכן והאתרים שלך בסביבת העבודה של Slate Sites.',
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
