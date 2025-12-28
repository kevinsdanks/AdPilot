
import React from 'react';
import { AnalysisResult, Dataset, KeyMetrics, AuditPoint } from '../types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { Rocket, TrendingUp, ShieldAlert, ListChecks, Layout } from 'lucide-react';

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
const CHART_HEIGHT = 300;

// --- SUB-COMPONENTS ---

const Page: React.FC<{ children: React.ReactNode; pageNumber: number }> = ({ children, pageNumber }) => (
    <div 
        className="pdf-page bg-white relative flex flex-col"
        style={{ width: `${PAGE_WIDTH}px`, minHeight: `${PAGE_HEIGHT}px`, padding: '40px 48px' }}
    >
        <div className="flex-1">
            {children}
        </div>
        
        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-400">
                <Rocket className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-widest">AdPilot Intelligence Audit</span>
            </div>
            <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                Confidential • Page {pageNumber}
            </div>
        </div>
    </div>
);

const SectionTitle: React.FC<{ title: string; icon: any; color: string; desc: string }> = ({ title, icon: Icon, color, desc }) => (
    <div className="mb-6 border-b-2 border-slate-100 pb-4" style={{ pageBreakBefore: 'always' }}>
        <div className="flex items-center gap-3 mb-2">
            <div className={`p-2.5 rounded-xl ${color} text-white shadow-sm`}>
                <Icon className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{title}</h2>
        </div>
        <p className="text-xs font-medium text-slate-500 pl-[3rem]">{desc}</p>
    </div>
);

const PrintChart: React.FC<{ config: any; defaultCurrency: string }> = ({ config, defaultCurrency }) => {
  if (!config) return null;

  const formatVal = (val: number) => {
    // 1. Currency
    if (config.value_format === 'currency') return `${val.toLocaleString()} ${defaultCurrency}`;
    
    // 2. Percent
    if (config.value_format === 'percent') return `${val.toFixed(1)}%`;
    
    // 3. ROAS or Frequency (Unit Symbol is 'x')
    if (config.unit_symbol === 'x') return `${val.toFixed(2)}x`;
    
    // 4. Large Numbers (> 1000) -> Use 'k' notation
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    
    // 5. Default
    return val.toLocaleString();
  };

  return (
    <div className="w-full bg-white border border-slate-100 rounded-xl p-4 mb-2" style={{ height: `${CHART_HEIGHT}px` }}>
        <div className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest text-center">{config.title}</div>
        {config.type === 'pie_chart' ? (
          <PieChart width={650} height={240}>
            <Pie data={config.data || []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" nameKey="label" isAnimationActive={false}>
              {(config.data || []).map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />)}
            </Pie>
            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '10px', fontFamily: 'sans-serif' }} />
          </PieChart>
        ) : config.type === 'bar_chart' || config.type === 'stacked_bar' ? (
          <BarChart width={650} height={240} data={config.data || []} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} interval={0} angle={-10} textAnchor="end" />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} tickFormatter={formatVal} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {(config.data || []).map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color || colors[0]} />)}
            </Bar>
          </BarChart>
        ) : (
          <LineChart width={650} height={240} data={config.data || []} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
             <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
             <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} tickFormatter={formatVal} />
             <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5' }} isAnimationActive={false} />
          </LineChart>
        )}
    </div>
  );
};

