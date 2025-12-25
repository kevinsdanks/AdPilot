
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AnalysisResult, DataRow, AnalysisLanguage, InsightObject, Dataset, AuditPoint, AdPilotJson, DeepDiveDetail, GroundingSource } from '../types';
import { DataTable } from './DataTable';
import { PerformanceChart } from './PerformanceChart';
import { detectCurrency, exportToCSV } from '../utils/csvHelper';
import { calculateAggregatedMetrics } from '../utils/analyticsHelper';
import { askAdPilot, analyzeDataset } from '../services/geminiService';
import { generateReportPDF } from '../utils/pdfExport';
import { LiveAudioConsole } from './LiveAudioConsole';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Legend, AreaChart, Area, Label, Line
} from 'recharts';
import { 
  Activity, TrendingUp, Sparkles, Bot, Loader2, Send, ShieldCheck, ShieldAlert, ListChecks, X, Maximize2, Star, Rocket, Files, Search, Info, Calculator, RefreshCw, CheckCircle2, MessageSquare, Download, FileText, Layout, Zap, Brain, ChevronRight, Clock, Link as LinkIcon, FileDown, Mic
} from 'lucide-react';

interface AnalysisViewProps {
  dataset: Dataset;
  analysis: AnalysisResult | null;
  isAnalyzing: boolean;
  language: AnalysisLanguage;
  onLanguageChange: (lang: AnalysisLanguage) => void;
}

const translations = {
  ENG: {
    audit: "Audit Intelligence",
    overview: "Strategic View",
    data: "Raw Data",
    drivers: "Performance Drivers",
    risks: "Watch-outs & Risks",
    action: "Strategic Actions",
    spend: "Total Spend",
    leads: "Results",
    askPlaceholder: "Ask a cross-dimensional question...",
    interface: "Senior Analyst Console",
    inquiry: "Audit Search",
    verdictType: "INTEGRATED AUDIT VERDICT",
    impactLabel: "PROJECTED IMPACT",
    expertTitle: "Expert Analysis",
    refresh: "Sync Audit",
    export: "Export PDF",
    exporting: "Generating PDF...",
    scoreLabel: "Integrated Score",
    scoreDeepDive: "Score Deep Dive",
    pillarsLabel: "Strategic Pillars",
    deepThinking: "Deep Research",
    mathLabel: "Analysis Logic",
    confidence: "Statistical Confidence",
    marketSources: "Market Intelligence Sources",
    userQuestion: "Audit Inquiry:",
    liveButton: "Live Session",
    loadingSteps: ["Searching Google for 2025 benchmarks...", "Accessing Market Intelligence...", "Normalizing Auction Data...", "Synthesizing Strategic Steps...", "Finalizing Performance Audit..."],
    thinkingSteps: ["Gathering Benchmarks...", "Cross-referencing Dimensions...", "Simulating Outcomes...", "Formulating Advice...", "Finalizing..."],
    pillars: { obs: "Observation", con: "Conclusion", jus: "Justification", rec: "Recommendation" },
    pillarNames: { perf: "Performance", deliv: "Delivery", creative: "Creative", struct: "Structure" }
  },
  LV: {
    audit: "Audita Intelekts",
    overview: "Stratēģiskais Skats",
    data: "Izejdati",
    drivers: "VEIKTSPĒJAS VIRZĪTĀJI",
    risks: "UZRAUDZĪBA UN RISKI",
    action: "STRATĒĢISKĀ RĪCĪBA",
    spend: "Kopējais Spend",
    leads: "Rezultāti",
    askPlaceholder: "Uzdodiet jautājumu par dimensijām...",
    interface: "Vecākā analītiķa saskarne",
    inquiry: "Audita meklēšana",
    verdictType: "INTEGRĒTS AUDITA SECINĀJUMS",
    impactLabel: "PROGNOZĒTĀ IETEKME",
    expertTitle: "Eksperta Analīze",
    refresh: "Atjaunot Auditu",
    export: "Eksportēt PDF",
    exporting: "Ģenerē PDF...",
    scoreLabel: "Integrētais rādītājs",
    scoreDeepDive: "Skora detalizācija",
    pillarsLabel: "Stratēģiskie pīlāri",
    deepThinking: "Dziļā Izpēte",
    mathLabel: "Analīzes Loģika",
    confidence: "Statistiskā Uzticamība",
    marketSources: "Tirgus izpētes avoti",
    userQuestion: "Audita meklējums:",
    liveButton: "Live Saruna",
    loadingSteps: ["Meklējam Google pēc 2025 etaloniem...", "Piekļūstam tirgus analītikai...", "Normalizējam izsoli...", "Sintezējam stratēģiskos soļus...", "Finalizējam auditu..."],
    thinkingSteps: ["Ievācam etalonus...", "Krustojam datus...", "Simulējam rezultātus...", "Formulējam padomus...", "Gatavojam..."],
    pillars: { obs: "Pamanītais", con: "Secinājums", jus: "Pamatojums", rec: "Ieteikums" },
    pillarNames: { perf: "Sniegums", deliv: "Piegāde", creative: "Kreatīvs", struct: "Struktūra" }
  }
};

