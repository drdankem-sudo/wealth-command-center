// src/components/LogoutButton.tsx
import { createClient } from '../utils/supabase';
import { redirect } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  
  // The Server Action that shreds the auth cookie
  const handleSignOut = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  };

  return (
    <form action={handleSignOut}>
      <button 
        type="submit" 
        className="flex items-center gap-2 text-slate-400 hover:text-red-400 bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 px-4 py-2 rounded-lg transition-all text-sm font-medium"
      >
        <LogOut className="w-4 h-4" />
        Disconnect
      </button>
    </form>
  );
}