
import React from 'react';
import { SimulationResult, SimulationInputs, AnalysisLanguage, GroundingSource } from '../types';
import { 
  CheckCircle2, Target, Users, TrendingUp, Sparkles, RefreshCw, 
  ArrowRight, FileText, LayoutDashboard, Settings2, Info,
  Calculator, ListChecks, ArrowUpRight, ShieldCheck, Zap,
  Rocket, Search, Link as LinkIcon, Compass, PieChart, TrendingDown,
  Activity, Layout, Calendar, Layers, ShieldAlert, BarChart3, Star, Lightbulb,
  Brain, AlertTriangle, Gauge, Flag, MousePointer2, ShieldX, GitCommit, Scale,
  X,
  Loader2,
  HelpCircle
} from 'lucide-react';

interface SimulationResultsProps {
  result: SimulationResult;
  inputs: SimulationInputs;
  onTweak: (newInputs: SimulationInputs) => void;
  onViewAudit: () => void;
  language: AnalysisLanguage;
  isUpdating: boolean;
}

const SectionHeader: React.FC<{ title: string; icon: any; color: string }> = ({ title, icon: Icon, color }) => (
  <div className="flex items-center gap-4 mb-8">
    <div className={`p-4 rounded-[1.8rem] bg-white border border-slate-100 shadow-sm ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`bg-white border border-slate-200 rounded-[3.5rem] p-10 md:p-14 shadow-sm hover:shadow-md transition-shadow duration-500 ${className}`}>
    {children}
  </div>
);

const SourceList: React.FC<{ sources?: GroundingSource[], title: string }> = ({ sources, title }) => {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-12 pt-8 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
        <Search className="w-3 h-3 text-indigo-500" /> {title}
      </div>
      <div className="flex flex-wrap gap-3">
        {sources.map((source, i) => (
          <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-2xl text-xs font-bold text-indigo-600 transition-all">
            <LinkIcon className="w-3 h-3" /> {source.title}
          </a>
        ))}
      </div>
    </div>
  );
};

export const SimulationResults: React.FC<SimulationResultsProps> = ({ result, inputs, onTweak, onViewAudit, language, isUpdating }) => {
  const t = language === 'LV' ? {
    execSummary: 'Izpildkopsavilkums',
    marketIntel: 'Tirgus un pieprasījuma analīze',
    strategy: 'Stratēģiskā arhitektūra',
    channels: 'Kanālu sadalījums',
    forecast: 'KPI prognožu scenāriji',
    creative: 'Radošā komunikācija',
    roadmap: '30 dienu optimizācijas ceļvedis',
    viewDashboard: 'Atvērt sinhronizācijas konsoli',
    sources: 'Tirgus izpētes avoti',
    logic: 'Campaign Architecture',
    verdict: 'Stratēģiskais Verdikts',
    outcome: 'Modelētais Sagaidāmais Rezultāts',
    soWhat: 'Biznesa interpretācija',
    disclaimer: 'Piezīme: Tirgus etaloni atspoguļo tipisku veiktspēju, nevis garantētus rezultātus.',
    confidence: 'Uzticamība',
    intentSplit: 'Search Intent Split',
    successCriteria: 'Veiksmes kritēriji',
    marketAvgs: 'Tirgus etaloni',
    highIntent: 'Augsts nodoms',
    midIntent: 'Vidējs nodoms',
    infoIntent: 'Informatīvs',
    guardrails: 'Komunikācijas aizliegumi',
    decision: 'Lēmuma punkts',
    implication: 'Implication',
    launchConsole: 'Palaist Konsoli'
  } : {
    execSummary: 'Executive Summary',
    marketIntel: 'Market & Demand Intelligence',
    strategy: 'Strategic Architecture',
    channels: 'Channel Breakdown',
    forecast: 'KPI Forecast Scenarios',
    creative: 'Creative & Messaging Strategy',
    roadmap: '30-Day Optimization Roadmap',
    viewDashboard: 'Launch Sync Console',
    sources: 'Market Research Sources',
    logic: 'Campaign Architecture',
    verdict: 'Strategic Verdict',
    outcome: 'Modelled Expected Outcome',
    soWhat: 'The "So What?" Interpretation',
    disclaimer: 'Note: Benchmarks represent typical performance, not guaranteed outcomes.',
    confidence: 'Confidence',
    intentSplit: 'Search Intent Split',
    successCriteria: 'Success Criteria',
    marketAvgs: 'Market Benchmarks',
    highIntent: 'High Intent',
    midIntent: 'Mid Intent',
    infoIntent: 'Informational',
    guardrails: 'Messaging Guardrails',
    decision: 'Decision Point',
    implication: 'Implication',
    launchConsole: 'Launch Full Sync Console'
  };

  const isRecruitment = inputs.product.toLowerCase().includes('job') || inputs.product.toLowerCase().includes('hiring') || inputs.goal.includes('Leads');
  const appLabel = isRecruitment ? 'Applications' : 'Conversions';

  if (!result || !result.executive_summary) {
    return (
       <div className="flex items-center justify-center p-20 bg-white rounded-[3rem] border border-slate-200">
         <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
       </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-12 animate-in fade-in duration-1000 pb-20 text-left">
      {/* Sidebar Info */}
      <div className="w-full lg:w-96 shrink-0">
        <div className="sticky top-10 space-y-6">
          <div className="bg-white rounded-[3rem] p-8 shadow-xl relative overflow-hidden group border border-slate-200">
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 border border-indigo-100">
                <ShieldCheck className="w-4 h-4" /> Market-Grounded Strategy
              </div>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Benchmarks derived from <b>Latvia {isRecruitment ? 'recruitment' : ''} auction signals</b> and job-seeker intent patterns.
              </p>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center group/conf relative cursor-help">
                 <span className="text-[10px] font-black uppercase text-slate-400">{t.confidence}</span>
                 <span className="text-xs font-black text-indigo-600 border-b border-dotted border-indigo-300">{result.strategic_approach?.confidence_score || 'Medium-High'}</span>
                 
                 <div className="absolute bottom-full left-0 mb-2 w-48 bg-slate-900 text-white p-3 rounded-xl text-[10px] opacity-0 group-hover/conf:opacity-100 transition-opacity pointer-events-none z-20">
                    Confidence calculated based on keyword volume density, historical auction variance, and benchmark coverage.
                 </div>
              </div>
            </div>
          </div>
          
          <button onClick={onViewAudit} className="w-full py-5 bg-slate-900 text-white font-black rounded-[2rem] text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200">
            <LayoutDashboard className="w-4 h-4" /> {t.viewDashboard}
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="flex-1 space-y-12">
        {/* EXECUTIVE SUMMARY */}
        <Card className="relative group overflow-hidden border-l-[12px] border-l-indigo-600">
           <div className="absolute top-0 right-0 p-16 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-1000">
             <Target className="w-[450px] h-[450px]" />
           </div>
           <div className="relative z-10">
             <div className="inline-flex items-center gap-3 bg-indigo-50 text-indigo-600 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.25em] mb-10 border border-indigo-100">
               <Rocket className="w-4 h-4" /> {t.execSummary}
             </div>
             {/* Professional Headline Logic */}
             <h1 className="text-5xl font-black text-slate-900 mb-8 leading-[1.05] tracking-tight">{result.executive_summary?.headline || 'Strategic Acquisition Plan'}</h1>
             <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-4xl mb-12">{result.executive_summary?.summary}</p>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white space-y-4 shadow-xl">
                   <div className="flex items-center gap-3 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                      <Flag className="w-4 h-4" /> {t.verdict}
                   </div>
                   <p className="text-lg font-bold leading-relaxed">{result.executive_summary?.strategic_verdict}</p>
                </div>
                <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 space-y-4 flex flex-col justify-between">
                   <div>
                      <div className="flex items-center gap-3 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                          <TrendingUp className="w-4 h-4" /> {t.outcome}
                      </div>
                      <p className="text-3xl font-black text-emerald-900 leading-tight mt-4">{result.executive_summary?.expected_outcome_summary}</p>
                   </div>
                   
                   {/* Assumptions Micro-Line */}
                   <div className="text-[10px] font-bold text-emerald-800 leading-tight border-t border-emerald-200 pt-3 mt-4 flex gap-4 opacity-80">
                      <span>Budget: €{inputs.budget.toLocaleString()}</span>
                      <span>•</span>
                      <span>Target CPA: {result.forecast?.expected?.cpa}</span>
                      <span>•</span>
                      <span>Qualified Lead</span>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-slate-100">
               {result.executive_summary?.recommended_mix?.map((mix, i) => (
                 <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Priority {mix.priority}</div>
                    <div className="text-xl font-black text-slate-900 mb-1">{mix.channel}</div>
                    <p className="text-xs text-slate-500 font-bold">{mix.role}</p>
                 </div>
               ))}
             </div>
           </div>
        </Card>

        {/* MARKET INTELLIGENCE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <Card>
             <SectionHeader title={t.marketIntel} icon={Search} color="text-indigo-600" />
             <div className="space-y-10">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search Demand Volume</h4>
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg">
                       {/* Strict badge coloring */}
                       <div className={`w-2 h-2 rounded-full ${result.market_intelligence?.search_demand_rating?.includes('High') ? 'bg-emerald-500' : result.market_intelligence?.search_demand_rating?.includes('Medium') ? 'bg-amber-500' : 'bg-slate-300'}`} />
                       <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">{result.market_intelligence?.search_demand_rating} Demand Signal</span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-slate-800 leading-relaxed">{result.market_intelligence?.search_demand}</p>
                </div>

                <div className="space-y-6">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.intentSplit}</h4>
                   <div className="w-full h-8 bg-slate-100 rounded-2xl overflow-hidden flex shadow-inner">
                      <div className="h-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-black" style={{ width: `${result.market_intelligence?.search_intent_split?.high || 0}%` }}>{result.market_intelligence?.search_intent_split?.high}%</div>
                      <div className="h-full bg-indigo-400 flex items-center justify-center text-[10px] text-white font-black" style={{ width: `${result.market_intelligence?.search_intent_split?.mid || 0}%` }}>{result.market_intelligence?.search_intent_split?.mid}%</div>
                      <div className="h-full bg-indigo-200 flex items-center justify-center text-[10px] text-indigo-900 font-black" style={{ width: `${result.market_intelligence?.search_intent_split?.info || 0}%` }}>{result.market_intelligence?.search_intent_split?.info}%</div>
                   </div>
                   
                   {/* Intent Legend */}
                   <div className="flex flex-col gap-2 pt-2">
                      <div className="flex items-center justify-between text-[10px]">
                         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-600" /><span className="font-bold text-slate-600">{t.highIntent}</span></div>
                         <span className="text-slate-400 italic">e.g., "{isRecruitment ? 'job vacancy riga' : 'buy organic cream'}"</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-400" /><span className="font-bold text-slate-600">{t.midIntent}</span></div>
                         <span className="text-slate-400 italic">e.g., "{isRecruitment ? 'marketing jobs' : 'best skin care'}"</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                         <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-200" /><span className="font-bold text-slate-600">{t.infoIntent}</span></div>
                         <span className="text-slate-400 italic">e.g., "{isRecruitment ? 'salary averages' : 'how to fix dry skin'}"</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-4 bg-indigo-50/50 p-7 rounded-[2rem] border border-indigo-100 shadow-sm">
                   <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                      <Brain className="w-4 h-4" /> {t.soWhat}
                   </h4>
                   <p className="text-sm font-bold text-indigo-900 leading-relaxed italic mb-3">{result.market_intelligence?.interpretation}</p>
                   {result.market_intelligence?.implication && (
                      <div className="pt-3 border-t border-indigo-200/50">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">{t.implication}:</span>
                        <p className="text-sm font-medium text-indigo-800 leading-snug">{result.market_intelligence.implication}</p>
                      </div>
                   )}
                </div>
             </div>
           </Card>
           
           <Card>
             <SectionHeader title={t.marketAvgs} icon={BarChart3} color="text-emerald-600" />
             <div className="grid grid-cols-2 gap-4">
                {result.market_intelligence?.benchmarks?.map((b, i) => (
                  <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-lg">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{b.name}</span>
                    <span className="text-2xl font-black text-indigo-600 block mb-2">{b.value}</span>
                    <p className="text-[9px] font-bold text-slate-500 leading-tight">{b.context}</p>
                  </div>
                ))}
             </div>
             <div className="mt-8 pt-6 border-t border-slate-100 flex items-start gap-3">
                <Info className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                <p className="text-[10px] font-medium text-slate-400 leading-relaxed italic">{t.disclaimer} Benchmarks derived from Latvia {isRecruitment ? 'recruitment ' : ''}auction medians + typical conversion ranges.</p>
             </div>
           </Card>
        </div>

        {/* STRATEGIC ARCHITECTURE */}
        <div className="bg-slate-950 rounded-[4rem] p-12 md:p-20 text-white shadow-2xl relative overflow-hidden border border-white/5">
           <div className="flex items-center gap-6 mb-16">
              <div className="p-5 rounded-[2rem] bg-indigo-600 shadow-xl shadow-indigo-500/20 text-white">
                <Brain className="w-8 h-8" />
              </div>
              <h3 className="text-4xl font-black tracking-tight">{t.logic}</h3>
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              <div className="lg:col-span-8 space-y-12">
                 <div className="space-y-6">
                    <h4 className="text-4xl font-black text-indigo-100 leading-[1.1]">{t.strategy}</h4>
                    <p className="text-xl text-slate-300 font-medium leading-relaxed">{result.strategic_approach?.logic}</p>
                 </div>
                 
                 <div className="p-10 bg-white/5 rounded-[3rem] border border-white/10 space-y-4">
                    <h5 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-3">
                       <Scale className="w-4 h-4" /> Allocation Justification
                    </h5>
                    <p className="text-lg text-slate-200 font-bold leading-relaxed">{result.strategic_approach?.funnel_split_justification}</p>
                 </div>
              </div>

              <div className="lg:col-span-4 space-y-8">
                 <div className="p-8 bg-indigo-600 rounded-[3rem] flex flex-col items-center text-center shadow-2xl shadow-indigo-500/20 border border-indigo-400/30">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2">Primary Funnel focus</span>
                    <span className="text-3xl font-black text-white">{result.strategic_approach?.funnel_balance}</span>
                 </div>

                 {/* High Contrast Dynamic Adjustment */}
                 <div className="space-y-8 p-8 bg-white/[0.05] rounded-[3rem] border border-white/10">
                    <div className="space-y-3">
                       <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2"><Zap className="w-4 h-4" /> Dynamic Adjustment</h4>
                       <p className="text-sm font-bold text-indigo-50 leading-relaxed border-l-2 border-indigo-500 pl-4">{result.strategic_approach?.dynamic_adjustment_scenario}</p>
                    </div>
                    <div className="space-y-3 pt-6 border-t border-white/10">
                       <h4 className="text-[10px] font-black text-amber-300 uppercase tracking-widest flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Risk Mitigation</h4>
                       <p className="text-sm font-bold text-amber-50 leading-relaxed border-l-2 border-amber-500 pl-4">{result.strategic_approach?.risk_mitigation}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* CHANNEL BREAKDOWN */}
        <div className="space-y-8">
           <SectionHeader title={t.channels} icon={Layers} color="text-amber-500" />
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {result.channel_breakdown?.map((ch, i) => {
                // Calculate simple math badge
                const percent = parseFloat(ch.budget_share.replace('%', ''));
                const spend = (inputs.budget * percent) / 100;
                
                return (
                  <Card key={i} className="relative group flex flex-col border-t-8 border-t-indigo-600">
                     <div className="absolute top-10 right-10 text-5xl font-black text-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">{ch.budget_share}</div>
                     <div className="space-y-8 flex-1">
                        <div className="flex gap-3 flex-wrap">
                           <div className="inline-flex items-center gap-3 bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm">
                             Target: {ch.primary_kpi}
                           </div>
                           <div className="inline-flex items-center gap-3 bg-slate-50 text-slate-500 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100">
                             {ch.role_in_funnel}
                           </div>
                        </div>
                        
                        <div className="space-y-3">
                           <h4 className="text-4xl font-black text-slate-900">{ch.channel_name}</h4>
                           <p className="text-lg text-slate-500 font-bold leading-relaxed">{ch.strategy}</p>
                           {/* Math Badge */}
                           <div className="inline-block bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500">
                              Planned Spend: ~€{spend.toLocaleString()}
                           </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 pt-8 border-t border-slate-50">
                           <div className="space-y-2">
                              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2"><AlertTriangle className="w-3 h-3" /> Key Operational Risk</span>
                              <p className="text-sm font-bold text-slate-700 leading-relaxed">{ch.key_risk}</p>
                           </div>
                           <div className="space-y-2">
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-3 h-3" /> 30-Day Success Marker</span>
                              <p className="text-sm font-bold text-slate-700 leading-relaxed">{ch.success_30d}</p>
                           </div>
                        </div>
                     </div>
                  </Card>
                );
              })}
           </div>
        </div>

        {/* FORECAST */}
        <Card>
           <SectionHeader title={t.forecast} icon={Calculator} color="text-indigo-600" />
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
              {[
                { label: 'Conservative', data: result.forecast?.conservative, bg: 'bg-slate-50', text: 'text-slate-600' },
                { label: 'Expected Path', data: result.forecast?.expected, bg: 'bg-indigo-600 text-white', text: 'text-indigo-100', highlight: true },
                { label: 'Optimistic', data: result.forecast?.optimistic, bg: 'bg-slate-50', text: 'text-slate-600' }
              ].map((f, i) => (
                <div key={i} className={`p-10 rounded-[3rem] ${f.bg} border border-slate-100 space-y-10 flex flex-col items-center text-center shadow-sm transition-transform hover:scale-[1.02]`}>
                   {f.data && (
                     <>
                        <div className="space-y-3">
                            <div className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${f.highlight ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>{f.label}</div>
                            <div className={`text-[9px] font-black uppercase tracking-[0.2em] pt-2 ${f.highlight ? 'text-indigo-300' : 'text-slate-400'}`}>Primary Driver: {f.data.driver}</div>
                        </div>
                        
                        <div className="space-y-2">
                            <span className="text-6xl font-black block tracking-tighter">{f.data.conversions}</span>
                            <span className={`text-[10px] font-black uppercase tracking-[0.25em] opacity-60`}>{appLabel}</span>
                        </div>

                        <div className="w-full pt-8 border-t border-current/10 space-y-2">
                            <p className={`text-[11px] font-bold leading-relaxed px-2 ${f.highlight ? 'text-indigo-100' : 'text-slate-400'}`}>{f.data.logic}</p>
                        </div>

                        <div className="w-full pt-8 border-t border-current/10 grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Avg CPA</span>
                                <span className="text-lg font-black block">{f.data.cpa}</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{isRecruitment ? 'Qual. Score' : 'Est. ROAS'}</span>
                                <span className="text-lg font-black block">{f.data.roas !== 'N/A' && f.data.roas !== '0' ? f.data.roas : '-'}</span>
                            </div>
                        </div>
                     </>
                   )}
                </div>
              ))}
           </div>
           {/* Assumptions Footnote */}
           <div className="mt-8 text-[10px] font-medium text-slate-400 text-center italic">
              Assumes €{inputs.budget.toLocaleString()} spend. Metrics calculated based on blended channel performance (Meta + Google). {isRecruitment ? 'Application defined as completed lead form or landing page submission.' : ''}
           </div>
        </Card>

        {/* CREATIVE STRATEGY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <Card className="lg:col-span-8 bg-emerald-50 border-emerald-100">
              <SectionHeader title={t.creative} icon={Sparkles} color="text-emerald-600" />
              <div className="space-y-12 mt-6">
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><Lightbulb className="w-3 h-3" /> Specific Value Propositions</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {result.creative_strategy?.value_props?.map((v, i) => (
                         <div key={i} className="bg-white p-5 rounded-2xl text-sm font-black text-slate-800 shadow-sm border border-emerald-100 flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> {v}
                         </div>
                       ))}
                    </div>
                 </div>
                 <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><Gauge className="w-3 h-3" /> Strategic Messaging Matrix</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {result.creative_strategy?.messaging_by_funnel?.map((m, i) => (
                         <div key={i} className="bg-white p-8 rounded-3xl border border-emerald-100 shadow-sm space-y-4 flex flex-col">
                            <div className="flex justify-between items-center">
                               <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{m.stage}</span>
                               <span className="text-[8px] font-black text-slate-300 uppercase">{m.platform_context}</span>
                            </div>
                            <p className="text-lg font-black text-slate-800 leading-snug flex-1">{m.angle}</p>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </Card>
           
           <div className="lg:col-span-4 flex flex-col gap-8">
              {/* Better Layout for Guardrails */}
              <div className="bg-rose-50 border border-rose-100 p-10 rounded-[3rem] flex-1 shadow-sm">
                 <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2 mb-8"><ShieldX className="w-4 h-4" /> {t.guardrails}</h4>
                 <div className="space-y-4">
                    {result.creative_strategy?.anti_messaging?.map((am, i) => (
                       <div key={i} className="flex gap-3 text-xs font-bold text-rose-900 leading-relaxed border-b border-rose-100 pb-3 last:border-0 last:pb-0">
                          <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" /> {am}
                       </div>
                    ))}
                 </div>
              </div>
              <div className="bg-slate-900 p-10 rounded-[3rem] text-white space-y-4">
                 <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Creative Direction</h4>
                 <p className="text-sm font-medium text-slate-400 leading-relaxed italic">{result.creative_strategy?.visual_direction}</p>
              </div>
           </div>
        </div>

        {/* ROADMAP */}
        <Card>
           <SectionHeader title={t.roadmap} icon={Calendar} color="text-indigo-600" />
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-10">
              {result.roadmap?.map((r, i) => (
                <div key={i} className="flex flex-col group/r">
                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-[1.2rem] bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xl group-hover/r:scale-110 transition-transform">W{r.week}</div>
                      <h5 className="text-base font-black text-slate-900 leading-tight">{r.title}</h5>
                   </div>
                   <div className="space-y-6 flex-1">
                      <div className="space-y-3">
                         {r.tasks?.map((task, ti) => (
                            <div key={ti} className="flex gap-3 text-xs font-bold text-slate-500">
                               <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-1.5 shrink-0" /> {task}
                            </div>
                         ))}
                      </div>
                      
                      <div className="mt-auto pt-6 border-t border-slate-50 space-y-4">
                         <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block mb-1">{t.successCriteria}</span>
                            <p className="text-[10px] font-bold text-indigo-700 leading-relaxed">{r.success_criteria}</p>
                         </div>
                         
                         {r.decision_gate && (
                            <div className="bg-slate-900 p-4 rounded-2xl border border-indigo-500/30">
                               <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block mb-1 flex items-center gap-2">
                                  <GitCommit className="w-3 h-3" /> {t.decision}
                               </span>
                               <p className="text-[10px] font-black text-white leading-relaxed italic">{r.decision_gate}</p>
                            </div>
                         )}
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </Card>

        {/* FOOTER ACTION */}
        <div className="bg-white border border-slate-200 rounded-[3.5rem] p-12 shadow-sm flex flex-col md:flex-row items-center justify-between gap-10">
           <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-indigo-100">
                <Rocket className="w-10 h-10 text-white" />
              </div>
              <div className="text-left">
                <h4 className="text-2xl font-black text-slate-900 mb-2">Execute & Replace Assumptions</h4>
                <p className="text-slate-500 font-medium text-lg leading-tight">Sync your real ad account to replace modelled data with real-time performance audit.</p>
              </div>
           </div>
           <button onClick={onViewAudit} className="px-12 py-6 bg-slate-900 text-white font-black rounded-[2.5rem] text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition-all flex items-center gap-4">
             {t.launchConsole} <ArrowRight className="w-5 h-5" />
           </button>
        </div>
        
        <SourceList sources={result.sources} title={t.sources} />
      </div>
    </div>
  );
};
