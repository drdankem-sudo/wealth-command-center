"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DashboardCharts({ assetsData, historyData }: { assetsData: any[], historyData: any[] }) {

  // Allocation pie data
  const allocationData = assetsData.reduce((acc: any[], asset) => {
    const existing = acc.find(item => item.name === asset.asset_class);
    if (existing) {
      existing.value += Number(asset.balance || 0);
    } else {
      acc.push({ name: asset.asset_class, value: Number(asset.balance || 0) });
    }
    return acc;
  }, []);

  // Actual vs Target allocation bar data
  const totalBalance = assetsData.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const allocationByClass: Record<string, { actual: number; target: number }> = {};

  for (const asset of assetsData) {
    const cls = asset.asset_class;
    if (!allocationByClass[cls]) allocationByClass[cls] = { actual: 0, target: 0 };
    allocationByClass[cls].actual += Number(asset.balance || 0);
    // Use the max target among assets in the same class (they should be the same)
    const target = Number(asset.target_allocation || 0);
    if (target > allocationByClass[cls].target) allocationByClass[cls].target = target;
  }

  const targetData = Object.entries(allocationByClass)
    .filter(([, v]) => v.actual > 0 || v.target > 0)
    .map(([name, v]) => ({
      name,
      actual: totalBalance > 0 ? Math.round((v.actual / totalBalance) * 1000) / 10 : 0,
      target: v.target,
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

      {/* 1. NET WORTH HISTORY */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm h-[400px]">
        <h3 className="text-slate-400 font-medium mb-6">Net Worth Trajectory</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={historyData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="recorded_date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
              itemStyle={{ color: '#818cf8' }}
              formatter={(value: any) => [`$${Number(value || 0).toLocaleString()}`, 'Net Worth']}
            />
            <Area type="monotone" dataKey="net_worth" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 2. ASSET ALLOCATION PIE */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm h-[400px]">
        <h3 className="text-slate-400 font-medium mb-6">Asset Allocation</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={allocationData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {allocationData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
              formatter={(value: any) => `$${Number(value || 0).toLocaleString()}`}
            />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 3. ACTUAL vs TARGET ALLOCATION */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm h-[400px] lg:col-span-2 xl:col-span-1">
        <h3 className="text-slate-400 font-medium mb-6">Actual vs Target (%)</h3>
        {targetData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={targetData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={90} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                formatter={(value: any, name: any) => [`${Number(value).toFixed(1)}%`, name === 'actual' ? 'Actual' : 'Target']}
              />
              <Bar dataKey="actual" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12} name="Actual" />
              <Bar dataKey="target" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} name="Target" />
              <Legend verticalAlign="bottom" height={36} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Set target allocations on your assets to see this chart
          </div>
        )}
      </div>

    </div>
  );
}
