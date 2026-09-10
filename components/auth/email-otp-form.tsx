'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';

type EmailOtpFormProps = {
  source: 'direct' | 'slate';
  nextPath: string;
};

type FormState = 'email' | 'sent';

export function EmailOtpForm({ source, nextPath }: EmailOtpFormProps) {
  const configured = useMemo(() => isSupabaseConfigured(), []);
  const [step, setStep] = useState<FormState>('email');
  const [email, setEmail] = useState('');
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
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('next', nextPath);
      callbackUrl.searchParams.set('source', source);
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
          data: { login_source: source },
          emailRedirectTo: callbackUrl.toString(),
        },
      });
      if (otpError) throw otpError;
      setEmail(normalizedEmail);
      setStep('sent');
      const localNotice = window.location.hostname === 'localhost'
        ? ' בבדיקה מקומית, פתחו את הקישור במחשב שבו פועל האתר — הטלפון לא יכול להגיע ל־localhost.'
        : '';
      setMessage(`שלחנו קישור כניסה אל ${maskedEmail || normalizedEmail}. פתחו אותו כדי להיכנס לחשבון.${localNotice}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'לא הצלחנו לשלוח קוד. נסו שוב בעוד רגע.');
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true); setError(''); setMessage('');
    try {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('next', nextPath);
      callbackUrl.searchParams.set('source', source);
      const { data, error: oauthError } = await createClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackUrl.toString(), skipBrowserRedirect: true },
      });
      if (oauthError || !data.url) throw oauthError ?? new Error('לא התקבלה כתובת להתחברות.');
      window.location.assign(data.url);
    } catch (oauthError) {
      setError(oauthError instanceof Error ? oauthError.message : 'לא הצלחנו להתחיל התחברות עם הספק שבחרתם.');
      setBusy(false);
    }
  }

  if (!configured) {
    return <p className="setup-notice">התחברות OTP תהיה זמינה לאחר חיבור משתני הסביבה של Supabase. הקוד והמסד כבר מוכנים לכך.</p>;
  }

  if (step === 'sent') {
    return (
      <div>
        {message ? <p className="success-message" role="status">{message}</p> : null}
        {error ? <p className="error-message" role="alert">{error}</p> : null}
        <button className="secondary-button" disabled={busy} type="button" onClick={() => { setStep('email'); setError(''); setMessage(''); }}>שליחת קישור חדש</button>
      </div>
    );
  }

  return (
    <form onSubmit={requestCode} noValidate>
      {source === 'direct' ? <>
        <div className="social-login-options">
          <button className="social-login-button" type="button" disabled={busy} onClick={signInWithGoogle}><span className="provider-mark google-mark" aria-hidden="true">G</span>המשך עם Google</button>
        </div>
        <div className="auth-divider" aria-hidden="true"><span>או עם מייל</span></div>
      </> : null}
      <label className="field" htmlFor="email">כתובת מייל
        <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@business.co.il" readOnly={source === 'slate' && Boolean(email)} />
        {source === 'slate' && maskedEmail ? <small>המייל שהתקבל מ־Slate: {maskedEmail}</small> : <small>נשלח קישור כניסה מאובטח למייל הזה בלבד.</small>}
      </label>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <button className="form-button" disabled={busy || (source === 'slate' && !email)} type="submit">{busy ? 'שולחים…' : 'שליחת קישור כניסה למייל'}</button>
      <p className="form-note">כבר יש לכם חשבון? השתמשו באותו מייל כדי לחזור לאתרים שלכם.</p>
    </form>
  );
}
