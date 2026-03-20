// src/app/settings/page.tsx
import { createClient } from '../../utils/supabase-server';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import SettingsPanel from '../../components/SettingsPanel';
import { listUsers } from './actions';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const { users } = await listUsers();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8">
      <header className="mb-8 flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back to Dashboard</span>
        </Link>
      </header>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Vault Settings</h1>
        <p className="text-slate-400 mb-8">Security, access control, and preferences</p>

        <SettingsPanel currentUserEmail={user.email || ''} currentUserId={user.id} users={users || []} />
      </div>
    </div>
  );
}
