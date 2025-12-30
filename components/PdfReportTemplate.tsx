
import React from 'react';
import { AnalysisResult, Dataset, KeyMetrics, AuditPoint } from '../types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { Rocket, TrendingUp, ShieldAlert, ListChecks, Layout, Target, Zap, Activity } from 'lucide-react';

interface PdfReportTemplateProps {
  dataset: Dataset;
  analysis: AnalysisResult;
  metrics: { totals: KeyMetrics; trends: any[] };
  currencyCode: string;
}

const colors = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];

// --- CONSTANTS ---
const PAGE_WIDTH = 794; // A4 Width in px at 96 DPI
const PAGE_HEIGHT = 1123; // A4 Height in px
const CHART_HEIGHT = 320;

// --- SUB-COMPONENTS ---

const Page: React.FC<{ children: React.ReactNode; pageNumber: number }> = ({ children, pageNumber }) => (
    <div 
        className="pdf-page bg-white relative flex flex-col"
        style={{ width: `${PAGE_WIDTH}px`, minHeight: `${PAGE_HEIGHT}px`, padding: '50px 60px', boxSizing: 'border-box' }}
    >
        <div className="flex-1 flex flex-col">
            {children}
        </div>
        
        {/* Footer */}
        <div className="mt-auto pt-6 border-t border-slate-100 flex justify-between items-center text-slate-300">
            <div className="flex items-center gap-2">
                <Rocket className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase tracking-widest">AdPilot Intelligence</span>
            </div>
            <div className="text-[8px] font-bold uppercase tracking-widest">
                Page {pageNumber}
            </div>
        </div>
    </div>
);

const SectionTitle: React.FC<{ title: string; icon: any; color: string; desc: string }> = ({ title, icon: Icon, color, desc }) => (
    <div className="mb-10 pb-6 border-b-2 border-slate-50">
        <div className="flex items-center gap-4 mb-3">
            <div className={`p-3 rounded-2xl ${color} text-white shadow-sm`}>
                <Icon className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{title}</h2>
        </div>
        <p className="text-sm font-medium text-slate-500 pl-[4.5rem] leading-relaxed max-w-lg">{desc}</p>
    </div>
);

const PrintChart: React.FC<{ config: any; defaultCurrency: string }> = ({ config, defaultCurrency }) => {
  if (!config) return null;

  const formatVal = (val: number) => {
    if (config.value_format === 'currency') return `${val.toLocaleString()} ${defaultCurrency}`;
    if (config.value_format === 'percent') return `${val.toFixed(1)}%`;
    if (config.unit_symbol === 'x') return `${val.toFixed(2)}x`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toLocaleString();
  };

  return (
    <div className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4 px-2">
             <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{config.title}</div>
             <div className="flex gap-2">
                {config.data.some((d: any) => d.is_benchmark) && <span className="text-[8px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">Benchmark Included</span>}
             </div>
        </div>
        
        <div style={{ height: `${CHART_HEIGHT}px` }}>
            {config.type === 'pie_chart' ? (
            <PieChart width={600} height={CHART_HEIGHT}>
                <Pie data={config.data || []} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" nameKey="label" isAnimationActive={false}>
                {(config.data || []).map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />)}
                </Pie>
                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '10px', fontFamily: 'sans-serif', fontWeight: 600 }} />
            </PieChart>
            ) : config.type === 'bar_chart' || config.type === 'stacked_bar' ? (
            <BarChart width={600} height={CHART_HEIGHT} data={config.data || []} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} interval={0} angle={-10} textAnchor="end" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} tickFormatter={formatVal} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false} barSize={40}>
                {(config.data || []).map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color || colors[0]} />)}
                </Bar>
            </BarChart>
            ) : (
            <LineChart width={600} height={CHART_HEIGHT} data={config.data || []} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} tickFormatter={formatVal} />
                <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={4} dot={{ r: 5, fill: '#fff', stroke: '#4f46e5', strokeWidth: 2 }} isAnimationActive={false} />
            </LineChart>
            )}
        </div>
    </div>
  );
};

