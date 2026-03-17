"use client";

import { addAsset } from '../app/actions';
import { useRef, useState } from 'react';

export default function AddAssetForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [assetClass, setAssetClass] = useState("");

  // Determine the behavior based on the asset class
  const isLiveAsset = assetClass === "Securities" || assetClass === "Crypto";
  const isYieldingAsset = assetClass === "Bonds/Tbills" || assetClass === "Sacco/MMF" || assetClass === "Real estate" || assetClass === "Farm/ranch" || assetClass === "Securities";
  const isAppreciatingAsset = assetClass === "Real estate" || assetClass === "Farm/ranch" || assetClass === "VC fund" || assetClass === "Gold" || assetClass === "Commodities";

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
      <h3 className="text-slate-400 font-medium mb-4">Add New Asset</h3>
      
      <form 
        ref={formRef}
        action={async (formData) => {
          await addAsset(formData);
          formRef.current?.reset();
          setAssetClass(""); 
        }} 
        className="flex flex-col gap-4"
      >
        <input 
          type="text" 
          name="name" 
          placeholder="Asset Name (e.g. Texas Ranch or BTC)" 
          required
          className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-indigo-500"
        />

        {/* THE NEW TAXONOMY */}
        <select 
          name="assetClass" 
          required
          value={assetClass}
          onChange={(e) => setAssetClass(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-indigo-500"
        >
          <option value="">Select Class...</option>
          <optgroup label="Live Markets">
            <option value="Securities">Securities (Stocks/ETFs)</option>
            <option value="Crypto">Crypto</option>
          </optgroup>
          <optgroup label="Illiquid / Real Assets">
            <option value="Real estate">Real Estate</option>
            <option value="Farm/ranch">Farm / Ranch</option>
            <option value="VC fund">VC Fund / Private Equity</option>
            <option value="Gold">Gold</option>
            <option value="Commodities">Commodities</option>
          </optgroup>
          <optgroup label="Fixed Income / Cash">
            <option value="Bonds/Tbills">Bonds / T-Bills</option>
            <option value="Sacco/MMF">Sacco / MMF</option>
            <option value="Cash">Liquid Cash</option>
          </optgroup>
        </select>

        {/* LIVE ASSET INPUTS (Ticker/Shares) */}
        {isLiveAsset ? (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
            <input type="text" name="ticker" placeholder="Ticker (e.g. AAPL)" required className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-indigo-500 uppercase" />
            <input type="number" name="shares" placeholder="Total Shares" required step="any" className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-indigo-500" />
          </div>
        ) : assetClass !== "" ? (
          /* STATIC ASSET INPUT (Balance) */
          <div className="animate-in fade-in duration-300">
            <input type="number" name="balance" placeholder="Current Principal Value ($)" required step="0.01" className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-indigo-500" />
          </div>
        ) : null}

        {/* ADVANCED FINANCIAL METRICS */}
        {(isYieldingAsset || isAppreciatingAsset) && (
          <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-slate-950/50 border border-slate-800 rounded-lg animate-in fade-in duration-300">
            {isAppreciatingAsset && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Expected Annual Growth (%)</label>
                <input type="number" name="growthRate" placeholder="e.g. 4.5" step="0.1" className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded p-2 outline-none focus:border-indigo-500 text-sm" />
              </div>
            )}
            {isYieldingAsset && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Annual Dividend/Rent Yield (%)</label>
                <input type="number" name="yieldRate" placeholder="e.g. 8.0" step="0.1" className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded p-2 outline-none focus:border-indigo-500 text-sm" />
              </div>
            )}
          </div>
        )}

        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors mt-2">
          Inject Asset into Vault
        </button>
      </form>
    </div>
  );
}