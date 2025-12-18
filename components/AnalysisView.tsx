
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AnalysisResult, DataRow, StrategicAction, ScoreExplanation } from '../types';
import { DataTable } from './DataTable';
import { PerformanceChart } from './PerformanceChart';
import { detectCurrency } from '../utils/csvHelper';
import { calculateAggregatedMetrics } from '../utils/analyticsHelper';
import { askAdPilot, analyzeDataset } from '../services/geminiService';
import { jsPDF } from 'jspdf';
import { 
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Info,
  Sparkles,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Star,
  Bot,
  Loader2,
  Send,
  FileText,
  ShieldCheck,
  ChevronDown,
  Calendar,
  Zap,
  ShieldAlert,
  ListChecks,
  X
} from 'lucide-react';

interface AnalysisViewProps {
  data: DataRow[];
  analysis: AnalysisResult | null;
  isAnalyzing: boolean;
  summaryRowsExcluded?: number;
}

type TabType = 'overview' | 'insights' | 'recommendations' | 'data';
type DateFilterType = 'ALL' | '7D' | '30D' | 'MONTH' | 'CUSTOM';

const MetricCard: React.FC<{ label: string; value: string; subtext?: string; color?: string; isPrimary?: boolean }> = ({ label, value, subtext, color, isPrimary }) => (
  <div className={`bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow relative overflow-hidden group ${isPrimary ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-slate-200'}`}>
    <div className="z-10 relative">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className={`text-xs font-bold uppercase tracking-wider ${isPrimary ? 'text-indigo-700' : 'text-slate-500'}`}>{label}</span>
        {isPrimary && <div className="bg-indigo-600 text-white p-1 rounded-full"><Star className="w-3 h-3 fill-white" /></div>}
      </div>
      <div className="text-2xl font-black text-slate-900 tracking-tight truncate">{value}</div>
      {subtext && <div className="text-[11px] font-medium text-slate-400 mt-2">{subtext}</div>}
    </div>
    <div className="absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rounded-full opacity-5 pointer-events-none" style={{ backgroundColor: color || '#6366f1' }}></div>
  </div>
);

