// src/components/SettingsPanel.tsx
"use client";

import { useState } from 'react';
import { inviteUser, changePassword, deleteUser } from '../app/settings/actions';
import { Shield, UserPlus, Key, Users, Trash2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface UserInfo {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

function StatusMessage({ status }: { status: { type: 'success' | 'error'; message: string } | null }) {
  if (!status) return null;
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm mt-3 ${
      status.type === 'success'
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'bg-red-500/10 text-red-400 border border-red-500/20'
    }`}>
      {status.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
      {status.message}
    </div>
  );
}

export default function SettingsPanel({ currentUserEmail, currentUserId, users }: {
  currentUserEmail: string;
  currentUserId: string;
  users: UserInfo[];
}) {
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [userList, setUserList] = useState<UserInfo[]>(users);

  return (
    <div className="space-y-8">

      {/* ─── CURRENT SESSION ─── */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-slate-100">Active Session</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Logged in as</span>
            <span className="text-slate-100 font-mono">{currentUserEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Auth level</span>
            <span className="text-emerald-400 font-medium">MFA Protected</span>
          </div>
        </div>
      </section>

      {/* ─── CHANGE PASSWORD ─── */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">Change Password</h2>
        </div>
        <form action={async (formData) => {
          const result = await changePassword(formData);
          if (result.success) {
            setPasswordStatus({ type: 'success', message: 'Password updated successfully.' });
          } else {
            setPasswordStatus({ type: 'error', message: result.error || 'Failed to update password.' });
          }
        }} className="space-y-3">
          <input
            type="password"
            name="newPassword"
            placeholder="New password (min 8 characters)"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg p-3 outline-none focus:border-amber-500 transition-colors"
          />
          <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
            Update Password
          </button>
          <StatusMessage status={passwordStatus} />
        </form>
      </section>

      {/* ─── INVITE USER ─── */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <UserPlus className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold text-slate-100">Invite New User</h2>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Create a new vault user. They will be able to sign in immediately with the credentials you set.
        </p>
        <form action={async (formData) => {
          const result = await inviteUser(formData);
          if (result.success) {
            setInviteStatus({ type: 'success', message: 'User created successfully. They can now sign in.' });
            // Add to local list
            setUserList(prev => [...prev, {
              id: 'new-' + Date.now(),
              email: formData.get('email') as string,
              created_at: new Date().toISOString(),
              last_sign_in_at: null,
            }]);
          } else {
            setInviteStatus({ type: 'error', message: result.error || 'Failed to create user.' });
          }
        }} className="space-y-3">
          <input
            type="email"
            name="email"
            placeholder="Email address"
            required
            autoComplete="off"
            className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors"
          />
          <input
            type="password"
            name="password"
            placeholder="Initial password (min 8 characters)"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors"
          />
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
            Create User
          </button>
          <StatusMessage status={inviteStatus} />
        </form>
      </section>

      {/* ─── USER MANAGEMENT ─── */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-slate-100">Vault Users</h2>
          <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-md ml-auto">
            {userList.length} users
          </span>
        </div>
        <div className="space-y-3">
          {userList.map(u => (
            <div key={u.id} className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3">
              <div>
                <p className="text-sm text-slate-100 font-mono">{u.email}</p>
                <p className="text-xs text-slate-500">
                  Joined {new Date(u.created_at).toLocaleDateString()}
                  {u.last_sign_in_at && ` · Last active ${new Date(u.last_sign_in_at).toLocaleDateString()}`}
                </p>
              </div>
              {u.id !== currentUserId ? (
                deleteConfirm === u.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Remove?
                    </span>
                    <form action={async (formData) => {
                      const result = await deleteUser(formData);
                      if (result.success) {
                        setUserList(prev => prev.filter(x => x.id !== u.id));
                      }
                      setDeleteConfirm(null);
                    }}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button type="submit" className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white px-2 py-1 rounded text-xs font-bold transition-colors">
                        YES
                      </button>
                    </form>
                    <button onClick={() => setDeleteConfirm(null)} className="bg-slate-800 text-slate-300 hover:bg-slate-700 px-2 py-1 rounded text-xs font-bold transition-colors">
                      NO
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(u.id)}
                    className="text-slate-500 hover:text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-all"
                    title="Remove user"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )
              ) : (
                <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">You</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── SECURITY INFO ─── */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold text-slate-100">Security Posture</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            { label: 'HTTPS Enforced', status: true },
            { label: 'MFA (TOTP)', status: true },
            { label: 'Row Level Security', status: true },
            { label: 'CSRF Protection', status: true },
            { label: 'Security Headers', status: true },
            { label: 'Input Validation (Zod)', status: true },
            { label: 'Invite-Only Access', status: true },
            { label: 'Cron Auth (Bearer)', status: true },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${item.status ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-slate-300">{item.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
