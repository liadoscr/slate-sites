'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function GenerateSitePlanButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setIsGenerating(true);
    setError('');
    try {
      const response = await fetch(`/api/projects/${projectId}/generate`, { method: 'POST', credentials: 'same-origin' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'לא הצלחנו ליצור תוכנית כרגע.');
      router.refresh();
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'לא הצלחנו ליצור תוכנית כרגע.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="generate-plan-action">
      <button className="generate-plan-button" type="button" onClick={generate} disabled={isGenerating}>
        {isGenerating ? 'Gemini בונה את התוכנית…' : 'יצירת תוכנית אתר עם AI'}
      </button>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
    </div>
  );
}
