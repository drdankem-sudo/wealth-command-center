// src/components/LiabilityLedger.tsx
"use client";

import { useState } from 'react';
import { deleteLiability, updateLiability } from '../app/liability-actions';
import { Trash2, Edit2, X, Check, AlertTriangle } from 'lucide-react';

interface Liability {
  id: string;
  name: string;
  liability_type: string;
  balance: number;
  interest_rate: number;
  monthly_payment: number;
}

function LiabilityRow({ liability }: { liability: Liability }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [editBalance, setEditBalance] = useState(liability.balance || 0);
  const [editPayment, setEditPayment] = useState(liability.monthly_payment || 0);

  const annualInterest = Number(liability.balance || 0) * Number(liability.interest_rate || 0) / 100;
  const monthsToPayoff = liability.monthly_payment > 0 && liability.balance > 0
    ? Math.ceil(liability.balance / (liability.monthly_payment - annualInterest / 12))
    : null;
  const payoffDate = monthsToPayoff && monthsToPayoff > 0 && monthsToPayoff < 600
    ? new Date(Date.now() + monthsToPayoff * 30.44 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  return (
    <tr className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
      <td className="p-4 font-medium text-slate-100">{liability.name}</td>

      <td className="p-4 text-sm text-slate-400 hidden sm:table-cell">
        <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded text-xs font-medium">
          {liability.liability_type}
        </span>
      </td>

      <td className="p-4 font-medium text-red-400">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <span>$</span>
            <input
              type="number"
              value={editBalance}
              onChange={(e) => setEditBalance(Number(e.target.value))}
              className="w-32 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 outline-none focus:border-red-500"
            />
          </div>
        ) : (
          `$${Number(liability.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        )}
      </td>

      <td className="p-4 text-sm text-slate-400 hidden sm:table-cell">
        {liability.interest_rate ? `${liability.interest_rate}%` : "-"}
      </td>

      <td className="p-4 text-sm text-slate-400 hidden lg:table-cell">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <span>$</span>
            <input
              type="number"
              value={editPayment}
              onChange={(e) => setEditPayment(Number(e.target.value))}
              className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 outline-none focus:border-red-500"
            />
          </div>
        ) : (
          liability.monthly_payment ? `$${Number(liability.monthly_payment).toLocaleString('en-US', { minimumFractionDigits: 0 })}/mo` : "-"
        )}
      </td>

      <td className="p-4 text-sm hidden lg:table-cell">
        {annualInterest > 0 ? (
          <span className="text-red-400">-${annualInterest.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/yr</span>
        ) : "-"}
      </td>

      <td className="p-4 text-sm text-slate-400 hidden lg:table-cell">
        {payoffDate ? (
          <span className="text-amber-400">{payoffDate}</span>
        ) : (
          <span className="text-slate-600">-</span>
        )}
      </td>

      <td className="p-4 text-right">
        {isConfirmingDelete ? (
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-red-400 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Sure?</span>
            <form action={async (formData) => { await deleteLiability(formData); }}>
              <input type="hidden" name="id" value={liability.id} />
              <button type="submit" className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white px-2 py-1 rounded transition-colors text-xs font-bold">
                YES
              </button>
            </form>
            <button onClick={() => setIsConfirmingDelete(false)} className="bg-slate-800 text-slate-300 hover:bg-slate-700 px-2 py-1 rounded transition-colors text-xs font-bold">
              NO
            </button>
          </div>
        ) : isEditing ? (
          <div className="flex items-center justify-end gap-2">
            <form action={async (formData) => {
              await updateLiability(formData);
              setIsEditing(false);
            }}>
              <input type="hidden" name="id" value={liability.id} />
              <input type="hidden" name="balance" value={editBalance} />
              <input type="hidden" name="monthlyPayment" value={editPayment} />
              <button type="submit" className="text-emerald-500 hover:bg-emerald-500/20 p-2 rounded-lg transition-all" title="Save Changes">
                <Check className="w-4 h-4" />
              </button>
            </form>
            <button onClick={() => {
              setIsEditing(false);
              setEditBalance(liability.balance);
              setEditPayment(liability.monthly_payment);
            }} className="text-slate-500 hover:bg-slate-800 p-2 rounded-lg transition-all" title="Cancel">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => setIsEditing(true)} className="text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 p-2 rounded-lg transition-all" title="Edit">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => setIsConfirmingDelete(true)} className="text-slate-500 hover:text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-all" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function LiabilityLedger({ liabilities }: { liabilities: Liability[] }) {
  if (liabilities.length === 0) return null;

  const grouped = liabilities.reduce((groups, l) => {
    const type = l.liability_type || "Other";
    if (!groups[type]) groups[type] = [];
    groups[type].push(l);
    return groups;
  }, {} as Record<string, Liability[]>);

  const types = Object.keys(grouped).sort();

  return (
    <div className="mt-8 space-y-8">
      <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" /> Liabilities
      </h2>

      {types.map((type) => (
        <div key={type} className="bg-slate-900 border border-red-900/30 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-red-950/20 flex items-center justify-between">
            <h3 className="text-slate-100 font-bold text-lg">{type}</h3>
            <span className="bg-red-500/10 text-red-400 text-xs px-2 py-1 rounded-md">
              {grouped[type].length} {grouped[type].length === 1 ? 'Liability' : 'Liabilities'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800 bg-slate-900">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium hidden sm:table-cell">Type</th>
                  <th className="p-4 font-medium">Balance Owed</th>
                  <th className="p-4 font-medium hidden sm:table-cell">APR</th>
                  <th className="p-4 font-medium hidden lg:table-cell">Payment</th>
                  <th className="p-4 font-medium hidden lg:table-cell">Interest Cost</th>
                  <th className="p-4 font-medium hidden lg:table-cell">Payoff Est.</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {grouped[type].map((l) => (
                  <LiabilityRow key={l.id} liability={l} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
