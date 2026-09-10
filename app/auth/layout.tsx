import type { Metadata } from 'next';
import '../slate-ui.css';

export const metadata: Metadata = {
  title: 'כניסה לחשבון | Slate Sites',
  description: 'כניסה לחשבון Slate Sites כדי ליצור ולנהל את האתר של העסק שלך.',
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
