"use client";

import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

// 1. Tell the component exactly what the database data looks like
interface Asset {
  name: string;
  target_allocation: number;
  balance: number;
}

interface HistorySnapshot {
  recorded_date: string;
  net_worth: number;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#64748b', '#ec4899', '#8b5cf6'];

// 2. Accept BOTH the live assets and the historical snapshots from the main page
export default function DashboardCharts({ 
  assetsData, 
  historyData 
}: { 
  assetsData: Asset[], 
  historyData: HistorySnapshot[] 
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* The Time Machine: Area Chart (Historical Net Worth) */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm h-96">
        <h3 className="text-slate-400 font-medium mb-6">Net Worth Trajectory (History)</h3>
        <div className="h-72 w-full">
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
                tickFormatter={(value) => `$${value.toLocaleString()}`} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                itemStyle={{ color: '#818cf8' }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Net Worth']}
              />
              <Area type="monotone" dataKey="net_worth" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* The Live Distribution: Pie Chart (Asset Allocation by Balance) */}
      <div className="bg-slate-900 border-2 border-indigo-500/50 p-6 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.1)] h-96 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">LIVE DB CONNECTION</div>
        <h3 className="text-slate-400 font-medium mb-2">Current Allocation ($)</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={assetsData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="balance" // Using actual dollars now!
                nameKey="name"
                stroke="none"
              >
                {assetsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} 
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Balance']} 
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}