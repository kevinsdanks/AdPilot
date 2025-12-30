
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
  isPrint?: boolean;
}

const METRIC_CONFIG: Record<string, { label: string, color: string, format: 'currency' | 'number' | 'percent' }> = {
  spend: { label: 'Spend', color: '#ec4899', format: 'currency' },
  conversions: { label: 'Results', color: '#6366f1', format: 'number' },
  cpa: { label: 'CPA', color: '#f59e0b', format: 'currency' },
  cpc: { label: 'CPC', color: '#3b82f6', format: 'currency' },
  ctr: { label: 'CTR', color: '#06b6d4', format: 'percent' },
  cpm: { label: 'CPM', color: '#94a3b8', format: 'currency' }
};

// Robust date parser for various formats: YYYY-MM-DD, DD.MM.YYYY, MM/DD/YYYY, etc.
const parseRobustDate = (dateStr: any): Date | null => {
    if (!dateStr) return null;
    const s = String(dateStr).trim();
    
    // 1. Try ISO / JS default
    let d = new Date(s);
    if (!isNaN(d.getTime())) return d;

    // 2. Try European format DD.MM.YYYY
    const partsDot = s.split('.');
    if (partsDot.length === 3) {
        // Assume DD.MM.YYYY
        d = new Date(`${partsDot[2]}-${partsDot[1]}-${partsDot[0]}`);
        if (!isNaN(d.getTime())) return d;
    }

    // 3. Try DD/MM/YYYY
    const partsSlash = s.split('/');
    if (partsSlash.length === 3) {
       // Ambiguous, but try MM/DD/YYYY first (US), then DD/MM/YYYY
       d = new Date(`${partsSlash[2]}-${partsSlash[0]}-${partsSlash[1]}`); // US assumption
       if (!isNaN(d.getTime())) return d;
       d = new Date(`${partsSlash[2]}-${partsSlash[1]}-${partsSlash[0]}`); // EU assumption
       if (!isNaN(d.getTime())) return d;
    }

    return null;
};

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, currency, goal, isPrint = false }) => {
  const availableMetrics = ['spend', 'conversions', 'cpa', 'cpc', 'ctr', 'cpm'];
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [metric1, setMetric1] = useState<string>('conversions'); 
  const [metric2, setMetric2] = useState<string>('spend'); 
  const [hiddenMetrics, setHiddenMetrics] = useState<string[]>([]);

  useEffect(() => {
    setHiddenMetrics([]);
  }, [data]);

  const normalizedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((item, idx) => {
      const keys = Object.keys(item);
      
      const findVal = (regex: RegExp) => {
          const key = keys.find(k => regex.test(k));
          let val = key ? item[key] : 0;
          if (typeof val === 'string') {
             // Cleanup "1,200.00" or "€ 1200"
             val = val.replace(/[^0-9.,-]/g, '');
             val = parseFloat(val.replace(',', '')); // Simple replace, ideally use locale
          }
          return Number(val || 0);
      };

      // Robust matching for metrics (handles Meta API snake_case and CSV Title Case)
      const spendValue = findVal(/^(spend|amount_spent|cost|summa|iztērētā)/i);
      const convValue = findVal(/^(results|conversions|leads|purchases|rezultāti|actions)/i);
      const impValue = findVal(/^(impressions|imps|rādījumi)/i);
      const clicksValue = findVal(/^(clicks|link_clicks|klikšķi)/i);

      // Calculations if not present in CSV
      const ctrValue = findVal(/^ctr/i) || (impValue > 0 ? (clicksValue / impValue) * 100 : 0);
      const cpaValue = findVal(/^(cpa|cost_per_result|cost_per_action)/i) || (convValue > 0 ? (spendValue / convValue) : 0);
      const cpcValue = findVal(/^(cpc|cost_per_link_click)/i) || (clicksValue > 0 ? (spendValue / clicksValue) : 0);
      const cpmValue = findVal(/^(cpm|cost_per_1000)/i) || (impValue > 0 ? (spendValue / impValue) * 1000 : 0);
      
      // Date Parsing Strategy
      let dateLabel = `Row ${idx + 1}`;
      let timestamp = idx;

      // Find ANY key that looks like a date
      const dateKey = keys.find(k => /date|day|starts|laiks|datums|time_range/i.test(k));
      
      if (dateKey && item[dateKey]) {
          const parsed = parseRobustDate(item[dateKey]);
          if (parsed) {
              dateLabel = parsed.toISOString().split('T')[0];
              timestamp = parsed.getTime();
          } else {
              // Fallback: use raw string
              dateLabel = String(item[dateKey]);
          }
      }

      return {
        ...item,
        conversions: convValue,
        spend: spendValue,
        cpa: cpaValue,
        cpc: cpcValue,
        ctr: ctrValue,
        cpm: cpmValue,
        date: dateLabel,
        timestamp // Used for X-Axis scaling
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);

  const toggleMetric = (e: any) => {
    if (isPrint) return;
    const { dataKey } = e;
    setHiddenMetrics(prev => prev.includes(dataKey) ? prev.filter(k => k !== dataKey) : [...prev, dataKey]);
  };

  const formatValue = (val: number, key: string) => {
    const config = METRIC_CONFIG[key] || { format: 'number' };
    if (config.format === 'currency') return val.toLocaleString(undefined, { style: 'currency', currency });
    if (config.format === 'percent') return `${val.toFixed(2)}%`;
    return val.toLocaleString();
  };

  const formatDateLabel = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return ""; 
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
    } catch (e) {
      return "";
    }
  };

  const MetricSelect = ({ value, onChange, label }: { value: string, onChange: (v: string) => void, label: string }) => (
    <div className="flex flex-col gap-1.5 text-left">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</label>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-extrabold hover:border-indigo-300 outline-none cursor-pointer shadow-sm transition-all min-w-[120px]"
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
        <div className="bg-slate-900/95 p-6 rounded-[2rem] border border-white/10 shadow-2xl text-[11px] text-white text-left min-w-[240px] backdrop-blur-xl z-50">
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

  // If no data or only 1 point, still try to show something or a clear message
  if (normalizedData.length === 0) {
      return (
          <div className="bg-white rounded-[3.5rem] border border-slate-100 p-12 mb-12 flex items-center justify-center min-h-[300px]">
              <div className="text-center text-slate-400">
                  <BarChartIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-bold text-sm">Insufficient data to generate chart.</p>
                  <p className="text-[10px] mt-1">Ensure your dataset contains Date and Spend/Results columns.</p>
              </div>
          </div>
      );
  }

  return (
    <div className={`bg-white rounded-[3.5rem] border border-slate-100 shadow-sm p-12 mb-12 overflow-hidden ${isPrint ? 'h-[400px] p-0 border-0 shadow-none rounded-none mb-0' : ''}`}>
      {!isPrint && (
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
      )}
      
      {isPrint && (
         <div className="text-left mb-6 border-b border-slate-200 pb-2">
            <h3 className="font-extrabold text-slate-900 text-xl tracking-tight uppercase">Performance Analytics</h3>
         </div>
      )}

      <div className={`${isPrint ? 'h-[300px]' : 'h-[500px]'} w-full px-4`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={normalizedData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="timestamp" 
              type="number"
              domain={['dataMin', 'dataMax']}
              scale="time"
              tick={{ fontSize: isPrint ? 12 : 11, fill: isPrint ? '#0f172a' : '#94a3b8', fontWeight: 900 }} 
              tickMargin={15} 
              axisLine={false} 
              tickLine={false}
              tickFormatter={formatDateLabel}
              minTickGap={15} // Reduced further to prevent aggressive hiding
              interval="preserveStartEnd" // Forces start and end dates to show
            />
            <YAxis yAxisId="left" tick={{ fontSize: isPrint ? 12 : 11, fill: '#6366f1', fontWeight: 900 }} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: isPrint ? 12 : 11, fill: '#ec4899', fontWeight: 900 }} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} />
            {!isPrint && <Tooltip content={<CustomTooltip />} />}
            <Legend 
              verticalAlign="top" 
              align="right"
              height={50} 
              iconType="circle" 
              onClick={toggleMetric} 
              formatter={(val) => <span className="font-black uppercase tracking-widest text-[10px] ml-2 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">{METRIC_CONFIG[val]?.label || val}</span>} 
            />
            
            {chartType === 'bar' ? (
                <Bar yAxisId="right" dataKey={metric2} fill={METRIC_CONFIG[metric2]?.color || '#ec4899'} radius={[8, 8, 0, 0]} hide={hiddenMetrics.includes(metric2)} barSize={36} isAnimationActive={!isPrint} />
            ) : (
                <Area yAxisId="right" type="monotone" dataKey={metric2} stroke={METRIC_CONFIG[metric2]?.color || '#ec4899'} fill={METRIC_CONFIG[metric2]?.color || '#ec4899'} fillOpacity={0.1} strokeWidth={isPrint ? 3 : 5} connectNulls hide={hiddenMetrics.includes(metric2)} isAnimationActive={!isPrint} />
            )}
            
            <Line yAxisId="left" type="monotone" dataKey={metric1} stroke={METRIC_CONFIG[metric1]?.color || '#6366f1'} strokeWidth={isPrint ? 4 : 6} dot={{ r: 5, strokeWidth: 4, fill: '#fff' }} activeDot={{ r: 9, strokeWidth: 4, fill: '#6366f1' }} connectNulls hide={hiddenMetrics.includes(metric1)} isAnimationActive={!isPrint} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
