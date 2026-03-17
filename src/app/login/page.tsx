// src/app/login/page.tsx
import { createClient } from '../../utils/supabase';
import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

// NEXT.JS 15/16 FIX: searchParams is now a Promise
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  
  // NEXT.JS 15/16 FIX: Unwrap the searchParams promise
  const params = await searchParams;
  const message = params?.message;

  // Server Action to handle the login
  const signIn = async (formData: FormData) => {
    "use server";
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    // 🚨 Passing the exact error message from Supabase to the UI
    if (error) return redirect(`/login?message=${error.message}`);
    return redirect('/');
  };

  // Server Action to handle creating your account for the first time
  const signUp = async (formData: FormData) => {
    "use server";
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    // 🚨 Passing the exact error message from Supabase to the UI
    if (error) return redirect(`/login?message=${error.message}`);
    
    // Since we disabled email confirmation, go straight to the vault!
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
          <p className="text-slate-400 text-sm mt-2">Enter credentials to command the wealth engine</p>
        </div>

        <form className="flex flex-col gap-4">
          <input
            name="email"
            placeholder="Authorized Email"
            required
            className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-indigo-500 transition-colors"
          />
          <input
            type="password"
            name="password"
            placeholder="Secure Password"
            required
            className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-indigo-500 transition-colors"
          />
          
          <div className="flex flex-col gap-2 mt-4">
            <button formAction={signIn} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors">
              Authenticate & Enter
            </button>
            <button formAction={signUp} className="bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium py-3 rounded-lg transition-colors">
              Initialize New Commander
            </button>
          </div>

          {message && (
            <p className="mt-4 p-4 bg-red-500/10 text-red-400 text-center text-sm rounded-lg border border-red-500/20">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}