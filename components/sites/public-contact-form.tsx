'use client';

import { FormEvent, useRef, useState } from 'react';

export function PublicContactForm({ projectId, heading }: { projectId: string; heading: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const requestId = useRef<string | null>(null);
  const requestSignature = useRef('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true); setError(''); setSent(false);
    try {
      const signature = JSON.stringify(['name','email','phone','message'].map(key=>String(form.get(key)||'')));
      if(signature!==requestSignature.current){requestId.current=null;requestSignature.current=signature;}
      requestId.current ??= crypto.randomUUID();
      const response = await fetch(`/api/sites/${projectId}/contact`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requestId: requestId.current,
          name: String(form.get('name') || ''),
          email: String(form.get('email') || ''),
          phone: String(form.get('phone') || ''),
          message: String(form.get('message') || ''),
          website: String(form.get('website') || ''),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'לא הצלחנו לשלוח את הפנייה.');
      formElement.reset();
      requestId.current = null;
      setSent(true);
    } catch (contactError) {
      setError(contactError instanceof Error ? contactError.message : 'לא הצלחנו לשלוח את הפנייה.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="public-contact-form" onSubmit={submit} noValidate>
      <h2>{heading}</h2>
      <p>השאירו פרטים והעסק יחזור אליכם בהקדם.</p>
      <div className="public-contact-grid">
        <label>שם מלא<input name="name" autoComplete="name" required maxLength={100} /></label>
        <label>אימייל<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label>טלפון <span>(אופציונלי)</span><input name="phone" type="tel" autoComplete="tel" maxLength={40} /></label>
        <label className="public-contact-full">איך אפשר לעזור?<textarea name="message" required maxLength={2000} /></label>
        <label className="honeypot" aria-hidden="true">אתר<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {error ? <p className="public-form-error" role="alert">{error}</p> : null}
      {sent ? <p className="public-form-success" role="status">תודה, הפנייה נשמרה ונשלחה לתיבת הפניות של העסק.</p> : null}
      <button type="submit" disabled={busy}>{busy ? 'שולחים…' : 'שליחת פנייה'}</button>
    </form>
  );
}
