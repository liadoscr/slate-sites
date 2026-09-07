'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';

type EmailOtpFormProps = {
  source: 'direct' | 'slate';
  nextPath: string;
};

type FormState = 'email' | 'code';

export function EmailOtpForm({ source, nextPath }: EmailOtpFormProps) {
  const router = useRouter();
  const configured = useMemo(() => isSupabaseConfigured(), []);
  const [step, setStep] = useState<FormState>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (source !== 'slate' || !configured) return;
    let active = true;
    fetch('/api/auth/slate-email', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('לא מצאנו העברה פעילה מ־Slate. אפשר להיכנס עם מייל באופן רגיל.');
        return response.json() as Promise<{ email: string; maskedEmail: string }>;
      })
      .then((data) => {
        if (!active) return;
        setEmail(data.email);
        setMaskedEmail(data.maskedEmail);
      })
      .catch((fetchError: Error) => active && setError(fetchError.message));
    return () => { active = false; };
  }, [configured, source]);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('הזינו כתובת מייל תקינה.');
      return;
    }

    setBusy(true); setError(''); setMessage('');
    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true, data: { login_source: source } },
      });
      if (otpError) throw otpError;
      setEmail(normalizedEmail);
      setStep('code');
      setMessage(`שלחנו קוד בן 6 ספרות אל ${maskedEmail || normalizedEmail}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'לא הצלחנו לשלוח קוד. נסו שוב בעוד רגע.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = code.replace(/\D/g, '');
    if (token.length !== 6) {
      setError('הקוד צריך לכלול 6 ספרות.');
      return;
    }

    setBusy(true); setError(''); setMessage('');
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      if (verifyError) throw verifyError;

      const endpoint = source === 'slate' ? '/api/auth/complete-slate' : '/api/auth/log-direct-login';
      await fetch(endpoint, { method: 'POST', credentials: 'same-origin' });
      router.replace(nextPath);
      router.refresh();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'לא הצלחנו לאמת את הקוד.');
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return <p className="setup-notice">התחברות OTP תהיה זמינה לאחר חיבור משתני הסביבה של Supabase. הקוד והמסד כבר מוכנים לכך.</p>;
  }

  if (step === 'code') {
    return (
      <form onSubmit={verifyCode} noValidate>
        <label className="field" htmlFor="otp-code">קוד חד־פעמי
          <input id="otp-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} placeholder="000000" autoFocus />
          <small>הקוד תקף לזמן מוגבל וניתן לשימוש פעם אחת.</small>
        </label>
        {message ? <p className="success-message" role="status">{message}</p> : null}
        {error ? <p className="error-message" role="alert">{error}</p> : null}
        <button className="form-button" disabled={busy} type="submit">{busy ? 'מאמתים…' : 'אימות וכניסה לחשבון'}</button>
        <button className="secondary-button" disabled={busy} type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }}>שליחת קוד חדש</button>
      </form>
    );
  }

  return (
    <form onSubmit={requestCode} noValidate>
      <label className="field" htmlFor="email">כתובת מייל
        <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@business.co.il" readOnly={source === 'slate' && Boolean(email)} />
        {source === 'slate' && maskedEmail ? <small>המייל שהתקבל מ־Slate: {maskedEmail}</small> : <small>נשלח קוד אימות למייל הזה בלבד.</small>}
      </label>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <button className="form-button" disabled={busy || (source === 'slate' && !email)} type="submit">{busy ? 'שולחים…' : 'שליחת קוד למייל'}</button>
      <p className="form-note">המשך הפעולה יוצר או מחבר חשבון Slate Sites נפרד לפי המייל המאומת שלך.</p>
    </form>
  );
}
