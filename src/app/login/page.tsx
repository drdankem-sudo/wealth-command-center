// src/app/login/page.tsx
import { createClient } from '../../utils/supabase-server';
import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Invalid email or password.',
  email_not_confirmed: 'Please confirm your email first.',
  rate_limited: 'Too many attempts. Try again later.',
  auth_error: 'Authentication failed. Please try again.',
};

function getErrorCode(message: string): string {
  if (message.includes('Invalid login credentials')) return 'invalid_credentials';
  if (message.includes('Email not confirmed')) return 'email_not_confirmed';
  if (message.includes('rate limit')) return 'rate_limited';
  return 'auth_error';
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const errorCode = params?.error;
  const displayMessage = errorCode ? ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.auth_error : null;

  const signIn = async (formData: FormData) => {
    "use server";
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return redirect(`/login?error=${getErrorCode(error.message)}`);
    return redirect('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-500/10 p-4 rounded-full mb-4">
            <ShieldAlert className="w-10 h-10 text-indigo-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Vault Access Restricted</h1>
          <p className="text-slate-400 text-sm mt-2">Authorized personnel only</p>
        </div>

        <form className="flex flex-col gap-4">
          <input
            name="email"
            placeholder="Authorized Email"
            required
            autoComplete="email"
            className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-indigo-500 transition-colors"
          />
          <input
            type="password"
            name="password"
            placeholder="Secure Password"
            required
            autoComplete="current-password"
            className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-indigo-500 transition-colors"
          />

          <div className="flex flex-col gap-2 mt-4">
            <button formAction={signIn} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors">
              Authenticate & Enter
            </button>
          </div>

          {displayMessage && (
            <p className="mt-4 p-4 bg-red-500/10 text-red-400 text-center text-sm rounded-lg border border-red-500/20">
              {displayMessage}
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-slate-600 text-xs">
          Access is invite-only. Contact the vault administrator.
        </p>
      </div>
    </div>
  );
}
