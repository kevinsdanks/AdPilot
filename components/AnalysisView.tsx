
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AnalysisResult, DataRow, AnalysisLanguage, InsightObject, Dataset, AuditPoint, AdPilotJson, DeepDiveDetail, GroundingSource, CreativeAuditResult } from '../types';
import { DataTable } from './DataTable';
import { PerformanceChart } from './PerformanceChart';
import { detectCurrency, exportToCSV } from '../utils/csvHelper';
import { calculateAggregatedMetrics } from '../utils/analyticsHelper';
import { askAdPilot, analyzeDataset, analyzeAdCreative } from '../services/geminiService';
import { generateReportPDF } from '../utils/pdfExport';
import { PdfReportTemplate } from './PdfReportTemplate';
import { LiveAudioConsole } from './LiveAudioConsole';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Legend, AreaChart, Area, Label, Line
} from 'recharts';
import { 
  Activity, TrendingUp, Sparkles, Bot, Loader2, Send, ShieldCheck, ShieldAlert, ListChecks, X, Maximize2, Star, Rocket, Files, Search, Info, Calculator, RefreshCw, CheckCircle2, MessageSquare, Download, FileText, Layout, Zap, Brain, ChevronRight, Clock, Link as LinkIcon, FileDown, Mic, Target, AlertTriangle, Filter, Calendar, TrendingDown, Minus, Image as ImageIcon, Smartphone, Monitor, PlayCircle, Lightbulb, ArrowRight, PieChart as PieChartIcon, Layers
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
    value: "Total Value",
    askPlaceholder: "Ask a cross-dimensional question...",
    interface: "Senior Analyst Console",
    inquiry: "Audit Search",
    verdictType: "INTEGRATED AUDIT VERDICT",
    impactLabel: "PROJECTED IMPACT",
    expertTitle: "Expert Analysis",
    refresh: "Sync Audit",
    analyzeFiltered: "Analyze Filtered View",
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
    value: "Kopējā Vērtība",
    askPlaceholder: "Uzdodiet jautājumu par dimensijām...",
    interface: "Vecākā analītiķa saskarne",
    inquiry: "Audita meklēšana",
    verdictType: "INTEGRĒTS AUDITA SECINĀJUMS",
    impactLabel: "PROGNOZĒTĀ IETEKME",
    expertTitle: "Eksperta Analīze",
    refresh: "Atjaunot Auditu",
    analyzeFiltered: "Analizēt Nofiltrēto",
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

const DeepDiveChart: React.FC<{ config: DeepDiveDetail['chart_config']; defaultCurrency: string }> = ({ config, defaultCurrency }) => {
  if (!config || !config.data || config.data.length === 0) return null;

  const CHART_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  const formatValue = (val: number) => {
    if (config.value_format === 'currency') return val.toLocaleString(undefined, { style: 'currency', currency: defaultCurrency, maximumSignificantDigits: 3 });
    if (config.value_format === 'percent') return `${val.toFixed(1)}%`;
    if (config.unit_symbol === 'x') return `${val.toFixed(2)}x`; // ROAS
    return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toString();
  };

  return (
    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{config.title}</h4>
            <div className="flex items-center gap-2">
                {config.data.some(d => d.is_benchmark) && (
                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-slate-200"></span> Benchmark
                    </span>
                )}
            </div>
        </div>
        
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                {config.type === 'pie_chart' ? (
                    <PieChart>
                        <Pie 
                            data={config.data} 
                            cx="50%" cy="50%" 
                            innerRadius={60} 
                            outerRadius={90} 
                            paddingAngle={5} 
                            dataKey="value"
                            nameKey="label"
                        >
                            {config.data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} 
                            formatter={(val: number, name: string, props: any) => [formatValue(val), name || props.payload.label]} 
                        />
                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                    </PieChart>
                ) : config.type === 'line_chart' ? (
                    <LineChart data={config.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="label" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} 
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} 
                            tickFormatter={formatValue}
                        />
                        <Tooltip 
                            cursor={{ stroke: '#e2e8f0' }}
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} 
                            formatter={(val: number, name: string, props: any) => [formatValue(val), props.payload.label]} 
                        />
                        <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#4f46e5" 
                            strokeWidth={4} 
                            dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#4f46e5' }} 
                            activeDot={{ r: 7 }}
                        />
                    </LineChart>
                ) : (
                    <BarChart data={config.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="label" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} 
                            dy={10}
                            interval={0}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} 
                            tickFormatter={formatValue}
                        />
                        <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} 
                            formatter={(val: number, name: string, props: any) => [formatValue(val), props.payload.label]} 
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {config.data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || (entry.is_benchmark ? '#e2e8f0' : CHART_COLORS[index % CHART_COLORS.length])} />
                            ))}
                        </Bar>
                    </BarChart>
                )}
            </ResponsiveContainer>
        </div>
    </div>
  );
};

