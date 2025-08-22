'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Navigation from '@/components/Navigation';
import ModernFooter from '@/components/ModernFooter';

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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-amber-400/10 to-orange-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-br from-blue-400/10 to-cyan-500/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-green-400/5 to-emerald-500/5 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-xl mx-auto px-6 py-8 pt-24">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-200 mb-4">
            Join an
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Auction Session
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-md mx-auto">
            Enter the session code or paste the full link to join an existing auction
          </p>
        </div>

        <div className="card p-6 space-y-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
          <form onSubmit={join} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2 font-medium">
                Session link or code:
              </label>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. 84FRTMA or https://yourapp.com/s/84FRTMA"
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 outline-none text-slate-200 placeholder-slate-500 focus:border-blue-400/50 transition-colors"
              />
            </div>
            
            {error && (
              <div className="text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            
            <button type="submit" className="btn btn-primary px-6 py-3 w-full text-lg font-semibold">
              🚀 Continue to Session
            </button>
          </form>
        </div>
      </div>
      <ModernFooter />
    </main>
  );
}
