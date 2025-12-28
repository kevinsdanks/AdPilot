
import React from 'react';
import { AnalysisResult, Dataset, KeyMetrics, AuditPoint } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Label } from 'recharts';
import { Rocket, AlertTriangle, CheckCircle2, TrendingUp, ShieldAlert, ListChecks, ArrowRight, Layout, Info, Star, Calculator, Zap } from 'lucide-react';

interface PdfReportTemplateProps {
  dataset: Dataset;
  analysis: AnalysisResult;
  metrics: { totals: KeyMetrics; trends: any[] };
  currencyCode: string;
}

const colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];

// A4 Fixed Page Component (794px width @ 96dpi approx)
const Page: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
    <div className={`pdf-page w-[794px] min-h-[1123px] bg-white p-12 relative flex flex-col ${className}`}>
        {children}
        <div className="mt-auto pt-6 border-t border-slate-100 flex justify-between items-end text-[9px] text-slate-400 font-bold uppercase tracking-widest">
            <span>AdPilot Audit Intelligence</span>
            <span>Confidential Report</span>
        </div>
    </div>
);

// Simplified Chart for Print (Fixed Size, No Animation)
const PrintChart: React.FC<{ config: any; defaultCurrency: string }> = ({ config, defaultCurrency }) => {
  if (!config) return null;

  const formatVal = (val: number) => {
    if (config.unit_symbol) return `${val.toLocaleString()}${config.unit_symbol}`;
    if (config.value_format === 'currency') return `${val.toLocaleString()} ${defaultCurrency}`;
    if (config.value_format === 'percent') return `${val.toFixed(2)}%`;
    return val.toLocaleString();
  };

  return (
    <div className="w-full h-[250px] border border-slate-200 rounded-xl p-4 bg-white mb-4">
        <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">{config.title}</div>
        <ResponsiveContainer width="100%" height="100%">
        {config.type === 'pie_chart' ? (
          <PieChart>
            <Pie data={config.data || []} cx="50%" cy="50%" innerRadius={35} outerRadius={70} paddingAngle={2} dataKey="value" nameKey="label" isAnimationActive={false}>
              {(config.data || []).map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />)}
            </Pie>
            <Label value={config.title} position="center" style={{ fontSize: '10px', fontWeight: 'bold' }} />
          </PieChart>
        ) : config.type === 'bar_chart' || config.type === 'stacked_bar' ? (
          <BarChart data={config.data || []} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }} interval={0} angle={-15} textAnchor="end" />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }} tickFormatter={formatVal} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {(config.data || []).map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color || colors[0]} />)}
            </Bar>
          </BarChart>
        ) : (
          <LineChart data={config.data || []} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
             <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }} />
             <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }} tickFormatter={formatVal} />
             <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{ r: 3, fill: '#6366f1' }} isAnimationActive={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

// Compact "Deep Dive" Card specifically for Print Layout
const DeepDivePrintCard: React.FC<{ item: AuditPoint; currency: string }> = ({ item, currency }) => (
    <div className="mb-8 pb-8 border-b border-slate-100 last:border-0 break-inside-avoid">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
             <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${item.confidence === 'High' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <h3 className="text-xl font-black text-slate-900 leading-tight">{item.title}</h3>
             </div>
             <div className="px-3 py-1 bg-indigo-50 rounded-lg text-[9px] font-black text-indigo-700 uppercase tracking-widest border border-indigo-100">
                Impact: {item.impact}
             </div>
        </div>

        {/* Core Text */}
        <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6 pl-5 border-l-2 border-slate-200">{item.text}</p>
        
        {/* Visuals & Logic */}
        <div className="grid grid-cols-2 gap-6 mb-6">
            <PrintChart config={item.deep_dive?.chart_config} defaultCurrency={currency} />
            <div className="space-y-4">
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Analysis Logic</span>
                    <p className="text-[10px] font-mono text-indigo-600 leading-tight break-words">{item.deep_dive?.analysis_logic?.formula || "N/A"}</p>
                 </div>
                 <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Key Insight</span>
                    <p className="text-[10px] font-bold text-slate-800 leading-relaxed">{item.expert_pillars.observation}</p>
                 </div>
            </div>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-3 gap-3">
            {[
                { label: "Conclusion", text: item.expert_pillars.conclusion, color: "bg-emerald-50 text-emerald-900 border-emerald-100" },
                { label: "Justification", text: item.expert_pillars.justification, color: "bg-amber-50 text-amber-900 border-amber-100" },
                { label: "Recommendation", text: item.expert_pillars.recommendation, color: "bg-indigo-50 text-indigo-900 border-indigo-100" },
            ].map((p, i) => (
                <div key={i} className={`p-3 rounded-lg border ${p.color}`}>
                    <span className="text-[8px] font-black uppercase opacity-60 block mb-1">{p.label}</span>
                    <p className="text-[10px] font-bold leading-tight">{p.text}</p>
                </div>
            ))}
        </div>
    </div>
);

// Helper to chunk array into pages
const chunkArray = (arr: any[], size: number) => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
    );
};

