"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DashboardCharts({ assetsData, historyData }: { assetsData: any[], historyData: any[] }) {
  
  // Prepare data for the Allocation Pie Chart
  const allocationData = assetsData.reduce((acc: any[], asset) => {
    const existing = acc.find(item => item.name === asset.asset_class);
    if (existing) {
      existing.value += Number(asset.balance || 0);
    } else {
      acc.push({ name: asset.asset_class, value: Number(asset.balance || 0) });
    }
    return acc;
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* 1. NET WORTH HISTORY (AREA CHART) */}
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
              // 🚨 THE FIX: Using "any" and manual casting to satisfy Vercel's strict type check
              formatter={(value: any) => [`$${Number(value || 0).toLocaleString()}`, 'Net Worth']}
            />
            <Area type="monotone" dataKey="net_worth" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 2. ASSET ALLOCATION (PIE CHART) */}
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

    </div>
  );
}