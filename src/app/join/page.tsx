'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import ModernFooter from '@/components/layout/ModernFooter';

export default function JoinPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  function extractCode(raw: string): string | null {
    const s = raw.trim();
    // A pasted share link
    const matchUrl = s.match(/\/s\/([A-Za-z0-9_-]+)/);
    if (matchUrl?.[1]) return matchUrl[1];

    // A typed code
    const matchCode = s.match(/^[A-Za-z0-9_-]{4,20}$/);
    if (matchCode) return s;

    return null;
  }

  function join(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const code = extractCode(input);
    if (!code) {
      setError('That does not look like a session code or a session link.');
      return;
    }
    router.push(`/s/${code}`);
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Navigation />

      <div className="flex-1 max-w-lg w-full mx-auto px-4 py-12 pt-28">
        <div className="flex flex-col gap-2 mb-8">
          <span className="label">Join</span>
          <h1 className="text-3xl sm:text-4xl">Enter your session</h1>
          <p className="text-ink-2 m-0">
            Type the code the organiser gave you, or paste the link they shared.
          </p>
        </div>

        <form onSubmit={join} className="card p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="session-code" className="label">
              Session code or link
            </label>
            <input
              id="session-code"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="JJ12VJC"
              className={`field num ${error ? 'field-bad' : ''}`}
              autoComplete="off"
              autoCapitalize="characters"
              aria-describedby={error ? 'session-code-error' : undefined}
            />
            {error && (
              <p id="session-code-error" className="text-sm text-danger m-0">
                {error}
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-primary">
            Continue
          </button>
        </form>
      </div>

      <ModernFooter />
    </main>
  );
}
