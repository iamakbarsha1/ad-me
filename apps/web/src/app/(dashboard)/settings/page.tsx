'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ad-me-auth');
      if (stored) {
        const parsed = JSON.parse(stored) as { accessToken?: string };
        setToken(parsed.accessToken ?? '');
      }
    } catch {}
  }, []);

  const copyToken = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-2 text-gray-600">Payout settings and preferences</p>
      </div>

      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">VS Code Extension Token</h2>
        <p className="text-sm text-gray-600">
          Copy this token and paste it when the extension prompts you to sign in.
        </p>
        {token ? (
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded bg-gray-100 px-3 py-2 text-xs font-mono truncate">
              {token.slice(0, 30)}...
            </code>
            <button
              onClick={copyToken}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              {copied ? 'Copied!' : 'Copy Token'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-red-500">Not signed in</p>
        )}
        <p className="text-xs text-gray-400">
          In VS Code: Cmd+Shift+P → &quot;ad-me: Sign In&quot; → paste token
        </p>
      </div>
    </div>
  );
}
