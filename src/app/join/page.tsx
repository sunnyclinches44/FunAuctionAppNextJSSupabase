'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function JoinPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  function extractCode(raw: string): string | null {
    const s = raw.trim();
    // If full URL with /s/{CODE}
    const matchUrl = s.match(/\/s\/([A-Za-z0-9_-]+)/);
    if (matchUrl?.[1]) return matchUrl[1];

    // If user typed just the code
    const matchCode = s.match(/^[A-Za-z0-9_-]{4,20}$/);
    if (matchCode) return s;

    return null;
  }

  function join(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const code = extractCode(input);
    if (!code) {
      setError('Enter a valid session code or a full link containing /s/{CODE}.');
      return;
    }
    router.push(`/s/${code}`);
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-3 text-center">Join an Existing Session</h1>
      <div className="card p-5 space-y-3">
        <form onSubmit={join} className="space-y-3">
          <label className="block text-sm text-slate-300">
            Paste the session link or enter the code:
          </label>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 84FRTMA or https://yourapp.com/s/84FRTMA"
            className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 outline-none"
          />
          {error && <div className="text-red-300 text-sm">{error}</div>}
          <button type="submit" className="btn btn-primary px-4 py-2 w-full">
            Continue
          </button>
        </form>
      </div>
    </main>
  );
}
