
import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { LineChart as LineChartIcon, BarChart as BarChartIcon } from 'lucide-react';

interface PerformanceChartProps {
  data: any[];
  currency: string;
  goal: 'SALES' | 'LEADS' | 'TRAFFIC';
}

const METRIC_CONFIG: Record<string, { label: string, color: string, format: 'currency' | 'number' | 'percent' }> = {
  spend: { label: 'Spend', color: '#ec4899', format: 'currency' },
  conversions: { label: 'Leads', color: '#6366f1', format: 'number' },
  cpa: { label: 'CPA', color: '#f59e0b', format: 'currency' },
  cpc: { label: 'CPC', color: '#3b82f6', format: 'currency' },
  ctr: { label: 'CTR', color: '#06b6d4', format: 'percent' },
  cpm: { label: 'CPM', color: '#94a3b8', format: 'currency' }
};

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, currency, goal }) => {
  const availableMetrics = ['spend', 'conversions', 'cpa', 'cpc', 'ctr', 'cpm'];
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [metric1, setMetric1] = useState<string>('conversions'); 
  const [metric2, setMetric2] = useState<string>('spend'); 
  const [hiddenMetrics, setHiddenMetrics] = useState<string[]>([]);

  useEffect(() => {
    setHiddenMetrics([]);
  }, [data]);

  const normalizedData = useMemo(() => {
    return data.map(item => {
      // Find possible keys for all configured metrics
      const convKey = Object.keys(item).find(k => k.toLowerCase() === 'conversions' || k.toLowerCase() === 'leads' || k.toLowerCase() === 'results' || k.toLowerCase() === 'total conversions');
      const spendKey = Object.keys(item).find(k => k.toLowerCase() === 'spend' || k.toLowerCase() === 'amount spent' || k.toLowerCase() === 'cost');
      const impKey = Object.keys(item).find(k => k.toLowerCase() === 'impressions' || k.toLowerCase() === 'imps');
      const clicksKey = Object.keys(item).find(k => k.toLowerCase() === 'clicks' || k.toLowerCase() === 'link clicks');

      const spendValue = spendKey ? Number(item[spendKey] || 0) : 0;
      const convValue = convKey ? Number(item[convKey] || 0) : 0;
      const impValue = impKey ? Number(item[impKey] || 0) : 0;
      const clicksValue = clicksKey ? Number(item[clicksKey] || 0) : 0;

      const ctrValue = impValue > 0 ? (clicksValue / impValue) * 100 : Number(item.ctr || 0);
      const cpaValue = convValue > 0 ? (spendValue / convValue) : Number(item.cpa || 0);
      const cpcValue = clicksValue > 0 ? (spendValue / clicksValue) : Number(item.cpc || 0);
      const cpmValue = impValue > 0 ? (spendValue / impValue) * 1000 : Number(item.cpm || 0);
      
      return {
        ...item,
        conversions: convValue,
        spend: spendValue,
        cpa: cpaValue,
        cpc: cpcValue,
        ctr: ctrValue,
        cpm: cpmValue,
        date: item.date || item.Date || item.starts || 'N/A'
      };
    });
  }, [data]);

  const toggleMetric = (e: any) => {
    const { dataKey } = e;
    setHiddenMetrics(prev => prev.includes(dataKey) ? prev.filter(k => k !== dataKey) : [...prev, dataKey]);
  };

  const formatValue = (val: number, key: string) => {
    const config = METRIC_CONFIG[key] || { format: 'number' };
    if (config.format === 'currency') return val.toLocaleString(undefined, { style: 'currency', currency });
    if (config.format === 'percent') return `${val.toFixed(2)}%`;
    return val.toLocaleString();
  };

  const formatDateLabel = (dateStr: string) => {
    if (dateStr === 'N/A') return dateStr;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  const MetricSelect = ({ value, onChange, label }: { value: string, onChange: (v: string) => void, label: string }) => (
    <div className="flex flex-col gap-1.5 text-left">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</label>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-extrabold hover:border-indigo-300 outline-none cursor-pointer shadow-sm transition-all"
      >
        {availableMetrics.map(m => (
          <option key={m} value={m}>{METRIC_CONFIG[m]?.label || m}</option>
        ))}
      </select>
    </div>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 p-6 rounded-[2rem] border border-white/10 shadow-2xl text-[11px] text-white text-left min-w-[240px] backdrop-blur-xl">
          <p className="font-black text-slate-400 mb-5 border-b border-white/10 pb-4 uppercase tracking-[0.2em]">{formatDateLabel(label)}</p>
          <div className="space-y-3.5">
            {availableMetrics.map(m => (
                <div key={m} className="flex justify-between gap-10 items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full shadow-inner" style={{ backgroundColor: METRIC_CONFIG[m]?.color }} />
                        <span className="text-slate-400 font-black uppercase tracking-widest text-[10px] leading-none">{METRIC_CONFIG[m]?.label || m}:</span>
                    </div>
                    <span className="font-mono font-black text-xs leading-none">{formatValue(dataPoint[m] || 0, m)}</span>
                </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm p-12 mb-12 overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-12">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-50 rounded-[1.8rem] text-indigo-600 shadow-inner border border-indigo-100">
             {chartType === 'line' ? <LineChartIcon className="w-8 h-8" /> : <BarChartIcon className="w-8 h-8" />}
          </div>
          <div className="text-left">
            <h3 className="font-extrabold text-slate-900 text-3xl tracking-tight leading-none mb-2">Performance Analytics</h3>
            <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] leading-none">Real-time auction intelligence & trends</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6">
             <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200">
                <button onClick={() => setChartType('line')} className={`px-8 py-2.5 text-[11px] font-black uppercase rounded-xl transition-all ${chartType === 'line' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>Line</button>
                <button onClick={() => setChartType('bar')} className={`px-8 py-2.5 text-[11px] font-black uppercase rounded-xl transition-all ${chartType === 'bar' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>Bar</button>
             </div>
             <div className="flex gap-6 bg-slate-50 p-4 rounded-[1.8rem] border border-slate-100 shadow-sm">
                <MetricSelect label="Axis Primary" value={metric1} onChange={setMetric1} />
                <MetricSelect label="Axis Secondary" value={metric2} onChange={setMetric2} />
             </div>
        </div>
      </div>
      <div className="h-[500px] w-full px-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={normalizedData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 900 }} 
              tickMargin={15} 
              axisLine={false} 
              tickLine={false}
              tickFormatter={formatDateLabel}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6366f1', fontWeight: 900 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#ec4899', fontWeight: 900 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              align="right"
              height={50} 
              iconType="circle" 
              onClick={toggleMetric} 
              formatter={(val) => <span className="font-black uppercase tracking-widest text-[10px] ml-2 text-slate-500 hover:text-slate-900 transition-colors">{METRIC_CONFIG[val]?.label || val}</span>} 
            />
            
            {chartType === 'bar' ? (
                <Bar yAxisId="right" dataKey={metric2} fill={METRIC_CONFIG[metric2]?.color || '#ec4899'} radius={[8, 8, 0, 0]} hide={hiddenMetrics.includes(metric2)} barSize={36} />
            ) : (
                <Area yAxisId="right" type="monotone" dataKey={metric2} stroke={METRIC_CONFIG[metric2]?.color || '#ec4899'} fill={METRIC_CONFIG[metric2]?.color || '#ec4899'} fillOpacity={0.1} strokeWidth={5} hide={hiddenMetrics.includes(metric2)} />
            )}
            
            <Line yAxisId="left" type="monotone" dataKey={metric1} stroke={METRIC_CONFIG[metric1]?.color || '#6366f1'} strokeWidth={6} dot={{ r: 5, strokeWidth: 4, fill: '#fff' }} activeDot={{ r: 9, strokeWidth: 4, fill: '#6366f1' }} hide={hiddenMetrics.includes(metric1)} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
