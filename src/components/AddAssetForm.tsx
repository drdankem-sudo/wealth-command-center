"use client";

import { addAsset } from '../app/actions';
import { useRef, useState } from 'react';

export default function AddAssetForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [assetClass, setAssetClass] = useState("");
  const [status, setStatus] = useState<{ error?: string; success?: boolean } | null>(null);

  const isLiveAsset = assetClass === "Securities" || assetClass === "Crypto" || assetClass === "NSE Equities";
  const isGold = assetClass === "Gold";
  const isDepreciating = assetClass === "Vehicle" || assetClass === "Equipment";
  const isStartup = assetClass === "Startup Equity";
  const isYieldingAsset = assetClass === "Bonds/Tbills" || assetClass === "Sacco/MMF" || assetClass === "Real estate" || assetClass === "Farm/ranch" || assetClass === "Securities" || assetClass === "NSE Equities";
  const isAppreciatingAsset = assetClass === "Real estate" || assetClass === "Farm/ranch" || assetClass === "VC fund" || assetClass === "Gold" || assetClass === "Commodities";
  const hasMonthlyIncome = isStartup || assetClass === "Real estate" || assetClass === "Farm/ranch";
  const showAdvanced = isYieldingAsset || isAppreciatingAsset || isDepreciating || isStartup;

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
      <h3 className="text-slate-400 font-medium mb-4">Add New Asset</h3>

      <form
        ref={formRef}
        action={async (formData) => {
          setStatus(null);
          const result = await addAsset(formData);
          if (result?.error) {
            setStatus({ error: result.error });
          } else {
            setStatus({ success: true });
            formRef.current?.reset();
            setAssetClass("");
            setTimeout(() => setStatus(null), 3000);
          }
        }}
        className="flex flex-col gap-4"
      >
        <input
          type="text"
          name="name"
          placeholder="Asset Name (e.g. Tesla Model 3, BTC)"
          required
          className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-indigo-500"
        />

        <select
          name="assetClass"
          required
          value={assetClass}
          onChange={(e) => { setAssetClass(e.target.value); setStatus(null); }}
          className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-indigo-500"
        >
          <option value="">Select Class...</option>
          <optgroup label="Live Markets">
            <option value="Securities">Securities (US Stocks/ETFs)</option>
            <option value="NSE Equities">NSE Equities (Nairobi)</option>
            <option value="Crypto">Crypto</option>
          </optgroup>
          <optgroup label="Appreciating Assets">
            <option value="Real estate">Real Estate</option>
            <option value="Farm/ranch">Farm / Ranch</option>
            <option value="VC fund">VC Fund / Private Equity</option>
            <option value="Gold">Gold (Troy Oz)</option>
            <option value="Commodities">Commodities</option>
            <option value="Startup Equity">Startup Equity</option>
          </optgroup>
          <optgroup label="Depreciating Assets">
            <option value="Vehicle">Vehicle (Car/Truck/Motorcycle)</option>
            <option value="Equipment">Equipment / Electronics</option>
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
            <input type="text" name="ticker" placeholder={assetClass === "NSE Equities" ? "Ticker (e.g. SCOM)" : "Ticker (e.g. AAPL)"} required className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-indigo-500 uppercase" />
            <input type="number" name="shares" placeholder="Total Shares" required step="any" className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-indigo-500" />
          </div>
        ) : isGold ? (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Weight (Troy Oz)</label>
              <input type="number" name="shares" placeholder="e.g. 10" required step="any" className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Fallback Value ($)</label>
              <input type="number" name="balance" placeholder="If no API" step="0.01" className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-indigo-500" />
            </div>
          </div>
        ) : assetClass !== "" ? (
          <div className="animate-in fade-in duration-300">
            <input type="number" name="balance" placeholder={isDepreciating ? "Current Market Value ($)" : "Current Principal Value ($)"} required step="0.01" className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-indigo-500" />
          </div>
        ) : null}

        {/* ADVANCED FINANCIAL METRICS */}
        {showAdvanced && (
          <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-slate-950/50 border border-slate-800 rounded-lg animate-in fade-in duration-300">
            {isDepreciating && (
              <div className="col-span-2">
                <label className="text-xs text-red-400 mb-1 block">
                  Annual Depreciation Rate (%) — defaults to {assetClass === 'Vehicle' ? '15' : '25'}%
                </label>
                <input type="number" name="growthRate" placeholder={assetClass === 'Vehicle' ? '-15' : '-25'} step="0.1" className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded p-2 outline-none focus:border-red-500 text-sm" />
                <p className="text-xs text-slate-600 mt-1">Enter negative number (e.g. -15 for 15% annual depreciation)</p>
              </div>
            )}
            {isAppreciatingAsset && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Expected Annual Growth (%)</label>
                <input type="number" name="growthRate" placeholder="e.g. 4.5" step="0.1" className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded p-2 outline-none focus:border-indigo-500 text-sm" />
              </div>
            )}
            {isYieldingAsset && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  {assetClass === 'Securities' ? 'Dividend Yield % (auto-fetched if blank)' : 'Annual Dividend/Rent Yield (%)'}
                </label>
                <input type="number" name="yieldRate" placeholder={assetClass === 'Securities' ? 'Auto from Finnhub' : 'e.g. 8.0'} step="0.1" className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded p-2 outline-none focus:border-indigo-500 text-sm" />
              </div>
            )}
            {isStartup && (
              <div className="col-span-2">
                <p className="text-xs text-slate-500 mb-2">No valuation yet? Set balance to $0. You can update it later when valued.</p>
              </div>
            )}
            {hasMonthlyIncome && (
              <div className={isStartup ? 'col-span-2' : ''}>
                <label className="text-xs text-emerald-400 mb-1 block">
                  {isStartup ? 'Variable Monthly Income ($)' : 'Monthly Rental/Income ($)'}
                </label>
                <input type="number" name="monthlyIncome" placeholder="e.g. 2500" step="0.01" className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded p-2 outline-none focus:border-emerald-500 text-sm" />
                <p className="text-xs text-slate-600 mt-1">Update anytime as income changes</p>
              </div>
            )}
          </div>
        )}

        {/* TARGET ALLOCATION */}
        {assetClass !== "" && (
          <div className="animate-in fade-in duration-300">
            <label className="text-xs text-slate-400 mb-1 block">Target Portfolio Allocation (%)</label>
            <input type="number" name="targetAllocation" placeholder="e.g. 15" step="0.1" min="0" max="100" className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-3 outline-none focus:border-indigo-500" />
          </div>
        )}

        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors mt-2">
          Inject Asset into Vault
        </button>

        {status?.error && (
          <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-center">
            Failed to add asset. Please try again.
          </p>
        )}
        {status?.success && (
          <p className="text-emerald-400 text-sm bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 text-center">
            Asset added to vault.
          </p>
        )}
      </form>
    </div>
  );
}
