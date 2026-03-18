"use client";

import { createClient } from '../utils/supabase-client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh(); // Forces the proxy to run again and lock the door
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
    >
      <LogOut className="w-4 h-4" />
      <span>Sign Out</span>
    </button>
  );
}