const SourceList: React.FC<{ sources?: GroundingSource[], title: string }> = ({ sources, title }) => {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-8 pt-6 border-t border-white/10">
      <div className="flex items-center gap-2 mb-4 text-[9px] font-black uppercase tracking-widest text-indigo-400">
        <Search className="w-3 h-3" /> {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, i) => (
          <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-indigo-300 transition-all">
            <LinkIcon className="w-3 h-3" /> {source.title}
          </a>
        ))}
      </div>
    </div>
  );
};

const formatMarkdown = (text: string) => {
  if (!text) return '';
  let html = text
    .replace(/^### (.*$)/gim, '<h3 class="text-3xl font-black text-white mt-12 mb-6 tracking-tight">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-4xl font-black text-white mt-14 mb-8 tracking-tighter">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-5xl font-black text-white mt-16 mb-10 tracking-tighter">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<b class="text-indigo-400 font-black">$1</b>')
    .replace(/^\* (.*$)/gim, '<li class="ml-6 mb-3 list-disc text-indigo-50 font-medium">$1</li>')
    .replace(/^\- (.*$)/gim, '<li class="ml-6 mb-3 list-disc text-indigo-50 font-medium">$1</li>')
    .replace(/\n/g, '<br />');

  html = html.replace(/(<li.*<\/li>)/gms, '<ul class="my-6">$1</ul>');
  return html;
};

const GridItem: React.FC<{ item: AuditPoint; onClick?: () => void; t: any }> = ({ item, onClick, t }) => (
  <div 
    onClick={onClick}
    className="bg-white border-slate-100 shadow-sm hover:shadow-xl px-7 py-8 rounded-[2rem] border transition-all flex flex-col group cursor-pointer relative min-h-[300px] overflow-hidden text-left"
  >
    <div className="flex justify-between items-start mb-5 shrink-0">
      <div className="flex items-center gap-2">
         <div className={`w-2 h-2 rounded-full ${item.confidence === 'High' ? 'bg-emerald-500' : item.confidence === 'Medium' ? 'bg-amber-500' : 'bg-slate-300'}`} />
         <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">{item.confidence || 'LOW'} CONFIDENCE</span>
      </div>
      <Maximize2 className="w-4 h-4 text-slate-200 group-hover:text-indigo-400 transition-colors" />
    </div>
    <div className="flex-1 space-y-4 overflow-hidden">
      <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-2">{item.title}</h4>
      <p className="text-sm text-slate-500 leading-relaxed font-medium line-clamp-6">{item.text}</p>
    </div>
    
    <div className="mt-7 pt-5 border-t border-slate-50 shrink-0">
        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-2 leading-none">{t.impactLabel}</span>
        <div className="flex items-center gap-2">
           <div className="px-3 py-2 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-center">
             <span className="text-sm font-black text-indigo-700 leading-none">{item.impact || "N/A"}</span>
           </div>
        </div>
    </div>
  </div>
);

const GridColumn: React.FC<{ title: string; icon: any; color: string; bgColor: string; children: React.ReactNode }> = ({ title, icon: Icon, color, bgColor, children }) => (
  <div className={`${bgColor} border-slate-100/50 shadow-sm rounded-[3rem] p-9 border flex flex-col h-full`}>
    <div className="flex items-center gap-4 mb-8 shrink-0">
      <div className={`p-3 rounded-2xl bg-white shadow-sm flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">{title}</h4>
    </div>
    <div className="grid grid-cols-1 gap-6 flex-grow">
      {children}
    </div>
  </div>
);

const MetricCard: React.FC<{ label: string; value: string; isPrimary?: boolean }> = ({ label, value, isPrimary }) => (
  <div className={`bg-white p-7 rounded-[2rem] border shadow-sm flex flex-col justify-center h-full transition-all hover:shadow-md ${isPrimary ? 'border-indigo-500 ring-4 ring-indigo-500/5' : 'border-slate-200'}`}>
    <div className="text-left">
      <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${isPrimary ? 'text-indigo-700' : 'text-slate-500'}`}>{label}</span>
      <div className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3 leading-none">{value}</div>
    </div>
  </div>
);

const DeepDiveChart: React.FC<{ config: DeepDiveDetail['chart_config']; defaultCurrency: string }> = ({ config, defaultCurrency }) => {
  if (!config) return null;
  
  // Robust formatter that handles the specific unit symbol logic with fallbacks
  const formatVal = (val: number) => {
    // If unit symbol exists (even if empty string provided by AI), use it.
    if (config.unit_symbol !== undefined && config.unit_symbol !== null) {
        return `${val.toLocaleString()}${config.unit_symbol}`;
    }
    
    // Fallbacks based on format type if unit symbol is missing
    if (config.value_format === 'currency') return `${val.toLocaleString()} ${defaultCurrency}`;
    if (config.value_format === 'percent') return `${val.toFixed(2)}%`;
    return val.toLocaleString();
  };
  
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 text-white p-5 rounded-2xl shadow-2xl border border-white/10 text-left backdrop-blur-md min-w-[180px]">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest border-b border-white/10 pb-2">{label}</p>
          <div className="space-y-2">
            {payload.map((p: any, i: number) => (
              <div key={i} className="flex flex-col gap-1">
                {/* Use Y-Axis Label or fallback to 'Value', never use 'value' key directly */}
                <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">{config.y_axis_label || "Value"}</span>
                <div className="flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color || p.payload.color || colors[i % colors.length] }} />
                   <span className="font-mono text-xl font-bold">{formatVal(p.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="w-full h-[450px] bg-slate-50/50 p-10 rounded-[2.5rem] border border-slate-100 relative overflow-visible">
      <div className="flex items-center gap-3 mb-8 relative z-10">
         <div className="p-2.5 bg-white rounded-xl shadow-sm text-indigo-500 border border-slate-50"><Layout className="w-4 h-4" /></div>
         <h6 className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 leading-none">{config.title || "Data Visualization"}</h6>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        {config.type === 'pie_chart' ? (
          <PieChart>
            <Pie data={config.data || []} cx="50%" cy="40%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" nameKey="label">
              {(config.data || []).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }} />
          </PieChart>
        ) : config.type === 'funnel_chart' ? (
           <BarChart layout="vertical" data={config.data || []} margin={{ left: 80, right: 80, top: 0, bottom: 20 }}>
             <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
             <XAxis type="number" hide />
             <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} width={120} />
             <Tooltip content={<CustomTooltip />} />
             <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={35} label={{ position: 'right', fontSize: 11, fontWeight: 900, fill: '#6366f1', formatter: formatVal }} />
           </BarChart>
        ) : config.type === 'stacked_bar' ? (
           <BarChart data={config.data || []} margin={{ top: 20, right: 30, left: 30, bottom: 60 }}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
             <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} tickMargin={15}>
                <Label value={config.x_axis_label} offset={-40} position="insideBottom" style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', fill: '#94a3b8', letterSpacing: '0.1em' }} />
             </XAxis>
             <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} tickFormatter={formatVal} tickMargin={10}>
                <Label value={config.y_axis_label} angle={-90} position="insideLeft" style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', fill: '#94a3b8', letterSpacing: '0.1em' }} />
             </YAxis>
             <Tooltip content={<CustomTooltip />} />
             <Bar dataKey="value" stackId="a" radius={[6, 6, 0, 0]}>
               {(config.data || []).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />)}
             </Bar>
           </BarChart>
        ) : config.type === 'bar_chart' ? (
          <BarChart data={config.data || []} margin={{ top: 20, right: 30, left: 30, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} tickMargin={15}>
               <Label value={config.x_axis_label} offset={-40} position="insideBottom" style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', fill: '#94a3b8', letterSpacing: '0.1em' }} />
            </XAxis>
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} tickFormatter={formatVal} tickMargin={10}>
               <Label value={config.y_axis_label} angle={-90} position="insideLeft" style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', fill: '#94a3b8', letterSpacing: '0.1em' }} />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
              {(config.data || []).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color || (entry.is_benchmark ? '#cbd5e1' : colors[0])} />)}
            </Bar>
          </BarChart>
        ) : (
          <LineChart data={config.data || []} margin={{ top: 20, right: 30, left: 30, bottom: 60 }}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
             <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} tickMargin={15}>
               <Label value={config.x_axis_label} offset={-40} position="insideBottom" style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', fill: '#94a3b8', letterSpacing: '0.1em' }} />
            </XAxis>
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} tickFormatter={formatVal} tickMargin={10}>
               <Label value={config.y_axis_label} angle={-90} position="insideLeft" style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', fill: '#94a3b8', letterSpacing: '0.1em' }} />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={5} dot={{ r: 5, strokeWidth: 3, fill: '#fff' }} activeDot={{ r: 8 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export const AnalysisView: React.FC<AnalysisViewProps> = ({ dataset, analysis, language, onLanguageChange, isAnalyzing }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'data'>('overview');
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(analysis);
  const [isUpdating, setIsUpdating] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [question, setQuestion] = useState('');
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState<{ text: string, sources: GroundingSource[] } | null>(null);
  const [qaHistory, setQaHistory] = useState<{ q: string, a: string, sources: GroundingSource[] }[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [deepThinking, setDeepThinking] = useState(false);
  const [selectedAuditPoint, setSelectedAuditPoint] = useState<AuditPoint | null>(null);
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const prevDatasetId = useRef<string | null>(null);

  const t = translations[language];
  const mainData = useMemo(() => dataset.files.find(f => f.type === 'DAILY')?.data || dataset.files[0].data, [dataset]);
  const currencyCode = useMemo(() => detectCurrency(Object.keys(mainData[0] || {})), [mainData]);
  const metrics = useMemo(() => calculateAggregatedMetrics(mainData), [mainData]);

  const formatCurrency = (val: number) => val.toLocaleString(undefined, { style: 'currency', currency: currencyCode });

  useEffect(() => {
    if (isUpdating) {
      const interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % t.loadingSteps.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isUpdating, t.loadingSteps.length]);

  useEffect(() => {
    if (isAsking) {
      const interval = setInterval(() => {
        setThinkingStep(prev => (prev + 1) % t.thinkingSteps.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isAsking, t.thinkingSteps.length]);

  useEffect(() => {
    const datasetId = dataset.files.map(f => f.id).join('-');
    if (prevDatasetId.current === datasetId && currentAnalysis) {
      setIsUpdating(false);
      return;
    }
    const runInitialAnalysis = async () => {
      setIsUpdating(true);
      try {
        const res = await analyzeDataset(dataset, currencyCode, language);
        setCurrentAnalysis(res);
        prevDatasetId.current = datasetId;
      } catch (err) { 
        console.error("Analysis error:", err);
      } finally { setIsUpdating(false); }
    };
    runInitialAnalysis();
  }, [dataset, currencyCode, language]);

  const handleAsk = async (forceQuestion?: string) => {
    const q = forceQuestion || question;
    if (!q.trim() || isAsking) return;
    setIsAsking(true);
    setAnswer(null);
    setActiveQuestion(q);
    try {
      const res = await askAdPilot(dataset, q, currencyCode, language, deepThinking);
      const newEntry = { q, a: res.text, sources: res.sources };
      setAnswer({ text: res.text, sources: res.sources });
      setQaHistory(prev => [...prev, newEntry]);
      setQuestion('');
    } finally { setIsAsking(false); }
  };

  const handleExport = async () => {
    if (!currentAnalysis?.structuredData || isExporting) return;
    setIsExporting(true);
    try {
      const exportIds = ['pdf-export-container'];
      await generateReportPDF(exportIds, {
        accountName: dataset.name,
        dateRange: 'Last 30 Days',
        language,
        style: 'light'
      });
    } catch (err) {
      console.error("PDF Export Error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSuggestedClick = (q: string) => {
    setQuestion(q);
    const input = document.getElementById('audit-search-input');
    if (input) input.focus();
  };

  const structured = currentAnalysis?.structuredData;
  const currentScore = structured?.score || metrics.score;

  const PillarBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className="space-y-1.5 flex-1 min-w-[120px]">
       <div className="flex justify-between items-end">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">{label}</span>
          <span className="text-[10px] font-black text-slate-900 leading-none">{Math.round(value)}%</span>
       </div>
       <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-1000 ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
       </div>
    </div>
  );

  return (
    <div className="space-y-10 text-left relative">
      {isLiveOpen && <LiveAudioConsole language={language} dataset={dataset} onClose={() => setIsLiveOpen(false)} />}
      
      <div className="flex justify-between items-end border-b border-slate-200 pb-8">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100"><Rocket className="w-6 h-6 text-white" /></div>
            <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-none">{t.audit}</h1>
          </div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 leading-none">
            <ShieldCheck className="w-4 h-4 text-indigo-500" /> SENIOR PERFORMANCE SYNC • {dataset.files.length} DIMENSIONS
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsLiveOpen(true)} className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl">
             <Mic className="w-4 h-4" /> {t.liveButton}
          </button>
          <button onClick={handleExport} disabled={isExporting || !currentAnalysis} className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl disabled:opacity-50">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} {isExporting ? t.exporting : t.export}
          </button>
          <button onClick={() => analyzeDataset(dataset, currencyCode, language).then(setCurrentAnalysis)} disabled={isUpdating} className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-500 uppercase tracking-widest hover:border-indigo-500 transition-all">
            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {t.refresh}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => setActiveTab('overview')} className={`px-12 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-100'}`}>{t.overview}</button>
        <button onClick={() => setActiveTab('data')} className={`px-12 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === 'data' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-100'}`}>{t.data}</button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-12 animate-in fade-in duration-700">
           <div className="bg-white rounded-[3rem] p-10 md:p-14 border border-slate-100 shadow-sm flex flex-col lg:flex-row items-center gap-14 relative overflow-hidden text-left">
               {isUpdating && (
                 <div className="absolute inset-0 bg-white/95 backdrop-blur-xl z-10 flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center gap-10 max-w-sm text-center">
                       <Loader2 className="w-14 h-14 text-indigo-600 animate-spin" />
                       <div className="space-y-4">
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Calibrating Audit Intelligence</p>
                          <p className="text-2xl font-black text-slate-800 leading-tight">{t.loadingSteps[loadingStep]}</p>
                       </div>
                    </div>
                 </div>
               )}
               <div className="relative w-52 h-52 shrink-0 flex items-center justify-center scale-110">
                  <div className="absolute inset-0 rounded-full border-[10px] border-slate-50 shadow-inner"></div>
                  <div className="absolute inset-0 rounded-full border-[10px] border-indigo-500 shadow-lg" style={{ clipPath: `inset(0 ${100 - (currentScore.value || 0)}% 0 0)`, transform: 'rotate(-90deg)', transition: 'clip-path 2s cubic-bezier(0.16, 1, 0.3, 1)' }}></div>
                  <div className="flex flex-col items-center">
                    <span className="text-7xl font-black text-slate-900 leading-none">{currentScore.value || "--"}</span>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-3 leading-none">{t.scoreLabel}</span>
                  </div>
               </div>
               <div className="flex-1">
                 <div className="inline-flex items-center gap-3 bg-indigo-50 text-indigo-600 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-8 leading-none shadow-sm">{t.verdictType}</div>
                 <h2 className="text-4xl font-black text-slate-900 leading-[1.15] mb-6 line-clamp-2">{structured?.detailed_verdict?.verdict?.headline || "Synchronizing Dimensions..."}</h2>
                 <p className="text-xl text-slate-500 font-medium leading-relaxed mb-10 line-clamp-3">{structured?.detailed_verdict?.verdict?.description || "Extracting strategic insights from multi-dimensional data sets..."}</p>
                 
                 <div className="flex flex-wrap items-center gap-10 py-8 border-t border-slate-50">
                    <PillarBar label={t.pillarNames.perf} value={currentScore.breakdown.performance} color="bg-indigo-500" />
                    <PillarBar label={t.pillarNames.deliv} value={currentScore.breakdown.delivery} color="bg-emerald-500" />
                    <PillarBar label={t.pillarNames.creative} value={currentScore.breakdown.creative} color="bg-amber-500" />
                    <PillarBar label={t.pillarNames.struct} value={currentScore.breakdown.structure} color="bg-slate-400" />
                 </div>

                 {structured?.sources && (
                    <div className="pt-6 flex flex-wrap gap-3 border-t border-slate-50">
                      <div className="w-full text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Search className="w-3 h-3 text-indigo-500" /> Grounded market intelligence</div>
                      {structured.sources.slice(0, 3).map((source, i) => (
                        <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-[10px] font-black text-indigo-600 rounded-xl transition-all border border-indigo-100 flex items-center gap-2 shadow-sm">
                          <LinkIcon className="w-3 h-3" /> {source.title}
                        </a>
                      ))}
                    </div>
                 )}
               </div>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
             <MetricCard label={t.spend} value={formatCurrency(metrics.totals.spend)} />
             <MetricCard label="CPA" value={formatCurrency(metrics.totals.cpa)} isPrimary />
             <MetricCard label="CPC" value={formatCurrency(metrics.totals.cpc)} />
             <MetricCard label={t.leads} value={metrics.totals.conversions.toLocaleString()} />
             <MetricCard label="CTR" value={`${metrics.totals.ctr.toFixed(2)}%`} />
             <MetricCard label="CPM" value={formatCurrency(metrics.totals.cpm)} />
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <GridColumn title={t.drivers} icon={TrendingUp} color="text-emerald-500" bgColor="bg-emerald-50/20">
                  {isUpdating ? [1,2,3].map(i => <div key={i} className="h-64 bg-white/50 border border-slate-100 rounded-[2rem] p-8 animate-pulse shadow-sm" />) : 
                    structured?.detailed_verdict?.grid?.performance_drivers?.slice(0, 3).map((item, i) => <GridItem key={i} item={item} t={t} onClick={() => setSelectedAuditPoint(item)} />)}
                </GridColumn>
                <GridColumn title={t.risks} icon={ShieldAlert} color="text-amber-500" bgColor="bg-amber-50/20">
                  {isUpdating ? [1,2,3].map(i => <div key={i} className="h-64 bg-white/50 border border-slate-100 rounded-[2rem] p-8 animate-pulse shadow-sm" />) : 
                    structured?.detailed_verdict?.grid?.watch_outs_risks?.slice(0, 3).map((item, i) => <GridItem key={i} item={item} t={t} onClick={() => setSelectedAuditPoint(item)} />)}
                </GridColumn>
                <GridColumn title={t.action} icon={ListChecks} color="text-indigo-500" bgColor="bg-indigo-50/20">
                  {isUpdating ? [1,2,3].map(i => <div key={i} className="h-64 bg-white/50 border border-slate-100 rounded-[2rem] p-8 animate-pulse shadow-sm" />) : 
                    structured?.detailed_verdict?.grid?.strategic_actions?.slice(0, 3).map((item, i) => <GridItem key={i} item={item} t={t} onClick={() => setSelectedAuditPoint(item)} />)}
                </GridColumn>
           </div>

           <PerformanceChart data={metrics.trends} currency={currencyCode} goal="LEADS" />

           <div className="bg-slate-950 rounded-[4rem] p-16 md:p-20 text-white shadow-2xl relative overflow-hidden text-center border border-white/5">
             <div className="max-w-[1100px] mx-auto space-y-16">
                <div className="flex flex-col items-center gap-10">
                  <div className="inline-flex items-center gap-5 bg-white/5 border border-white/10 rounded-full px-10 py-4 text-[11px] font-black text-indigo-300 uppercase tracking-[0.2em] shadow-inner"><Bot className="w-5 h-5" /><span>{t.interface}</span></div>
                  <div className="flex items-center gap-6 bg-white/5 px-8 py-4 rounded-[2rem] border border-white/10 cursor-pointer hover:bg-white/10 transition-all shadow-lg" onClick={() => setDeepThinking(!deepThinking)}>
                    <div className={`w-14 h-8 rounded-full p-2 transition-colors ${deepThinking ? 'bg-indigo-600' : 'bg-slate-700'}`}><div className={`w-4 h-4 bg-white rounded-full transition-transform ${deepThinking ? 'translate-x-6' : ''}`} /></div>
                    <span className={`text-[11px] font-black uppercase tracking-widest ${deepThinking ? 'text-indigo-400' : 'text-slate-500'}`}>{t.deepThinking}</span>
                  </div>
                </div>
                <h2 className="text-6xl font-black tracking-tight">{t.inquiry}</h2>
                {structured?.suggested_questions?.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-4">
                    {structured.suggested_questions.slice(0, 3).map((q, idx) => (
                      <button key={idx} onClick={() => handleSuggestedClick(q)} className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-[12px] font-bold text-indigo-300 hover:bg-white/10 transition-all shadow-sm">
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative group max-w-4xl mx-auto flex gap-4">
                  <div className="relative flex-1">
                    <input id="audit-search-input" type="text" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAsk()} placeholder={t.askPlaceholder} className="w-full bg-white/5 border border-white/10 p-10 pr-52 rounded-[3rem] text-white text-2xl outline-none focus:bg-white/10 transition-all text-left font-medium shadow-inner" />
                    <button onClick={() => handleAsk()} disabled={isAsking || !question.trim()} className="absolute right-5 top-5 bottom-5 px-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2.2rem] font-black flex items-center gap-5 disabled:opacity-50 transition-all shadow-2xl">
                      {isAsking ? <Loader2 className="animate-spin w-6 h-6" /> : <Send className="w-6 h-6" />}
                    </button>
                  </div>
                  <button onClick={() => setIsLiveOpen(true)} className="p-8 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 rounded-[3rem] border border-indigo-500/30 transition-all flex items-center justify-center shadow-xl">
                    <Mic className="w-8 h-8" />
                  </button>
                </div>
                {isAsking && (
                   <div className="flex flex-col items-center gap-10 py-12">
                      <div className="relative">
                        <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                        <Sparkles className="absolute -top-3 -right-3 w-6 h-6 text-indigo-400 animate-pulse" />
                      </div>
                      <div className="space-y-4">
                        <p className="text-2xl font-black text-indigo-100">{t.thinkingSteps[thinkingStep]}</p>
                        <p className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.3em]">Synthesizing market context & local insights</p>
                      </div>
                   </div>
                )}
                {answer && !isAsking && (
                   <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-500 text-left">
                      {activeQuestion && (
                         <div className="flex items-start gap-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/10">
                            <MessageSquare className="w-6 h-6 text-indigo-400 shrink-0 mt-1.5" />
                            <div>
                               <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-2">{t.userQuestion}</span>
                               <p className="text-2xl font-black text-indigo-100 leading-snug">{activeQuestion}</p>
                            </div>
                         </div>
                      )}
                      <div className="bg-white/[0.03] p-16 rounded-[4rem] border border-white/10 text-indigo-50 font-medium text-2xl leading-relaxed audit-answer-container shadow-2xl backdrop-blur-sm">
                         <div dangerouslySetInnerHTML={{ __html: formatMarkdown(answer.text) }} />
                         <SourceList sources={answer.sources} title={t.marketSources} />
                      </div>
                   </div>
                )}
             </div>
           </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="space-y-12 animate-in slide-in-from-bottom-6">
          {dataset.files.map((file) => (
            <div key={file.id} className="space-y-6">
              <div className="flex items-center gap-4 px-3">
                <div className="p-4 bg-slate-100 rounded-2xl shadow-sm"><Files className="w-6 h-6 text-slate-500" /></div>
                <h3 className="font-extrabold text-slate-900 text-2xl uppercase tracking-tight text-left">{file.type} DIMENSION: {file.name}</h3>
              </div>
              <DataTable data={file.data} />
            </div>
          ))}
        </div>
      )}

      <div className={`fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] transition-opacity duration-500 ${selectedAuditPoint ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSelectedAuditPoint(null)} />
      <div className={`fixed top-0 right-0 h-screen w-full md:w-[750px] bg-white z-[101] shadow-[0_0_80px_rgba(0,0,0,0.15)] transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1) transform flex flex-col ${selectedAuditPoint ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedAuditPoint && (
          <>
            <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-slate-100 p-10 flex items-center justify-between shrink-0 text-left z-20 shadow-sm">
              <div className="flex items-center gap-5">
                <div className={`w-4 h-4 rounded-full ${selectedAuditPoint.confidence === 'High' ? 'bg-emerald-500' : 'bg-amber-500'} shadow-lg ring-4 ring-slate-50`} />
                <div>
                  <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] block mb-2">{t.expertTitle} ({selectedAuditPoint.confidence})</span>
                  <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-none">{selectedAuditPoint.title}</h3>
                </div>
              </div>
              <button onClick={() => setSelectedAuditPoint(null)} className="p-4 hover:bg-slate-100 rounded-3xl text-slate-400 transition-all hover:scale-105 active:scale-95"><X className="w-10 h-10" /></button>
            </div>
            <div className="flex-grow overflow-y-auto p-12 space-y-12 custom-scrollbar text-left relative">
              {selectedAuditPoint.deep_dive?.chart_config && (
                <DeepDiveChart config={selectedAuditPoint.deep_dive.chart_config} defaultCurrency={currencyCode} />
              )}
              
              <div className="bg-slate-950 p-12 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl group border border-white/5">
                 <Calculator className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5 group-hover:scale-110 transition-transform duration-1000" />
                 <h5 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-6 relative z-10">{t.mathLabel}</h5>
                 <div className="relative z-10 space-y-6">
                    <div className="text-3xl font-black text-indigo-100 leading-tight">{selectedAuditPoint.deep_dive?.analysis_logic?.headline || "Analysis Calculation"}</div>
                    <div className="bg-white/10 p-7 rounded-[1.8rem] font-mono text-emerald-400 border border-white/5 text-lg shadow-inner">{selectedAuditPoint.deep_dive?.analysis_logic?.formula || "N/A"}</div>
                    <p className="text-slate-400 font-bold text-lg leading-relaxed">{selectedAuditPoint.deep_dive?.analysis_logic?.logic || "Detailed logic not available."}</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                 {[
                   { id: 'obs', label: t.pillars.obs, val: selectedAuditPoint.expert_pillars?.observation, icon: Info, color: 'text-indigo-500' },
                   { id: 'con', label: t.pillars.con, val: selectedAuditPoint.expert_pillars?.conclusion, icon: Star, color: 'text-emerald-500' },
                   { id: 'jus', label: t.pillars.jus, val: selectedAuditPoint.expert_pillars?.justification, icon: Calculator, color: 'text-amber-500' },
                 ].map(p => (
                   <div key={p.id} className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 hover:border-indigo-100 transition-all group shadow-sm">
                      <div className="flex items-center gap-4 mb-6">
                         <div className={`p-3 bg-white rounded-2xl shadow-sm ${p.color} border border-slate-50 transition-transform group-hover:scale-110`}><p.icon className="w-5 h-5" /></div>
                         <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">{p.label}</h5>
                      </div>
                      <p className="text-slate-800 font-extrabold text-xl leading-relaxed">{p.val || "No data available"}</p>
                   </div>
                 ))}
                 <div className="bg-indigo-600 p-14 rounded-[4rem] text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
                    <Zap className="absolute -top-10 -right-10 w-40 h-40 text-white/10 rotate-12 group-hover:scale-110 transition-transform duration-1000" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-5 mb-8">
                         <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md shadow-inner"><Zap className="w-6 h-6 text-indigo-300" /></div>
                         <h5 className="text-[11px] font-black text-indigo-200 uppercase tracking-widest leading-none">{t.pillars.rec}</h5>
                      </div>
                      <p className="font-extrabold text-3xl leading-[1.3] italic">{selectedAuditPoint.expert_pillars?.recommendation || "No recommendation available"}</p>
                    </div>
                 </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div id="pdf-export-container" className="fixed top-0 left-[-9999px] w-[1200px] bg-white text-slate-900 pointer-events-none">
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .audit-answer-container table { width: 100% !important; border-collapse: separate !important; border-spacing: 0 !important; margin: 2rem 0 !important; background: #0b1121 !important; border-radius: 2rem !important; overflow: hidden !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; }
        .audit-answer-container th { color: #ffffff !important; background: #080d1a !important; font-weight: 900 !important; text-transform: uppercase !important; font-size: 0.7rem !important; padding: 1.5rem 1rem !important; text-align: left !important; border-bottom: 2px solid rgba(255, 255, 255, 0.05) !important; }
        .audit-answer-container td { padding: 1rem 1rem !important; font-size: 0.9rem !important; color: rgba(224, 231, 255, 0.9) !important; border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important; }
        .audit-answer-container b { color: #818cf8 !important; font-weight: 900 !important; }
        .audit-answer-container p { margin-bottom: 1.5rem; }
        .audit-answer-container ul { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1.5rem; }
        .audit-answer-container li { margin-bottom: 0.8rem; }
      `}} />
    </div>
  );
};