export const PdfReportTemplate: React.FC<PdfReportTemplateProps> = ({ dataset, analysis, metrics, currencyCode }) => {
  const structured = analysis.structuredData;
  const score = structured?.score || { value: 0, rating: 'N/A', breakdown: { performance: 0, delivery: 0, creative: 0, structure: 0 } };

  if (!structured) return <div>No Analysis Data</div>;

  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const driversPages = chunkArray(structured.detailed_verdict.grid.performance_drivers, 2);
  const risksPages = chunkArray(structured.detailed_verdict.grid.watch_outs_risks, 2);
  const actionsPages = chunkArray(structured.detailed_verdict.grid.strategic_actions, 2);

  return (
    <div className="font-sans text-slate-900">
      
      {/* PAGE 1: EXECUTIVE SUMMARY */}
      <Page>
         <div className="flex justify-between items-start mb-12 pb-6 border-b-2 border-slate-900">
             <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-sm"><Rocket className="w-8 h-8" /></div>
                 <div>
                     <h1 className="text-4xl font-black tracking-tight text-slate-900 leading-none mb-1">Audit Report</h1>
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">{dataset.name}</p>
                 </div>
             </div>
             <div className="text-right">
                 <div className="text-sm font-black text-slate-900">{dateStr}</div>
                 <div className="text-xs font-medium text-slate-500">Currency: {currencyCode}</div>
             </div>
         </div>

         <div className="bg-slate-50 rounded-[2rem] p-10 border border-slate-200 mb-10 flex gap-10 items-center shadow-sm">
             <div className="text-center w-40 shrink-0">
                 <span className="text-7xl font-black text-indigo-600 block leading-none mb-2">{score.value}</span>
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Integrated Score</span>
             </div>
             <div className="flex-1 grid grid-cols-4 gap-4">
                  {Object.entries(score.breakdown).map(([key, val]) => (
                      <div key={key} className="space-y-2">
                          <div className="flex justify-between text-[8px] font-black uppercase text-slate-500">
                              <span>{key}</span>
                              <span>{Math.round(val as number)}%</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${val}%` }} />
                          </div>
                      </div>
                  ))}
             </div>
         </div>

         <div className="mb-12">
             <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded mb-4">Executive Verdict</div>
             <h2 className="text-3xl font-black text-slate-900 leading-tight mb-4">{structured.detailed_verdict.verdict.headline}</h2>
             <p className="text-base text-slate-600 font-medium leading-relaxed">{structured.detailed_verdict.verdict.description}</p>
         </div>

         <div className="grid grid-cols-3 gap-6 mb-10">
             <div className="p-5 bg-white border border-slate-200 rounded-2xl text-center">
                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Spend</div>
                 <div className="text-2xl font-black text-slate-900">{metrics.totals.spend.toLocaleString(undefined, { style: 'currency', currency: currencyCode })}</div>
             </div>
             <div className="p-5 bg-white border border-slate-200 rounded-2xl text-center">
                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">CPA</div>
                 <div className="text-2xl font-black text-indigo-600">{metrics.totals.cpa.toLocaleString(undefined, { style: 'currency', currency: currencyCode })}</div>
             </div>
             <div className="p-5 bg-white border border-slate-200 rounded-2xl text-center">
                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">ROAS</div>
                 <div className="text-2xl font-black text-emerald-600">{metrics.totals.roas.toFixed(2)}x</div>
             </div>
         </div>

         <div className="h-[250px] w-full border border-slate-100 rounded-2xl p-4 bg-white">
             <div className="text-[9px] font-black text-slate-400 uppercase mb-4 text-center">30-Day Performance Trend</div>
             <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={metrics.trends}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="date" hide />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
                     <Line type="monotone" dataKey="conversions" stroke="#6366f1" strokeWidth={3} dot={false} isAnimationActive={false} />
                     <Line type="monotone" dataKey="cpa" stroke="#f59e0b" strokeWidth={3} dot={false} isAnimationActive={false} />
                 </LineChart>
             </ResponsiveContainer>
         </div>
      </Page>

      {/* DRIVERS PAGES */}
      {driversPages.map((chunk, i) => (
          <Page key={`driver-page-${i}`}>
              {i === 0 && (
                  <div className="flex items-center gap-3 mb-10 pb-4 border-b-2 border-emerald-500">
                      <TrendingUp className="w-8 h-8 text-emerald-600" />
                      <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Performance Drivers</h2>
                  </div>
              )}
              {chunk.map((item, idx) => <DeepDivePrintCard key={idx} item={item} currency={currencyCode} />)}
          </Page>
      ))}

      {/* RISKS PAGES */}
      {risksPages.map((chunk, i) => (
          <Page key={`risk-page-${i}`}>
              {i === 0 && (
                  <div className="flex items-center gap-3 mb-10 pb-4 border-b-2 border-amber-500">
                      <ShieldAlert className="w-8 h-8 text-amber-600" />
                      <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Watch-outs & Risks</h2>
                  </div>
              )}
              {chunk.map((item, idx) => <DeepDivePrintCard key={idx} item={item} currency={currencyCode} />)}
          </Page>
      ))}

      {/* ACTIONS PAGES */}
      {actionsPages.map((chunk, i) => (
          <Page key={`action-page-${i}`}>
              {i === 0 && (
                  <div className="flex items-center gap-3 mb-10 pb-4 border-b-2 border-indigo-500">
                      <ListChecks className="w-8 h-8 text-indigo-600" />
                      <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Strategic Actions</h2>
                  </div>
              )}
              {chunk.map((item, idx) => <DeepDivePrintCard key={idx} item={item} currency={currencyCode} />)}
          </Page>
      ))}
    </div>
  );
};