const PrintCard: React.FC<{ item: AuditPoint; currency: string }> = ({ item, currency }) => {
    return (
        <div 
            className="border border-slate-200 rounded-[1rem] overflow-hidden mb-6 bg-white shadow-sm"
            style={{ 
                breakInside: 'avoid', 
                pageBreakInside: 'avoid', 
                display: 'table', 
                width: '100%',
                marginBottom: '1.5rem'
            }}
        >
            {/* Compact Header */}
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-white ${item.confidence === 'High' ? 'bg-emerald-500' : item.confidence === 'Medium' ? 'bg-amber-500' : 'bg-slate-400'}`}>
                            {item.confidence} Confidence
                        </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">{item.title}</h3>
                </div>
                
                {/* Huge Impact Metric */}
                <div className="text-right">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Projected Impact</span>
                    <span className="text-2xl font-black text-indigo-600 block leading-none">{item.impact}</span>
                </div>
            </div>

            {/* Compact Body */}
            <div className="p-5">
                <p className="text-[10px] font-medium text-slate-600 leading-relaxed mb-5 text-justify">{item.text}</p>
                
                {/* 2x2 Grid for Pillars - Replaced Icons with Shapes to prevent PDF ghosting */}
                <div className="grid grid-cols-2 gap-4 mt-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Observation
                        </span>
                        <p className="text-[10px] font-bold text-slate-700 leading-relaxed">{item.expert_pillars.observation}</p>
                    </div>
                    
                    <div className="flex flex-col">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Conclusion
                         </span>
                         <p className="text-[10px] font-bold text-slate-700 leading-relaxed">{item.expert_pillars.conclusion}</p>
                    </div>

                    <div className="flex flex-col">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                             <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Justification
                         </span>
                         <p className="text-[10px] font-bold text-slate-700 leading-relaxed">{item.expert_pillars.justification}</p>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                             <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Recommendation
                        </span>
                        <p className="text-[10px] font-bold text-indigo-900 leading-relaxed">{item.expert_pillars.recommendation}</p>
                    </div>
                </div>

                {/* Chart & Math */}
                <div className="border-t border-slate-100 pt-4 mt-4">
                    <PrintChart config={item.deep_dive?.chart_config} defaultCurrency={currency} />
                    <div className="flex items-center gap-2 mt-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-fit">
                        <Layout className="w-2.5 h-2.5 text-slate-400" />
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Logic:</span>
                        <code className="text-[9px] font-mono text-indigo-600 font-bold">{item.deep_dive?.analysis_logic?.formula}</code>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper: Chunk array for pagination (2 cards per page max)
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
  
  // Strict Pagination: 2 cards per page fits comfortably within A4 height
  const driversPages = chunkArray(structured.detailed_verdict.grid.performance_drivers, 2);
  const risksPages = chunkArray(structured.detailed_verdict.grid.watch_outs_risks, 2);
  const actionsPages = chunkArray(structured.detailed_verdict.grid.strategic_actions, 2);

  let pageCount = 1;

  return (
    <div className="font-sans text-slate-900 leading-normal">
      
      {/* PAGE 1: EXECUTIVE SUMMARY */}
      <Page pageNumber={pageCount++}>
         <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-slate-900">
             <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md"><Rocket className="w-7 h-7" /></div>
                 <div>
                     <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none mb-1">Audit Report</h1>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{dataset.name}</p>
                 </div>
             </div>
             <div className="text-right">
                 <div className="text-xs font-black text-slate-900">{dateStr}</div>
                 <div className="text-[10px] font-medium text-slate-500">Currency: {currencyCode}</div>
             </div>
         </div>

         {/* Scorecard */}
         <div className="bg-slate-50 rounded-[1.5rem] p-6 border border-slate-200 mb-8 flex gap-8 items-center">
             <div className="text-center w-32 shrink-0">
                 <span className="text-6xl font-black text-indigo-600 block leading-none mb-1">{score.value}</span>
                 {/* TYPO FIX: Ensuring INTEGRATED SCORE is correctly spelled */}
                 <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">INTEGRATED SCORE</span>
             </div>
             <div className="flex-1 grid grid-cols-2 gap-y-3 gap-x-6">
                  {Object.entries(score.breakdown).map(([key, val]) => (
                      <div key={key} className="space-y-1">
                          <div className="flex justify-between text-[9px] font-black uppercase text-slate-500 tracking-wider">
                              <span>{key}</span>
                              <span>{Math.round(val as number)}/100</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${val}%` }} />
                          </div>
                      </div>
                  ))}
             </div>
         </div>

         <div className="mb-8 p-6 bg-white border border-slate-200 rounded-[1.5rem]">
             <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded mb-3">Executive Verdict</div>
             <h2 className="text-xl font-black text-slate-900 leading-tight mb-3">{structured.detailed_verdict.verdict.headline}</h2>
             <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{structured.detailed_verdict.verdict.description}</p>
         </div>

         <div className="grid grid-cols-3 gap-3 mb-6">
             <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                 <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Spend</div>
                 <div className="text-lg font-black text-slate-900">{metrics.totals.spend.toLocaleString(undefined, { style: 'currency', currency: currencyCode })}</div>
             </div>
             <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                 <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Blended CPA</div>
                 <div className="text-lg font-black text-indigo-600">{metrics.totals.cpa.toLocaleString(undefined, { style: 'currency', currency: currencyCode })}</div>
             </div>
             <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                 <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">ROAS</div>
                 <div className="text-lg font-black text-emerald-600">{metrics.totals.roas.toFixed(2)}x</div>
             </div>
         </div>
      </Page>

      {/* DRIVERS PAGES */}
      {driversPages.map((chunk, i) => (
          <Page key={`driver-page-${i}`} pageNumber={pageCount++}>
              {i === 0 && (
                  <SectionTitle 
                    title="Performance Drivers" 
                    icon={TrendingUp} 
                    color="bg-emerald-500" 
                    desc="Core elements positively impacting the account score and efficiency." 
                  />
              )}
              {chunk.map((item, idx) => <PrintCard key={idx} item={item} currency={currencyCode} />)}
          </Page>
      ))}

      {/* RISKS PAGES */}
      {risksPages.map((chunk, i) => (
          <Page key={`risk-page-${i}`} pageNumber={pageCount++}>
              {i === 0 && (
                  <SectionTitle 
                    title="Watch-outs & Risks" 
                    icon={ShieldAlert} 
                    color="bg-amber-500" 
                    desc="Critical inefficiencies and waste areas detected in the data set." 
                  />
              )}
              {chunk.map((item, idx) => <PrintCard key={idx} item={item} currency={currencyCode} />)}
          </Page>
      ))}

      {/* ACTIONS PAGES */}
      {actionsPages.map((chunk, i) => (
          <Page key={`action-page-${i}`} pageNumber={pageCount++}>
              {i === 0 && (
                  <SectionTitle 
                    title="Strategic Actions" 
                    icon={ListChecks} 
                    color="bg-indigo-500" 
                    desc="Recommended next steps to optimize performance and scale." 
                  />
              )}
              {chunk.map((item, idx) => <PrintCard key={idx} item={item} currency={currencyCode} />)}
          </Page>
      ))}
    </div>
  );
};
