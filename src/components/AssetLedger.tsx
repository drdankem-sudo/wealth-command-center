// src/components/AssetLedger.tsx
"use client";

import { useState } from 'react';
import { deleteAsset, updateAsset } from '../app/actions';
import { Trash2, Edit2, X, Check, AlertTriangle } from 'lucide-react';

interface LedgerAsset {
  id: string;
  name: string;
  asset_class: string;
  ticker_symbol: string | null;
  shares: number;
  balance: number;
}

// --- SUB-COMPONENT: A Single Editable Row ---
function AssetRow({ asset }: { asset: LedgerAsset }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  const [editShares, setEditShares] = useState(asset.shares || 0);
  const [editBalance, setEditBalance] = useState(asset.balance || 0);

  return (
    <tr className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
      <td className="p-4 font-medium text-slate-100">{asset.name}</td>
      
      <td className="p-4 text-sm text-slate-400">
        {asset.ticker_symbol ? (
          <span className="font-bold text-indigo-400">{asset.ticker_symbol}</span>
        ) : "N/A"}
      </td>

      {/* SHARES COLUMN */}
      <td className="p-4 text-sm text-slate-400">
        {isEditing && asset.ticker_symbol ? (
          <input 
            type="number" 
            value={editShares}
            onChange={(e) => setEditShares(Number(e.target.value))}
            className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 outline-none focus:border-indigo-500"
          />
        ) : (
          asset.ticker_symbol ? `${asset.shares} shrs` : "-"
        )}
      </td>

      {/* BALANCE COLUMN */}
      <td className="p-4 font-medium text-emerald-400">
        {isEditing ? (
          asset.ticker_symbol ? (
            <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">Auto-Calculates on Save</span>
          ) : (
            <div className="flex items-center gap-1">
              <span>$</span>
              <input 
                type="number" 
                value={editBalance}
                onChange={(e) => setEditBalance(Number(e.target.value))}
                className="w-32 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 outline-none focus:border-emerald-500"
              />
            </div>
          )
        ) : (
          `$${Number(asset.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        )}
      </td>

      {/* ACTIONS COLUMN */}
      <td className="p-4 text-right">
        {isConfirmingDelete ? (
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-red-400 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Sure?</span>
            <form action={deleteAsset}>
              <input type="hidden" name="id" value={asset.id} />
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
              await updateAsset(formData);
              setIsEditing(false);
            }}>
              <input type="hidden" name="id" value={asset.id} />
              <input type="hidden" name="shares" value={editShares} />
              <input type="hidden" name="balance" value={editBalance} />
              {/* Secret inputs to pass ticker and class back to the server */}
              <input type="hidden" name="ticker" value={asset.ticker_symbol || ''} />
              <input type="hidden" name="assetClass" value={asset.asset_class} />
              
              <button type="submit" className="text-emerald-500 hover:bg-emerald-500/20 p-2 rounded-lg transition-all" title="Save Changes">
                <Check className="w-4 h-4" />
              </button>
            </form>
            <button onClick={() => {
              setIsEditing(false);
              setEditShares(asset.shares);
              setEditBalance(asset.balance);
            }} className="text-slate-500 hover:bg-slate-800 p-2 rounded-lg transition-all" title="Cancel">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => setIsEditing(true)} className="text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 p-2 rounded-lg transition-all" title="Edit Asset">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => setIsConfirmingDelete(true)} className="text-slate-500 hover:text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-all" title="Delete Asset">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// --- MAIN COMPONENT ---
export default function AssetLedger({ assets }: { assets: LedgerAsset[] }) {
  const groupedAssets = assets.reduce((groups, asset) => {
    const category = asset.asset_class || "Uncategorized";
    if (!groups[category]) groups[category] = [];
    groups[category].push(asset);
    return groups;
  }, {} as Record<string, LedgerAsset[]>);

  const categories = Object.keys(groupedAssets).sort();

  return (
    <div className="mt-8 space-y-8">
      {assets.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center text-slate-500">
          Your vault is currently empty. Add an asset above to begin.
        </div>
      )}

      {categories.map((category) => (
        <div key={category} className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between">
            <h3 className="text-slate-100 font-bold text-lg">{category}</h3>
            <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-md">
              {groupedAssets[category].length} Assets
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800 bg-slate-900">
                  <th className="p-4 font-medium">Asset Name</th>
                  <th className="p-4 font-medium">Ticker</th>
                  <th className="p-4 font-medium">Shares</th>
                  <th className="p-4 font-medium">Value ($)</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {groupedAssets[category].map((asset) => (
                  <AssetRow key={asset.id} asset={asset} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}