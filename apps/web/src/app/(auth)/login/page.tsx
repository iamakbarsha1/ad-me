'use client';

import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../../lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">ad-me</h1>
          <p className="mt-2 text-gray-600">Earn money from AI thinking time</p>
        </div>
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={async (response) => {
              if (response.credential) {
                try {
                  const user = await login(response.credential);
                  if (user.role === 'advertiser' || user.role === 'admin') {
                    router.push('/campaigns');
                  } else {
                    router.push('/earnings');
                  }
                } catch (err) {
                  console.error('Login failed:', err);
                }
              }
            }}
            onError={() => console.error('Google login failed')}
            theme="outline"
            size="large"
            width={320}
          />
        </div>
      </div>
    </main>
  );
}