// 1. IMPROVED METRIC COLOR LOGIC
const getMetricTrendState = (key: string, trend: number) => {
    if (!trend || trend === 0) return 'neutral';
    const lowerIsBetter = ['cpa', 'cpc', 'cpm', 'costPerPurchase', 'costPerLead', 'blended cpa', 'cost_per_result', 'cost per result', 'cpl', 'cpp'];
    const higherIsBetter = ['roas', 'revenue', 'ctr', 'conversions', 'leads', 'purchases', 'results', 'impressions', 'clicks', 'total value', 'value'];
    const keyLower = key.toLowerCase();
    if (lowerIsBetter.some(k => keyLower.includes(k))) return trend < 0 ? 'good' : 'bad';
    if (higherIsBetter.some(k => keyLower.includes(k))) return trend > 0 ? 'good' : 'bad';
    return 'neutral';
};

const MetricCard: React.FC<{ metricKey: string; label: string; value: string; isPrimary?: boolean; trend?: number }> = ({ metricKey, label, value, isPrimary, trend }) => {
    const trendState = getMetricTrendState(metricKey, trend || 0);
    const trendColor = trendState === 'good' ? 'text-emerald-500' : trendState === 'bad' ? 'text-rose-500' : 'text-slate-400';
    const TrendIcon = (trend || 0) > 0 ? TrendingUp : TrendingDown;

    return (
      <div className={`bg-white p-7 rounded-[2rem] border shadow-sm flex flex-col justify-center h-full transition-all hover:shadow-md ${isPrimary ? 'border-indigo-500 ring-4 ring-indigo-500/5' : 'border-slate-200'}`}>
        <div className="text-left">
          <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${isPrimary ? 'text-indigo-700' : 'text-slate-500'}`}>{label}</span>
          <div className="text-2xl xl:text-3xl font-extrabold text-slate-900 tracking-tight mt-3 leading-none truncate">{value}</div>
          {trend !== undefined && !isNaN(trend) && Math.abs(trend) < 1000 && trend !== 0 && (
              <div className={`flex items-center gap-1 mt-3 text-[10px] font-bold ${trendColor}`}>
                  <TrendIcon className="w-3 h-3" />
                  <span>{trend > 0 ? '+' : ''}{trend.toFixed(1)}%</span>
                  <span className="text-slate-300 font-medium ml-1">vs prev</span>
              </div>
          )}
        </div>
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
  const [isAuditingCreative, setIsAuditingCreative] = useState(false);
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  
  const [filterCampaign, setFilterCampaign] = useState<string>('All Campaigns');
  
  const [dateRange, setDateRange] = useState<{ label: string, start: string, end: string }>({ 
      label: 'All Time', start: '', end: '' 
  });
  
  const prevDatasetId = useRef<string | null>(null);
  const t = translations[language];
  
  const mainData = useMemo(() => dataset.files.find(f => f.type === 'DAILY' || f.type === 'CREATIVE')?.data || dataset.files[0].data, [dataset]);
  const comparisonData = useMemo(() => dataset.comparison?.data || [], [dataset]);
  
  const dateColumn = useMemo(() => {
      if (!mainData.length) return null;
      const keys = Object.keys(mainData[0]);
      return keys.find(k => k === 'Date Start' || k === 'Date' || k === 'Day' || k === 'Starts' || k === 'Datums') || null;
  }, [mainData]);

  const currencyCode = useMemo(() => dataset.currency || detectCurrency(Object.keys(mainData[0] || {})), [dataset, mainData]);

  // 3. ROBUST CAMPAIGN FILTER EXTRACTION
  const campaigns = useMemo(() => {
     const unique = new Set<string>();
     if (mainData && mainData.length > 0) {
         mainData.forEach(row => {
            const name = row['Campaign Name'] || row['Campaign'] || row['campaign_name'] || row['campaign'] || 'Unknown';
            if (name && name !== 'Unknown') unique.add(String(name));
         });
     }
     return Array.from(unique).sort();
  }, [mainData]);

  const hasMultipleDates = useMemo(() => {
      if (!dateColumn) return false;
      const uniqueDates = new Set(mainData.map(r => String(r[dateColumn])));
      return uniqueDates.size > 1;
  }, [mainData, dateColumn]);

  useEffect(() => {
      if (hasMultipleDates && dateRange.label === 'All Time' && dataset.source === 'CSV') {
          const dates = mainData.map(r => new Date(String(r[dateColumn!]))).filter(d => !isNaN(d.getTime()));
          if (dates.length > 0) {
              const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
              const start30 = new Date(maxDate);
              start30.setDate(maxDate.getDate() - 30);
              
              setDateRange({
                  label: 'Last 30 Days',
                  start: start30.toISOString().split('T')[0],
                  end: maxDate.toISOString().split('T')[0]
              });
          }
      }
  }, [hasMultipleDates, dataset.source]);

  // General Filter Function
  const getFilteredData = (data: DataRow[]) => {
     if (!data || data.length === 0) return [];
     
     let filtered = data;
     const cols = Object.keys(data[0]);
     
     // Dynamic Column Detection for this specific file
     const fileCampaignCol = cols.find(k => /campaign/i.test(k));
     const fileDateCol = cols.find(k => /date|day|starts|laiks|datums/i.test(k));

     if (filterCampaign !== 'All Campaigns' && fileCampaignCol) {
         filtered = filtered.filter(row => {
             const val = row[fileCampaignCol];
             return String(val) === filterCampaign;
         });
     }
     
     if (dateRange.label !== 'All Time' && dateRange.start && dateRange.end && fileDateCol) {
         const start = new Date(dateRange.start);
         const end = new Date(dateRange.end);
         end.setHours(23, 59, 59, 999);
         
         filtered = filtered.filter(row => {
             const val = row[fileDateCol];
             if (!val) return true; 
             const d = new Date(String(val));
             return !isNaN(d.getTime()) && d >= start && d <= end;
         });
     }
     return filtered;
  };

  // Main filtered data for metrics
  const filteredData = useMemo(() => getFilteredData(mainData), [mainData, filterCampaign, dateRange, dateColumn]);

  // Compute Metrics based on Filtered Data
  const metrics = useMemo(() => calculateAggregatedMetrics(filteredData), [filteredData]);
  const prevMetrics = useMemo(() => calculateAggregatedMetrics(comparisonData), [comparisonData]);

  const getTrend = (current: number, prev: number) => {
      if (!prev || prev === 0) return 0;
      return ((current - prev) / prev) * 100;
  };

  const formatCurrency = (val: number) => val.toLocaleString(undefined, { style: 'currency', currency: currencyCode });

  // DYNAMIC METRIC SELECTION logic
  const displayMetrics = useMemo(() => {
    let primaryMetricKey = 'cpa';
    if (metrics.totals.revenue > 0) primaryMetricKey = 'revenue';
    else if (metrics.totals.purchases > 0) primaryMetricKey = 'purchases';
    else if (metrics.totals.leads > 0) primaryMetricKey = 'leads';
    else if (metrics.totals.roas > 0) primaryMetricKey = 'roas';

    const t = (key: keyof typeof metrics.totals) => getTrend(metrics.totals[key], prevMetrics.totals[key]);

    // Pool of available metrics with priority
    const allMetrics = [
        { key: 'spend', label: 'Total Spend', val: metrics.totals.spend, fmt: formatCurrency(metrics.totals.spend), priority: 1, trend: t('spend') },
        { key: 'conversions', label: 'Results', val: metrics.totals.conversions, fmt: metrics.totals.conversions.toLocaleString(), priority: 2, trend: t('conversions') },
        { key: 'cpa', label: 'Blended CPA', val: metrics.totals.cpa, fmt: formatCurrency(metrics.totals.cpa), priority: 3, trend: t('cpa') },
        { key: 'roas', label: 'ROAS', val: metrics.totals.roas, fmt: `${metrics.totals.roas.toFixed(2)}x`, priority: 4, trend: t('roas') },
        { key: 'ctr', label: 'CTR', val: metrics.totals.ctr, fmt: `${metrics.totals.ctr.toFixed(2)}%`, priority: 5, trend: t('ctr') },
        { key: 'cpm', label: 'CPM', val: metrics.totals.cpm, fmt: formatCurrency(metrics.totals.cpm), priority: 6, trend: t('cpm') },
        // Backups
        { key: 'cpc', label: 'CPC', val: metrics.totals.cpc, fmt: formatCurrency(metrics.totals.cpc), priority: 7, trend: t('cpc') },
        { key: 'clicks', label: 'Clicks', val: metrics.totals.clicks, fmt: metrics.totals.clicks.toLocaleString(), priority: 8, trend: t('clicks') },
        { key: 'impressions', label: 'Impressions', val: metrics.totals.impressions, fmt: metrics.totals.impressions.toLocaleString(), priority: 9, trend: 0 },
    ];

    // Priority 1: Mandatory metrics (Spend, Results) - Always show
    const mandatory = allMetrics.slice(0, 2);
    const candidates = allMetrics.slice(2);
    
    // Split remaining into Active (>0) and Inactive (0)
    const active = candidates.filter(m => m.val > 0);
    const inactive = candidates.filter(m => m.val === 0);
    
    // Reorder inactive: Put Clicks/Impressions/CPC first as better backups than 0.00x ROAS
    const prioritizedInactive = inactive.sort((a, b) => {
        const order = ['clicks', 'impressions', 'cpc', 'cpm', 'ctr', 'roas'];
        return order.indexOf(a.key) - order.indexOf(b.key);
    });

    // Combine: Mandatory -> Active -> Prioritized Inactive
    const finalOrder = [...mandatory, ...active, ...prioritizedInactive];
    
    return finalOrder.slice(0, 6).map(m => ({ ...m, isPrimary: m.key === primaryMetricKey }));
  }, [metrics, prevMetrics, formatCurrency]);

  const handleReAnalyze = async () => {
      setIsUpdating(true);
      try {
          // Send FULL filtered dataset to AI
          const filteredDataset = { ...dataset, files: dataset.files.map(f => ({ ...f, data: getFilteredData(f.data) })) };
          const res = await analyzeDataset(filteredDataset, currencyCode, language);
          setCurrentAnalysis(res);
      } catch (err) { console.error(err); } finally { setIsUpdating(false); }
  };
  
  useEffect(() => {
    if (isUpdating) {
      const interval = setInterval(() => setLoadingStep(prev => (prev + 1) % t.loadingSteps.length), 2500);
      return () => clearInterval(interval);
    }
  }, [isUpdating, t.loadingSteps.length]);

  useEffect(() => {
    const datasetId = dataset.files.map(f => f.id).join('-');
    if (prevDatasetId.current === datasetId && currentAnalysis) { setIsUpdating(false); return; }
    const runInitialAnalysis = async () => {
      setIsUpdating(true);
      try {
        const res = await analyzeDataset(dataset, currencyCode, language);
        setCurrentAnalysis(res);
        prevDatasetId.current = datasetId;
      } catch (err) { console.error(err); } finally { setIsUpdating(false); }
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
    // Slight delay to allow DOM to render if conditional logic was blocking it
    setTimeout(async () => {
        try { 
            await generateReportPDF('pdf-export-container', { accountName: dataset.name }); 
        } catch (err) { 
            console.error("PDF Export Failed:", err); 
            // Optional: You could set an error state here to show a toast to the user
        } finally { 
            setIsExporting(false); 
        }
    }, 200);
  };

  const handleSuggestedClick = (q: string) => {
    setQuestion(q);
    const input = document.getElementById('audit-search-input');
    if (input) input.focus();
  };

  const setDatePreset = (days: number | 'all' | 'month', label: string) => {
      if (days === 'all') { setDateRange({ label: 'All Time', start: '', end: '' }); return; }
      let anchorDate = new Date();
      if (dateColumn && mainData.length > 0) {
          const dates = mainData.map(r => new Date(String(r[dateColumn]))).filter(d => !isNaN(d.getTime()));
          if (dates.length > 0) { anchorDate = new Date(Math.max(...dates.map(d => d.getTime()))); }
      }
      let start = new Date(anchorDate);
      if (days === 'month') { start.setDate(1); } else { start.setDate(anchorDate.getDate() - days); }
      setDateRange({ label, start: start.toISOString().split('T')[0], end: anchorDate.toISOString().split('T')[0] });
  };

  const structured = currentAnalysis?.structuredData;
  const currentScore = structured?.score || metrics.score;
  const hasAnalysisFailed = !isUpdating && (!structured || !structured.detailed_verdict);
  const filtersActive = filterCampaign !== 'All Campaigns' || dateRange.label !== 'All Time';

  // Normalize Score Logic: Ensures Integrated Score is always displayed as 0-100 integer.
  // If AI gives 8.3 (0-10 scale), it becomes 83.
  const normalizeScore = (val: number) => {
      let num = Number(val) || 0;
      // Heuristic: If score is small (<=10), assume it's 0-10 and convert to 0-100
      if (num <= 10 && num > 0) {
          num = num * 10;
      }
      // Cap at 100 and ensure integer
      const final = Math.min(100, Math.round(num));
      
      return {
          display: final.toString(), 
          percent: final
      };
  };

  const { display: scoreDisplay, percent: scorePercent } = normalizeScore(currentScore.value);

  const PillarBar = ({ label, value, color }: { label: string, value: number, color: string }) => {
    const { percent } = normalizeScore(value);
    return (
      <div className="space-y-2 flex-1 min-w-[100px]">
         <div className="flex justify-between items-end">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">{label}</span>
            <span className="text-[10px] font-black text-slate-900 leading-none">{percent}%</span>
         </div>
         <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-1000 ${color}`} style={{ width: `${Math.min(100, percent)}%` }} />
         </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 text-left relative">
      {isLiveOpen && <LiveAudioConsole language={language} dataset={dataset} onClose={() => setIsLiveOpen(false)} />}
      
      {/* Hidden Print Container - Changed to fixed/opacity-0 for better html2canvas compatibility */}
      {/* CRITICAL FIX: Use currentAnalysis instead of analysis prop */}
      <div id="pdf-export-container" style={{ position: 'fixed', top: 0, left: 0, width: '794px', zIndex: -1000, opacity: 0, pointerEvents: 'none' }}>
          {currentAnalysis && currentAnalysis.structuredData && (
              <PdfReportTemplate dataset={dataset} analysis={currentAnalysis} metrics={metrics} currencyCode={currencyCode} />
          )}
      </div>

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
          <button onClick={handleReAnalyze} disabled={isUpdating} className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border ${filtersActive ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-500'}`}>
            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {filtersActive ? t.analyzeFiltered : t.refresh}
          </button>
        </div>
      </div>
      
      {/* Tab & Filter Bar */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 bg-white p-3 rounded-3xl border border-slate-100 shadow-sm">
         <div className="flex items-center gap-2 px-4">
            <button onClick={() => setActiveTab('overview')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>{t.overview}</button>
            <button onClick={() => setActiveTab('data')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'data' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>{t.data}</button>
         </div>
         <div className="flex flex-wrap items-center gap-4 px-4 w-full xl:w-auto">
             {campaigns.length > 0 && (
                 <div className="relative group z-20 flex-1 xl:flex-none">
                     <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                         <Filter className="w-4 h-4 text-indigo-500" />
                     </div>
                     <select
                         value={filterCampaign}
                         onChange={(e) => setFilterCampaign(e.target.value)}
                         className="pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-700 outline-none hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-sm appearance-none w-full min-w-[200px]"
                     >
                         <option value="All Campaigns">All Campaigns</option>
                         {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                     <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                         <ChevronRight className="w-3 h-3 text-slate-400 rotate-90" />
                     </div>
                 </div>
             )}
             {dateColumn && (
               <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                  {hasMultipleDates && (
                    <>
                      <button onClick={() => setDatePreset(7, 'Last 7 Days')} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${dateRange.label === 'Last 7 Days' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>7D</button>
                      <button onClick={() => setDatePreset(30, 'Last 30 Days')} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${dateRange.label === 'Last 30 Days' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>30D</button>
                      <button onClick={() => setDatePreset('all', 'All Time')} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${dateRange.label === 'All Time' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>ALL</button>
                      <div className="w-px h-6 bg-slate-200 mx-2"></div>
                    </>
                  )}
                  <div className="flex items-center gap-2">
                     <Calendar className="w-3.5 h-3.5 text-slate-400" />
                     <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value, label: 'Custom' }))} className="bg-transparent text-[10px] font-bold text-slate-600 outline-none w-20 xl:w-24" />
                     <span className="text-slate-300">-</span>
                     <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value, label: 'Custom' }))} className="bg-transparent text-[10px] font-bold text-slate-600 outline-none w-20 xl:w-24" />
                  </div>
               </div>
             )}
         </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-12 animate-in fade-in duration-700">
           {/* Score Card Section - Compact & Integrated */}
           <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden text-left">
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
               
               <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
                   {/* Integrated Score Circle */}
                   <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-[8px] border-slate-50 shadow-inner"></div>
                      <div className="absolute inset-0 rounded-full border-[8px] border-indigo-500 shadow-lg" style={{ clipPath: `inset(0 ${100 - (scorePercent || 0)}% 0 0)`, transform: 'rotate(-90deg)', transition: 'clip-path 2s cubic-bezier(0.16, 1, 0.3, 1)' }}></div>
                      <div className="flex flex-col items-center">
                        <span className="text-5xl font-black text-slate-900 leading-none">{scoreDisplay || "--"}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 leading-none">{t.scoreLabel}</span>
                      </div>
                   </div>

                   {/* Verdict Text */}
                   <div className="flex-1 space-y-4 min-w-[300px]">
                      <div className="inline-flex items-center gap-3 bg-indigo-50 text-indigo-600 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest leading-none shadow-sm">{t.verdictType}</div>
                      <h2 className="text-3xl font-black text-slate-900 leading-tight line-clamp-2">{structured?.detailed_verdict?.verdict?.headline || metrics.deterministicHeadline || "Synchronizing Dimensions..."}</h2>
                      <p className="text-lg text-slate-500 font-medium leading-relaxed line-clamp-3">{structured?.detailed_verdict?.verdict?.description || "Extracting strategic insights from multi-dimensional data sets..."}</p>
                   </div>

                   {/* Breakdown Bars */}
                   <div className="flex lg:flex-col flex-wrap gap-4 w-full lg:w-auto min-w-[200px]">
                        <PillarBar label={t.pillarNames.perf} value={currentScore.breakdown.performance} color="bg-indigo-500" />
                        <PillarBar label={t.pillarNames.deliv} value={currentScore.breakdown.delivery} color="bg-emerald-500" />
                        <PillarBar label={t.pillarNames.creative} value={currentScore.breakdown.creative} color="bg-amber-500" />
                        <PillarBar label={t.pillarNames.struct} value={currentScore.breakdown.structure} color="bg-slate-400" />
                   </div>
               </div>
           </div>

           {/* METRIC GRID - Single Row Top 6 */}
           <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
             {displayMetrics.map((m) => (
               <MetricCard key={m.key} metricKey={m.key} label={m.label} value={m.fmt} isPrimary={m.isPrimary} trend={m.trend} />
             ))}
           </div>

           {/* Analysis Pillars */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <GridColumn title={t.drivers} icon={TrendingUp} color="text-emerald-500" bgColor="bg-emerald-50/20">
                  {isUpdating ? [1,2,3].map(i => <div key={i} className="h-64 bg-white/50 border border-slate-100 rounded-[2rem] p-8 animate-pulse shadow-sm" />) : 
                    hasAnalysisFailed ? <div className="p-4 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Analysis Unavailable</div> :
                    structured?.detailed_verdict?.grid?.performance_drivers?.slice(0, 3).map((item, i) => <GridItem key={i} item={item} t={t} onClick={() => setSelectedAuditPoint(item)} />)}
                </GridColumn>
                <GridColumn title={t.risks} icon={ShieldAlert} color="text-amber-500" bgColor="bg-amber-50/20">
                  {isUpdating ? [1,2,3].map(i => <div key={i} className="h-64 bg-white/50 border border-slate-100 rounded-[2rem] p-8 animate-pulse shadow-sm" />) : 
                    hasAnalysisFailed ? <div className="p-4 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Analysis Unavailable</div> :
                    structured?.detailed_verdict?.grid?.watch_outs_risks?.slice(0, 3).map((item, i) => <GridItem key={i} item={item} t={t} onClick={() => setSelectedAuditPoint(item)} />)}
                </GridColumn>
                <GridColumn title={t.action} icon={ListChecks} color="text-indigo-500" bgColor="bg-indigo-50/20">
                  {isUpdating ? [1,2,3].map(i => <div key={i} className="h-64 bg-white/50 border border-slate-100 rounded-[2rem] p-8 animate-pulse shadow-sm" />) : 
                    hasAnalysisFailed ? <div className="p-4 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Analysis Unavailable</div> :
                    structured?.detailed_verdict?.grid?.strategic_actions?.slice(0, 3).map((item, i) => <GridItem key={i} item={item} t={t} onClick={() => setSelectedAuditPoint(item)} />)}
                </GridColumn>
           </div>
           
           {/* ... Error state ... */}
           {hasAnalysisFailed && !isUpdating && (
              <div className="bg-red-50 border border-red-100 p-8 rounded-[2rem] text-center">
                 <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                 <h3 className="text-xl font-black text-red-900 mb-2">Analysis Generation Interrupted</h3>
                 <p className="text-sm text-red-700 font-bold mb-6">The AI could not format the insights correctly for this dataset. This usually happens with extremely large files or unexpected characters.</p>
                 <button onClick={() => analyzeDataset(dataset, currencyCode, language).then(setCurrentAnalysis)} className="px-8 py-3 bg-red-600 text-white font-black rounded-xl uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-lg shadow-red-200">Retry Analysis</button>
              </div>
           )}

           {/* Performance Chart */}
           <div>
               <PerformanceChart data={metrics.trends} currency={currencyCode} goal="LEADS" />
           </div>
           
           {/* ... Chat Interface ... */}
           <div className="bg-slate-950 rounded-[4rem] p-16 md:p-20 text-white shadow-2xl relative overflow-hidden text-center border border-white/5">
             {/* ... content ... */}
             <div className="max-w-[1100px] mx-auto space-y-16">
                <div className="flex flex-col items-center gap-10">
                  <div className="inline-flex items-center gap-5 bg-white/5 border border-white/10 rounded-full px-10 py-4 text-[11px] font-black text-indigo-300 uppercase tracking-[0.2em] shadow-inner"><Bot className="w-5 h-5" /><span>{t.interface}</span></div>
                  <div className="flex items-center gap-6 bg-white/5 px-8 py-4 rounded-[2rem] border border-white/10 cursor-pointer hover:bg-white/10 transition-all shadow-lg" onClick={() => setDeepThinking(!deepThinking)}>
                    <div className={`w-14 h-8 rounded-full p-2 transition-colors ${deepThinking ? 'bg-indigo-600' : 'bg-slate-700'}`}><div className={`w-4 h-4 bg-white rounded-full transition-transform ${deepThinking ? 'translate-x-6' : ''}`} /></div>
                    <span className={`text-[11px] font-black uppercase tracking-widest ${deepThinking ? 'text-indigo-400' : 'text-slate-500'}`}>{t.deepThinking}</span>
                  </div>
                </div>
                <h2 className="text-6xl font-black tracking-tight">{t.inquiry}</h2>
                
                {/* Dynamically Generated Questions */}
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

      {/* Data Tab - UPDATED TO ITERATE ALL FILES CORRECTLY */}
      {activeTab === 'data' && (
        <div className="space-y-12 animate-in slide-in-from-bottom-6">
          {dataset.files.map((file) => (
            <div key={file.id} className="space-y-6">
              <div className="flex items-center gap-4 px-3">
                <div className="p-4 bg-slate-100 rounded-2xl shadow-sm"><Files className="w-6 h-6 text-slate-500" /></div>
                <h3 className="font-extrabold text-slate-900 text-2xl uppercase tracking-tight text-left">{file.type} DIMENSION: {file.name}</h3>
              </div>
              {/* Correctly passing specific filtered data for this file */}
              <DataTable data={getFilteredData(file.data)} />
            </div>
          ))}
        </div>
      )}

      {/* Detailed Point View Overlay (Deep Dive) - unchanged logic */}
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

    </div>
  );
};