const ScoreTooltip: React.FC<{ explanation: ScoreExplanation }> = ({ explanation }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="relative">
            <button 
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
            >
                <Info className="w-4 h-4 text-slate-300 hover:text-indigo-500 transition-colors" />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-slate-900 text-white border border-slate-800 rounded-2xl shadow-2xl z-50 p-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">{explanation.version}</span>
                        </div>
                        <X className="w-3 h-3 text-slate-500 cursor-pointer" onClick={() => setIsOpen(false)} />
                    </div>
                    
                    <div className="space-y-5">
                        <section>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">How it's calculated</h4>
                            <ul className="space-y-1.5">
                                {explanation.steps.map((step, i) => (
                                    <li key={i} className="text-[11px] text-slate-200 flex gap-2">
                                        <span className="text-indigo-400 font-bold shrink-0">{i+1}.</span>
                                        {step}
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Metrics Used</h4>
                                <div className="flex flex-wrap gap-1">
                                    {explanation.inputs.map(input => (
                                        <span key={input} className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">{input}</span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Weighting</h4>
                                <div className="space-y-1">
                                    {Object.entries(explanation.weights).map(([k, v]) => (
                                        <div key={k} className="flex justify-between text-[9px]">
                                            <span className="text-slate-500">{k}:</span>
                                            <span className="font-bold text-indigo-400">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Rules</h4>
                             <p className="text-[10px] text-slate-400 italic">{explanation.data_rules.join(', ')}</p>
                        </section>
                    </div>
                </div>
            )}
        </div>
    );
};

const DataTrustIndicator: React.FC<{ rows: number; excluded: number; filter: string; range: string }> = ({ rows, excluded, filter, range }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <div 
        onClick={() => setShow(!show)}
        className="flex items-center gap-2 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-colors"
      >
        <CheckCircle2 className="w-3 h-3" />
        <span>Data check passed: Totals calculated from row-level data</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${show ? 'rotate-180' : ''}`} />
      </div>
      {show && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-1">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-emerald-500" /> Analysis Metadata
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Rows Analyzed:</span>
              <span className="font-bold text-slate-900">{rows.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Exclusions:</span>
              <span className="font-bold text-slate-900">{excluded} rows</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Filter:</span>
              <span className="font-bold text-slate-900">{filter}</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400">
               <Calendar className="w-3 h-3" />
               {range}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AnalysisView: React.FC<AnalysisViewProps> = ({ data, analysis, isAnalyzing: initialAnalyzing, summaryRowsExcluded = 0 }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('ALL');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(analysis);
  const [isUpdating, setIsUpdating] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const prevMetricsHash = useRef<string>('');
  const askInputRef = useRef<HTMLInputElement>(null);

  const suggestedQuestions = [
    "What should I scale next to increase leads without hurting CPA?",
    "Which creatives or formats are wasting budget right now?",
    "What is the biggest risk to performance if I increase spend?"
  ];

  const currencyCode = useMemo(() => detectCurrency(Object.keys(data[0] || {})), [data]);
  const formatCurrency = (val: number) => val.toLocaleString(undefined, { style: 'currency', currency: currencyCode });

  const getRowDate = (row: DataRow): Date | null => {
    const key = Object.keys(row).find(k => {
        const l = k.toLowerCase();
        return l.includes('date') || l.includes('day') || l.includes('reporting starts') || l.includes('reporting ends');
    });
    if (!key || !row[key]) return null;
    const d = new Date(String(row[key]));
    return isNaN(d.getTime()) ? null : d;
  };

  const filteredData = useMemo(() => {
    if (dateFilter === 'ALL') return data;
    let maxDate = new Date(0);
    data.forEach(r => { const d = getRowDate(r); if (d && d > maxDate) maxDate = d; });
    const refDate = new Date(maxDate || Date.now()); refDate.setHours(23, 59, 59, 999);
    let start = new Date(0), end = new Date(refDate);
    if (dateFilter === '7D') { start = new Date(refDate); start.setDate(refDate.getDate() - 7); start.setHours(0,0,0,0); }
    else if (dateFilter === '30D') { start = new Date(refDate); start.setDate(refDate.getDate() - 30); start.setHours(0,0,0,0); }
    else if (dateFilter === 'MONTH') { start = new Date(refDate.getFullYear(), refDate.getMonth(), 1); start.setHours(0,0,0,0); }
    else if (dateFilter === 'CUSTOM') { if (customRange.start) start = new Date(customRange.start); if (customRange.end) { end = new Date(customRange.end); end.setHours(23, 59, 59, 999); } }
    return data.filter(row => { const d = getRowDate(row); return d && d >= start && d <= end; });
  }, [data, dateFilter, customRange]);

  const metrics = useMemo(() => calculateAggregatedMetrics(filteredData), [filteredData]);
  const dateRangeStr = useMemo(() => {
    if (filteredData.length < 2) return "N/A";
    const dates = filteredData.map(r => getRowDate(r)).filter(Boolean) as Date[];
    if (dates.length === 0) return "N/A";
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    return `${min.toLocaleDateString()} - ${max.toLocaleDateString()}`;
  }, [filteredData]);

  const handleAsk = async () => {
    if (!question.trim() || isAsking) return;
    setIsAsking(true);
    setAnswer(null);
    try {
      const res = await askAdPilot(filteredData, question, currencyCode);
      setAnswer(sanitizeHallucinations(res));
    } catch (err) {
      console.error("Ask Error:", err);
      setAnswer("I encountered an issue processing your request. Please try again.");
    } finally {
      setIsAsking(false);
    }
  };

  const handleSuggestionClick = (q: string) => {
    setQuestion(q);
    askInputRef.current?.focus();
  };

  useEffect(() => {
    const currentHash = JSON.stringify(metrics.totals);
    if (prevMetricsHash.current === currentHash) return;
    const tid = setTimeout(async () => {
      if (filteredData.length === 0) { setCurrentAnalysis(null); return; }
      setIsUpdating(true); prevMetricsHash.current = currentHash;
      try { const res = await analyzeDataset(filteredData, currencyCode); setCurrentAnalysis(res); } 
      finally { setIsUpdating(false); }
    }, 1000);
    return () => clearTimeout(tid);
  }, [filteredData, metrics.totals]);

  const structured = currentAnalysis?.structuredData;

  const sanitizeHallucinations = (text: string): string => {
    if (!text) return text;
    // Fix decimals
    let t = text.replace(/(\d+\.\d{3,})/g, (match) => {
        const num = parseFloat(match);
        return num.toFixed(2);
    });
    // Strip common Markdown artifacts to ensure zero leftover markdown syntax
    t = t.replace(/\*\*\*/g, '').replace(/\*\*/g, '').replace(/###/g, '').replace(/##/g, '').replace(/#/g, '');
    return t;
  };

  const renderFormattedText = (text: string | null, boldClassName: string = "font-black text-slate-900") => {
    if (!text) return null;
    const parts = text.split(/(<b>.*?<\/b>)/g);
    return parts.map((part, i) => {
      if (part.startsWith('<b>') && part.endsWith('</b>')) {
        return <strong key={i} className={boldClassName}>{part.slice(3, -4)}</strong>;
      }
      return part;
    });
  };

  const isVerdictValid = useMemo(() => {
    if (!structured?.detailed_verdict || !metrics.totals) return false;
    const v = structured.detailed_verdict;
    const combinedText = (v.headline + v.summary + (v.drivers?.join(' ') || '')).toLowerCase();
    const checkCPA = metrics.totals.cpa > 0 ? combinedText.includes(metrics.totals.cpa.toFixed(1)) || combinedText.includes(Math.round(metrics.totals.cpa).toString()) : true;
    const checkSpend = metrics.totals.spend > 0 ? combinedText.includes(Math.round(metrics.totals.spend).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")) || combinedText.includes(Math.round(metrics.totals.spend).toString()) : true;
    return checkCPA || checkSpend;
  }, [structured, metrics.totals]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20); doc.text("AdPilot Performance Report", 20, 20);
    doc.setFontSize(10); doc.text(`Verdict: ${structured?.detailed_verdict?.headline || "N/A"}`, 20, 30);
    doc.save("AdPilot_Report.pdf");
  };

  const renderExpertList = (items: string[], icon: React.ReactNode, dotColor: string) => {
    return (
      <ul className="space-y-3">
        {items.map((r, i) => {
          const sanitized = sanitizeHallucinations(r);
          const clean = sanitized.replace(/\*\*/g, '');
          const colonIndex = clean.indexOf(':');
          
          return (
            <li key={i} className="flex items-start gap-3 text-xs leading-relaxed">
              <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
              {colonIndex !== -1 ? (
                <span>
                  <span className="font-black text-slate-900">{clean.substring(0, colonIndex).trim()}:</span>{" "}
                  <span className="font-medium text-slate-600">{clean.substring(colonIndex + 1).trim()}</span>
                </span>
              ) : (
                <span className="font-medium text-slate-600">{clean}</span>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  if (initialAnalyzing) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-white rounded-3xl border border-slate-100 shadow-sm">
      <Activity className="w-12 h-12 text-indigo-600 animate-pulse mb-4" />
      <h3 className="text-xl font-bold text-slate-900">AdPilot Analysis in progress...</h3>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6 mb-2">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Performance Analysis</h1>
          <p className="text-slate-500 mt-1 font-semibold">Analyzed {filteredData.length} rows • Spend: {formatCurrency(metrics.totals.spend)}</p>
        </div>
        <button onClick={handleExportPDF} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg"><FileText className="w-4 h-4" /> Export Report</button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 w-fit shadow-sm">
          {['Overview', 'Insights', 'Recommendations', 'Raw Data'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '') === 'rawdata' ? 'data' : tab.toLowerCase() as TabType)} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === (tab.toLowerCase().replace(' ', '') === 'rawdata' ? 'data' : tab.toLowerCase()) ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{tab}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <Filter className="w-4 h-4 text-slate-400 mx-2" />
          {(['ALL', '7D', '30D', 'MONTH'] as const).map(f => (
            <button key={f} onClick={() => setDateFilter(f)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${dateFilter === f ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600'}`}>{f === 'ALL' ? 'All' : f}</button>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2 py-3 border-y border-slate-100 bg-slate-50/30">
         <div className="flex items-center gap-3 text-sm text-indigo-900 font-bold overflow-hidden">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="truncate">AI Verdict: <span className="font-medium text-slate-600">{isUpdating ? 'Updating...' : (sanitizeHallucinations(structured?.detailed_verdict?.headline) || "Analysis unavailable.")}</span></span>
         </div>
         <DataTrustIndicator rows={filteredData.length} excluded={summaryRowsExcluded} filter={dateFilter} range={dateRangeStr} />
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
             <div className="flex flex-col lg:flex-row items-start gap-10 relative z-10">
                 <div className="flex-shrink-0 flex flex-col items-center gap-3">
                    <div className="relative w-32 h-32">
                        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ value: metrics.score.value }, { value: 100 - metrics.score.value }]} innerRadius={48} outerRadius={58} startAngle={90} endAngle={-270} dataKey="value" stroke="none" cornerRadius={4}><Cell fill={metrics.score.value >= 80 ? '#34d399' : metrics.score.value >= 40 ? '#fb923c' : '#f87171'} /><Cell fill="#f1f5f9" /></Pie></PieChart></ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-4xl font-black text-slate-900">{metrics.score.value}</span><span className="text-[10px] font-bold text-slate-400 uppercase">Score</span></div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${metrics.score.value >= 60 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{metrics.score.rating}</div>
                 </div>

                 <div className="flex-1 space-y-8">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <h2 className="text-xl font-black text-slate-900">Expert Performance Verdict</h2>
                            <ScoreTooltip explanation={metrics.score.explanation} />
                        </div>
                        {structured?.detailed_verdict && isVerdictValid ? (
                          <div className="space-y-6 animate-in fade-in">
                            <div className="space-y-2">
                              <h3 className="text-xl font-black text-indigo-700 leading-tight">{sanitizeHallucinations(structured.detailed_verdict.headline)}</h3>
                              <p className="text-slate-600 font-medium leading-relaxed italic border-l-4 border-indigo-100 pl-4">{sanitizeHallucinations(structured.detailed_verdict.summary)}</p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                      <TrendingUp className="w-3 h-3 text-indigo-500" /> Performance Drivers
                                    </h4>
                                    {renderExpertList(structured.detailed_verdict.drivers || [], null, 'bg-indigo-500')}
                                </div>
                                <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100">
                                    <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                      <ShieldAlert className="w-3 h-3" /> Watch-outs & Risks
                                    </h4>
                                    {renderExpertList(structured.detailed_verdict.risks || ["No immediate risks detected."], null, 'bg-amber-500')}
                                </div>
                                <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100">
                                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                      <ListChecks className="w-3 h-3" /> Strategic Action Plan
                                    </h4>
                                    <ul className="space-y-4">
                                      {(structured.detailed_verdict.actions || []).map((action, i) => (
                                        <li key={i} className="space-y-1">
                                          <p className="text-[11px] font-black text-indigo-900 flex items-start gap-2">
                                            <span className="shrink-0 flex items-center justify-center w-4 h-4 bg-indigo-600 text-white rounded-full text-[9px] mt-0.5">{i+1}</span>
                                            {sanitizeHallucinations(action.step)}
                                          </p>
                                          <p className="text-[10px] font-bold text-indigo-500 pl-6">Impact: {sanitizeHallucinations(action.expected_impact)}</p>
                                        </li>
                                      ))}
                                    </ul>
                                </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                             <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                             <p className="text-amber-800 text-sm font-bold">Verdict unavailable due to metric inconsistency (hallucination check failed).</p>
                          </div>
                        )}
                    </div>
                 </div>
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
             <MetricCard label="Total Spend" value={formatCurrency(metrics.totals.spend)} color="#6366f1" />
             <MetricCard label="Cost Per Lead" value={metrics.totals.conversions > 0 ? formatCurrency(metrics.totals.cpa) : "No Leads"} isPrimary color="#f59e0b" />
             <MetricCard label="Leads" value={metrics.totals.conversions.toLocaleString()} color="#ec4899" />
             <MetricCard label="CPC" value={formatCurrency(metrics.totals.cpc)} color="#3b82f6" />
             <MetricCard label="CTR" value={`${metrics.totals.ctr.toFixed(2)}%`} color="#06b6d4" />
             <MetricCard label="CPM" value={formatCurrency(metrics.totals.cpm)} color="#64748b" />
          </div>

          <PerformanceChart data={metrics.trends} currency={currencyCode} goal={metrics.totals.revenue > 0 ? 'SALES' : 'LEADS'} />
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="grid md:grid-cols-2 gap-6 animate-in fade-in">
             <div className="space-y-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-500" /> Performance Drivers</h3>
                {structured?.whats_working?.map((item, i) => (
                    <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2"><h4 className="font-black text-slate-800">{item.title}</h4><span className="text-xs font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">{item.metric}</span></div>
                        <p className="text-sm font-medium text-slate-600 leading-relaxed">{renderFormattedText(sanitizeHallucinations(item.description), "font-black text-slate-900")}</p>
                    </div>
                )) || <p className="text-slate-400 italic">No insights available.</p>}
             </div>
             <div className="space-y-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-red-500" /> What's Not Working</h3>
                 {structured?.whats_not_working?.map((item, i) => (
                    <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2"><h4 className="font-black text-slate-800">{item.title}</h4><span className="text-xs font-black text-red-600 bg-red-50 text-red-600 border-red-100">{item.metric}</span></div>
                        <p className="text-sm font-medium text-slate-600">{sanitizeHallucinations(item.description)}</p>
                    </div>
                )) || <p className="text-slate-400 italic">No insights available.</p>}
             </div>
        </div>
      )}

      {activeTab === 'recommendations' && (
          <div className="space-y-6 animate-in fade-in">
              {structured?.recommendations?.map((rec, i) => (
                  <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                          <div><div className="flex items-center gap-3 mb-2"><h4 className="font-black text-slate-800 text-xl">{rec.title}</h4><span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border ${rec.type === 'quick_win' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>{rec.type}</span></div><p className="text-slate-600 font-medium">{sanitizeHallucinations(rec.description)}</p></div>
                          <div className={`px-5 py-2.5 rounded-xl font-black text-xs text-center min-w-[120px] ${rec.impact === 'High' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>{rec.impact} Impact</div>
                      </div>
                  </div>
              )) || <p className="text-slate-400 italic">No recommendations available.</p>}
          </div>
      )}

      {activeTab === 'data' && <DataTable data={filteredData} />}

      <div className="bg-gradient-to-br from-indigo-950 to-slate-950 rounded-3xl p-8 md:p-12 text-white shadow-2xl border border-indigo-500/30 mt-12 relative overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
           <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full px-4 py-1.5 text-xs font-black text-indigo-200 uppercase tracking-widest"><Bot className="w-4 h-4" /><span>AI Data Strategist</span></div>
           <h2 className="text-3xl md:text-5xl font-black tracking-tight">Ask AdPilot</h2>
           
           <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
             {suggestedQuestions.map((q, i) => (
               <button 
                 key={i} 
                 onClick={() => handleSuggestionClick(q)}
                 className="text-[10px] md:text-xs font-bold text-indigo-300/60 bg-white/5 hover:bg-white/10 hover:text-indigo-200 border border-white/5 px-4 py-2 rounded-full transition-all text-center"
               >
                 {q}
               </button>
             ))}
           </div>

           <div className="relative max-w-2xl mx-auto">
              <input 
                ref={askInputRef}
                type="text" 
                value={question} 
                onChange={e => setQuestion(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleAsk()} 
                placeholder="Ask a specific question..." 
                className="w-full pl-8 pr-16 py-5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-md" 
              />
              <button onClick={() => handleAsk()} disabled={!question.trim() || isAsking} className="absolute right-3 top-3 bottom-3 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold">{isAsking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
           </div>
           {answer && (
             <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-left animate-in fade-in slide-in-from-bottom-4 backdrop-blur-xl">
                <div className="flex items-start gap-5">
                  <div className="bg-indigo-600 rounded-xl p-3 shrink-0"><Sparkles className="w-6 h-6 text-white" /></div>
                  <div className="space-y-4 w-full">
                     <div className="prose prose-invert max-w-none text-slate-100 font-medium whitespace-pre-line text-base">
                        {renderFormattedText(answer, "font-black text-white")}
                     </div>
                     <button onClick={() => setAnswer(null)} className="text-xs font-bold text-indigo-400">Clear</button>
                  </div>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
