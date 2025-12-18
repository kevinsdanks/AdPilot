
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
import { LineChart as LineChartIcon, BarChart as BarChartIcon, Info, Activity } from 'lucide-react';

interface PerformanceChartProps {
  data: any[];
  currency: string;
  goal: 'SALES' | 'LEADS' | 'TRAFFIC';
}

const METRIC_CONFIG: Record<string, { label: string, color: string, format: 'currency' | 'number' | 'percent' }> = {
  spend: { label: 'Spend', color: '#6366f1', format: 'currency' },
  conversions: { label: 'Leads', color: '#ec4899', format: 'number' },
  cpa: { label: 'CPA', color: '#f59e0b', format: 'currency' },
  cpc: { label: 'CPC', color: '#3b82f6', format: 'currency' },
  ctr: { label: 'CTR', color: '#06b6d4', format: 'percent' },
  cpm: { label: 'CPM', color: '#94a3b8', format: 'currency' },
  revenue: { label: 'Revenue', color: '#10b981', format: 'currency' },
  roas: { label: 'ROAS', color: '#8b5cf6', format: 'number' }
};

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, currency, goal }) => {
  const availableMetrics = ['spend', 'conversions', 'cpa', 'cpc', 'ctr', 'cpm'];

  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [metric1, setMetric1] = useState<string>('spend');
  const [metric2, setMetric2] = useState<string>('conversions');
  const [hiddenMetrics, setHiddenMetrics] = useState<string[]>([]);

  useEffect(() => {
    // Diagnostic logging as requested
    console.log('--- Chart Performance Trace ---');
    console.log('Row count after filter:', data.length);
    if (data.length > 0) {
        const validDates = data.filter(d => d.date && !isNaN(new Date(d.date).getTime()));
        console.log('Valid date parse count:', validDates.length);
        const uniqueDays = new Set(data.map(d => d.date)).size;
        console.log('Unique day count:', uniqueDays);
        console.log('Final timeseries length:', data.length);
        console.log('First 3 points:', data.slice(0, 3));
    } else {
        console.log('No trend data available to plot.');
    }
  }, [data]);

  useEffect(() => {
    setHiddenMetrics([]);
  }, [metric1, metric2]);

  const toggleMetric = (e: any) => {
    const { dataKey } = e;
    setHiddenMetrics(prev => 
      prev.includes(dataKey) 
        ? prev.filter(key => key !== dataKey)
        : [...prev, dataKey]
    );
  };

  const formatValue = (val: number, key: string) => {
    const config = METRIC_CONFIG[key] || { format: 'number' };
    if (key === 'cpa' && (val === 0 || !isFinite(val))) return '—';
    if (config.format === 'currency') return val.toLocaleString(undefined, { style: 'currency', currency });
    if (config.format === 'percent') return `${val.toFixed(2)}%`;
    return val.toLocaleString();
  };

  const MetricSelect = ({ value, onChange, label }: { value: string, onChange: (v: string) => void, label: string }) => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1.5 bg-white border border-slate-200 rounded-md text-sm text-slate-700 font-medium hover:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all cursor-pointer min-w-[120px]"
      >
        {availableMetrics.map(m => (
          <option key={m} value={m}>{m === 'conversions' ? 'Leads' : METRIC_CONFIG[m]?.label || m}</option>
        ))}
      </select>
    </div>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const tooltipMetrics = ['spend', 'conversions', 'cpa', 'ctr'];
      
      return (
        <div className="bg-slate-900/95 p-4 rounded-xl border border-slate-800 shadow-xl text-xs text-white min-w-[180px] backdrop-blur-sm">
          <p className="font-bold text-slate-300 mb-3 border-b border-slate-700 pb-2">
            {new Date(label).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
          <div className="space-y-2">
            {tooltipMetrics.map(m => {
               const displayLabel = m === 'conversions' ? 'Leads' : METRIC_CONFIG[m]?.label || m;
               const val = dataPoint[m] || 0;
               return (
                <div key={m} className="flex justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: METRIC_CONFIG[m]?.color }}></div>
                        <span className="text-slate-400">{displayLabel}:</span>
                    </div>
                    <span className="font-mono">{formatValue(val, m)}</span>
                </div>
               );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data;
  }, [data]);

  const isEmpty = chartData.length === 0;
  const isSparse = chartData.length > 0 && chartData.length < 3;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-lg">
             {chartType === 'line' ? <LineChartIcon className="w-6 h-6 text-indigo-600" /> : <BarChartIcon className="w-6 h-6 text-indigo-600" />}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Performance Over Time</h3>
            <div className="flex items-center gap-2">
                <p className="text-slate-500 text-sm">Daily trends for selected metrics</p>
                {isSparse && (
                    <div className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                        <Info className="w-2.5 h-2.5" />
                        <span>Low density</span>
                    </div>
                )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
             <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setChartType('line')} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${chartType === 'line' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <LineChartIcon className="w-3.5 h-3.5" /> Line
                </button>
                <button 
                  onClick={() => setChartType('bar')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${chartType === 'bar' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <BarChartIcon className="w-3.5 h-3.5" /> Bar
                </button>
             </div>
             <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
             <div className="flex gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                <MetricSelect label="Left Axis" value={metric1} onChange={setMetric1} />
                <MetricSelect label="Right Axis" value={metric2} onChange={setMetric2} />
             </div>
        </div>
      </div>

      <div className="h-[350px] w-full relative">
        {isEmpty && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center bg-white/60 backdrop-blur-[2px] p-6 rounded-2xl border border-slate-100/50 shadow-sm">
                    <Activity className="w-8 h-8 text-slate-300 mb-3 animate-pulse" />
                    <span className="text-sm font-bold text-slate-400">Waiting for sufficient daily data signal...</span>
                    <span className="text-[10px] text-slate-300 mt-1 uppercase tracking-widest font-black">Historical context required</span>
                </div>
            </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMetric1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={METRIC_CONFIG[metric1]?.color || '#8884d8'} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={METRIC_CONFIG[metric1]?.color || '#8884d8'} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
                dataKey="date" 
                tickFormatter={(str) => {
                    if (!str) return '';
                    const d = new Date(str);
                    return isNaN(d.getTime()) ? str : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                }}
                stroke="#94a3b8"
                fontSize={11}
                tickMargin={10}
                minTickGap={30}
                hide={false}
            />
            <YAxis 
                yAxisId="left"
                orientation="left"
                stroke={METRIC_CONFIG[metric1]?.color || '#8884d8'}
                fontSize={11}
                tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                hide={false}
            />
            <YAxis 
                yAxisId="right"
                orientation="right"
                stroke={METRIC_CONFIG[metric2]?.color || '#82ca9d'}
                fontSize={11}
                tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                hide={false}
            />
            {!isEmpty && <Tooltip content={<CustomTooltip />} />}
            <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ paddingBottom: '20px' }}
                onClick={toggleMetric}
                formatter={(value, entry: any) => {
                    const { dataKey } = entry;
                    const isHidden = hiddenMetrics.includes(dataKey);
                    const label = dataKey === 'conversions' ? 'Leads' : METRIC_CONFIG[dataKey]?.label || value;
                    return (
                        <span className={`font-medium ml-1 transition-colors cursor-pointer text-sm ${isHidden ? 'text-slate-300 line-through' : 'text-slate-600'}`}>
                            {label}
                        </span>
                    );
                }}
            />
            {!isEmpty && (chartType === 'line' ? (
                <Area
                    name={metric1}
                    yAxisId="left"
                    type="monotone"
                    dataKey={metric1}
                    stroke={METRIC_CONFIG[metric1]?.color || '#8884d8'}
                    fillOpacity={1}
                    fill="url(#colorMetric1)"
                    strokeWidth={2}
                    dot={isSparse ? { r: 4, strokeWidth: 2, fill: '#fff' } : false}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    hide={hiddenMetrics.includes(metric1)}
                    animationDuration={500}
                />
            ) : (
                <Bar
                    name={metric1}
                    yAxisId="left"
                    dataKey={metric1}
                    fill={METRIC_CONFIG[metric1]?.color || '#8884d8'}
                    radius={[4, 4, 0, 0]}
                    hide={hiddenMetrics.includes(metric1)}
                    animationDuration={500}
                    barSize={40}
                />
            ))}
            {!isEmpty && metric1 !== metric2 && (
                <Line
                    name={metric2}
                    yAxisId="right"
                    type="monotone"
                    dataKey={metric2}
                    stroke={METRIC_CONFIG[metric2]?.color || '#82ca9d'}
                    strokeWidth={2}
                    dot={isSparse ? { r: 4, strokeWidth: 2, fill: '#fff' } : false}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    hide={hiddenMetrics.includes(metric2)}
                    animationDuration={500}
                />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