// Insight Page Component - One Insight Per Page
const InsightPage: React.FC<{ item: AuditPoint; currency: string; index: number; total: number; sectionTitle: string; sectionIcon: any; sectionColor: string }> = ({ item, currency, index, total, sectionTitle, sectionIcon, sectionColor }) => {
    return (
        <div className="flex flex-col h-full">
            {/* Header / Context */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${sectionColor} text-white`}>
                        <sectionIcon className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{sectionTitle}</span>
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Insight {index} of {total}</span>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white ${item.confidence === 'High' ? 'bg-emerald-500' : item.confidence === 'Medium' ? 'bg-amber-500' : 'bg-slate-400'}`}>
                    {item.confidence} Confidence
                </div>
            </div>

            {/* Main Content */}
            <div className="mb-8">
                <h3 className="text-3xl font-black text-slate-900 leading-tight mb-4">{item.title}</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed text-justify">{item.text}</p>
            </div>

            {/* Impact Badge */}
            <div className="mb-10 bg-indigo-50 border border-indigo-100 p-5 rounded-2xl inline-flex items-center gap-4">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Zap className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-0.5">Projected Impact</span>
                    <span className="text-xl font-black text-indigo-900 block leading-none">{item.impact}</span>
                </div>
            </div>

            {/* Pillars Grid */}
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Observation
                    </span>
                    <p className="text-[10px] font-bold text-slate-700 leading-relaxed">{item.expert_pillars.observation}</p>
                </div>
                <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2 block flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Conclusion
                    </span>
                    <p className="text-[10px] font-bold text-emerald-900 leading-relaxed">{item.expert_pillars.conclusion}</p>
                </div>
            </div>

            {/* Recommendation - Full Width */}
            <div className="bg-slate-900 p-6 rounded-2xl text-white mb-8 shadow-lg">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
                    <Target className="w-3 h-3" /> Recommendation
                </span>
                <p className="text-sm font-bold leading-relaxed">{item.expert_pillars.recommendation}</p>
            </div>

            {/* Chart - Pushed to bottom if space allows, otherwise flows naturally */}
            <div className="mt-auto">
                {item.deep_dive?.chart_config && (
                    <>
                        <PrintChart config={item.deep_dive.chart_config} defaultCurrency={currency} />
                        <div className="flex items-center gap-2 pl-2">
                            <Layout className="w-3 h-3 text-slate-300" />
                            <code className="text-[8px] font-mono text-slate-400">{item.deep_dive?.analysis_logic?.formula}</code>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export const PdfReportTemplate: React.FC<PdfReportTemplateProps> = ({ dataset, analysis, metrics, currencyCode }) => {
  const structured = analysis.structuredData;
  const score = structured?.score || { value: 0, rating: 'N/A', breakdown: { performance: 0, delivery: 0, creative: 0, structure: 0 } };

  if (!structured) return <div>No Analysis Data</div>;

  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // Normalization for display
  const normalizeScore = (val: number) => {
      let num = Number(val) || 0;
      // If score is small (<=10), convert to 0-100
      if (num <= 10 && num > 0) num = num * 10;
      const final = Math.min(100, Math.round(num));
      return { display: final.toString(), percent: final };
  };

  const { display: scoreDisplay } = normalizeScore(score.value);
  
  // Flatten arrays for strict 1-per-page logic
  const drivers = structured.detailed_verdict.grid.performance_drivers || [];
  const risks = structured.detailed_verdict.grid.watch_outs_risks || [];
  const actions = structured.detailed_verdict.grid.strategic_actions || [];

  let pageCount = 1;

  return (
    <div className="font-sans text-slate-900 leading-normal">
      
      {/* PAGE 1: EXECUTIVE SUMMARY */}
      <Page pageNumber={pageCount++}>
         <div className="flex justify-between items-start mb-12 pb-6 border-b-2 border-slate-900">
             <div className="flex items-center gap-5">
                 <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Rocket className="w-8 h-8" /></div>
                 <div>
                     <h1 className="text-4xl font-black tracking-tight text-slate-900 leading-none mb-2">Audit Report</h1>
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">{dataset.name}</p>
                 </div>
             </div>
             <div className="text-right">
                 <div className="text-sm font-black text-slate-900">{dateStr}</div>
                 <div className="text-[10px] font-medium text-slate-500">Currency: {currencyCode}</div>
             </div>
         </div>

         {/* Scorecard */}
         <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-200 mb-12 flex gap-12 items-center">
             <div className="text-center w-40 shrink-0">
                 <span className="text-8xl font-black text-indigo-600 block leading-none mb-2 tracking-tighter">{scoreDisplay}</span>
                 <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">INTEGRATED SCORE</span>
             </div>
             <div className="flex-1 grid grid-cols-2 gap-y-6 gap-x-10">
                  {Object.entries(score.breakdown).map(([key, val]) => {
                      const { percent } = normalizeScore(val as number);
                      return (
                          <div key={key} className="space-y-2">
                              <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  <span>{key}</span>
                                  <span>{percent}%</span>
                              </div>
                              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500" style={{ width: `${percent}%` }} />
                              </div>
                          </div>
                      );
                  })}
             </div>
         </div>

         <div className="mb-12 p-8 bg-white border-l-8 border-indigo-600 shadow-lg rounded-r-[2rem]">
             <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded mb-4">Executive Verdict</div>
             <h2 className="text-2xl font-black text-slate-900 leading-tight mb-4">{structured.detailed_verdict.verdict.headline}</h2>
             <p className="text-sm text-slate-600 font-medium leading-relaxed text-justify">{structured.detailed_verdict.verdict.description}</p>
         </div>

         <div className="grid grid-cols-3 gap-6 mt-auto">
             <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl text-center">
                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Spend</div>
                 <div className="text-2xl font-black text-slate-900">{metrics.totals.spend.toLocaleString(undefined, { style: 'currency', currency: currencyCode })}</div>
             </div>
             <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl text-center">
                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Blended CPA</div>
                 <div className="text-2xl font-black text-indigo-600">{metrics.totals.cpa.toLocaleString(undefined, { style: 'currency', currency: currencyCode })}</div>
             </div>
             <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl text-center">
                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">ROAS</div>
                 <div className="text-2xl font-black text-emerald-600">{metrics.totals.roas.toFixed(2)}x</div>
             </div>
         </div>
      </Page>

      {/* DRIVERS SEPARATOR PAGE */}
      <Page pageNumber={pageCount++}>
          <div className="h-full flex flex-col justify-center items-center text-center">
              <div className="p-8 bg-emerald-100 rounded-[3rem] text-emerald-600 mb-8 shadow-xl">
                  <TrendingUp className="w-20 h-20" />
              </div>
              <h2 className="text-5xl font-black text-slate-900 mb-6 uppercase tracking-tight">Performance Drivers</h2>
              <p className="text-xl text-slate-500 font-medium max-w-2xl">Core elements positively impacting the account score and efficiency.</p>
          </div>
      </Page>

      {/* DRIVERS INSIGHTS */}
      {drivers.map((item, idx) => (
          <Page key={`driver-${idx}`} pageNumber={pageCount++}>
              <InsightPage 
                item={item} 
                currency={currencyCode} 
                index={idx + 1} 
                total={drivers.length} 
                sectionTitle="Performance Drivers" 
                sectionIcon={TrendingUp}
                sectionColor="bg-emerald-500"
              />
          </Page>
      ))}

      {/* RISKS SEPARATOR PAGE */}
      <Page pageNumber={pageCount++}>
          <div className="h-full flex flex-col justify-center items-center text-center">
              <div className="p-8 bg-amber-100 rounded-[3rem] text-amber-600 mb-8 shadow-xl">
                  <ShieldAlert className="w-20 h-20" />
              </div>
              <h2 className="text-5xl font-black text-slate-900 mb-6 uppercase tracking-tight">Watch-outs & Risks</h2>
              <p className="text-xl text-slate-500 font-medium max-w-2xl">Critical inefficiencies and waste areas detected in the data set.</p>
          </div>
      </Page>

      {/* RISKS INSIGHTS */}
      {risks.map((item, idx) => (
          <Page key={`risk-${idx}`} pageNumber={pageCount++}>
              <InsightPage 
                item={item} 
                currency={currencyCode} 
                index={idx + 1} 
                total={risks.length} 
                sectionTitle="Watch-outs & Risks" 
                sectionIcon={ShieldAlert}
                sectionColor="bg-amber-500"
              />
          </Page>
      ))}

      {/* ACTIONS SEPARATOR PAGE */}
      <Page pageNumber={pageCount++}>
          <div className="h-full flex flex-col justify-center items-center text-center">
              <div className="p-8 bg-indigo-100 rounded-[3rem] text-indigo-600 mb-8 shadow-xl">
                  <ListChecks className="w-20 h-20" />
              </div>
              <h2 className="text-5xl font-black text-slate-900 mb-6 uppercase tracking-tight">Strategic Actions</h2>
              <p className="text-xl text-slate-500 font-medium max-w-2xl">Recommended next steps to optimize performance and scale.</p>
          </div>
      </Page>

      {/* ACTIONS INSIGHTS */}
      {actions.map((item, idx) => (
          <Page key={`action-${idx}`} pageNumber={pageCount++}>
              <InsightPage 
                item={item} 
                currency={currencyCode} 
                index={idx + 1} 
                total={actions.length} 
                sectionTitle="Strategic Actions" 
                sectionIcon={ListChecks}
                sectionColor="bg-indigo-500"
              />
          </Page>
      ))}
    </div>
  );
};
