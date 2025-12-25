
import React, { useState, useEffect } from 'react';
import { AppMode, Dataset, DimensionFile, AnalysisResult, AnalysisLanguage, MetaAdAccount, SimulationInputs, SimulationResult } from './types';
import { parseCSV, detectCurrency } from './utils/csvHelper';
import { analyzeDataset, runAiSimulation } from './services/geminiService';
import { initMetaSdk, loginWithMeta, fetchAdAccounts, fetchMetaInsights } from './services/metaService';
import { AnalysisView } from './components/AnalysisView';
import { SimulationWizard } from './components/SimulationWizard';
import { SimulationResults } from './components/SimulationResults';
import { CreativeStudio } from './components/CreativeStudio';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Sparkles, 
  ArrowLeft, 
  ArrowUpRight,
  Loader2,
  Rocket,
  AlertCircle,
  Facebook,
  Search, 
  CheckCircle2,
  Settings,
  AlertTriangle,
  RefreshCw,
  Plus,
  Files,
  Trash2,
  Play,
  Key,
  Clock,
  Palette
} from 'lucide-react';

const GLOBAL_META_APP_ID = '1235976105092992'; 
const APP_VERSION = 'v1.3.0';

interface StagedFile {
  file: File;
  detectedType: DimensionFile['type'];
}

const SIM_STATUS_STEPS = [
  { threshold: 0, text: "Initializing Architect Engines..." },
  { threshold: 15, text: "Searching Google for market demand..." },
  { threshold: 40, text: "Extracting regional CPM & CPA benchmarks..." },
  { threshold: 65, text: "Analyzing competitor promotional offers..." },
  { threshold: 85, text: "Simulating 30-day performance forecast..." },
  { threshold: 95, text: "Finalizing your custom roadmap..." }
];

const App = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.LANDING);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<AnalysisLanguage>('ENG');
  
  // Initialize hasApiKey to true if process.env.API_KEY is present (Production/Vercel)
  const [hasApiKey, setHasApiKey] = useState<boolean>(!!process.env.API_KEY);

  // Simulation states
  const [simInputs, setSimInputs] = useState<SimulationInputs | null>(null);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);

  const [customMetaAppId, setCustomMetaAppId] = useState<string>(localStorage.getItem('adpilot_meta_app_id') || '');
  const [showMetaSettings, setShowMetaSettings] = useState(false);
  const [metaAccessToken, setMetaAccessToken] = useState<string | null>(null);
  const [metaAccounts, setMetaAccounts] = useState<MetaAdAccount[]>([]);
  const [isMetaLoading, setIsMetaLoading] = useState(false);

  const activeAppId: string = customMetaAppId || GLOBAL_META_APP_ID;
  const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';

  useEffect(() => {
    const checkKey = async () => {
      // Cast window to any to avoid TS build errors
      const aiStudio = (window as any).aistudio;
      if (aiStudio) {
        const selected = await aiStudio.hasSelectedApiKey();
        // Only update state if we don't already have an Env key. 
        // This prevents the overlay from disabling access in production where env key exists but aiStudio object might imply 'false'.
        if (!process.env.API_KEY) {
          setHasApiKey(selected);
        }
      }
    };
    checkKey();
  }, []);

  // Real perceived progress logic
  useEffect(() => {
    let interval: any;
    if (isSimulating) {
      setSimProgress(0);
      interval = setInterval(() => {
        setSimProgress(prev => {
          if (prev < 30) return prev + Math.random() * 2.5;
          if (prev < 65) return prev + Math.random() * 1.5;
          if (prev < 95) return prev + Math.random() * 0.4;
          if (prev < 99) return prev + 0.05;
          return prev;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isSimulating]);

  const handleSelectKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      await aiStudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const newStaged = Array.from(files).map((file: File) => ({
      file,
      detectedType: (file.name.toLowerCase().includes('age') || file.name.toLowerCase().includes('gender')) ? 'DEMOGRAPHIC' : 
                    (file.name.toLowerCase().includes('placement')) ? 'PLACEMENT' : 
                    (file.name.toLowerCase().includes('creative')) ? 'CREATIVE' : 'DAILY'
    } as StagedFile));
    setStagedFiles(prev => [...prev, ...newStaged]);
    setMode(AppMode.UPLOAD);
  };

  const processStagedFiles = async () => {
    setIsAnalyzing(true);
    try {
      const dimensionFiles: DimensionFile[] = [];
      for (const staged of stagedFiles) {
        const text = await staged.file.text();
        const { data: parsedData } = parseCSV(text);
        if (parsedData.length > 0) {
          dimensionFiles.push({ id: Math.random().toString(36).substr(2, 9), name: staged.file.name, data: parsedData, type: staged.detectedType });
        }
      }
      if (dimensionFiles.length > 0) {
        setDataset({ name: stagedFiles[0].file.name.replace('.csv', ''), files: dimensionFiles, source: 'CSV' });
        setMode(AppMode.DASHBOARD);
      } else { setError("Files contain no valid data."); }
    } catch (err) { setError("Error processing files."); } finally { setIsAnalyzing(false); }
  };

  const handleGenerateSimulation = async (inputs: SimulationInputs) => {
    setIsSimulating(true);
    setSimInputs(inputs);
    try {
      const result = await runAiSimulation(inputs, language);
      setSimResult(result);
      setDataset({ 
        name: `Simulation: ${inputs.product}`, 
        files: [{ id: 'sim-1', name: 'Forecast History', data: result.syntheticData, type: 'DAILY' }], 
        source: 'GEN' 
      });
      setSimProgress(100);
      setTimeout(() => {
        setMode(AppMode.SIMULATION_RESULT);
        setIsSimulating(false);
      }, 800);
    } catch (err) {
      setError("Simulation failed. Please try again.");
      setIsSimulating(false);
    }
  };

  const handleTweakSimulation = async (newInputs: SimulationInputs) => {
    setSimInputs(newInputs);
    setIsSimulating(true);
    try {
      const result = await runAiSimulation(newInputs, language);
      setSimResult(result);
      setDataset({ 
        name: `Simulation: ${newInputs.product}`, 
        files: [{ id: 'sim-1', name: 'Forecast History', data: result.syntheticData, type: 'DAILY' }], 
        source: 'GEN' 
      });
      setSimProgress(100);
      setTimeout(() => setIsSimulating(false), 800);
    } catch (err) {
      console.error(err);
      setIsSimulating(false);
    }
  };

  const handleMetaConnect = async () => {
    if (!isHttps) { setError("Meta Login requires HTTPS."); return; }
    setIsMetaLoading(true);
    try {
      await initMetaSdk(activeAppId);
      const token = await loginWithMeta();
      setMetaAccessToken(token);
      const accounts = await fetchAdAccounts(token);
      setMetaAccounts(accounts);
      setMode(AppMode.META_SELECT);
    } catch (err: any) { 
      // Enhanced feedback for Meta OAuth issues
      setError("Meta Connection failed. This usually occurs if the app Domain/Redirect URI doesn't match the current environment. Try uploading a CSV or using Simulation mode."); 
    } finally { setIsMetaLoading(false); }
  };

  const handleMetaAccountSelect = async (account: MetaAdAccount) => {
    if (!metaAccessToken) return;
    setIsMetaLoading(true);
    try {
      const data = await fetchMetaInsights(account.id, metaAccessToken);
      setDataset({ name: `Meta: ${account.name}`, files: [{ id: 'meta-main', name: 'Main Insights', data, type: 'DAILY' }], source: 'META' });
      setMode(AppMode.DASHBOARD);
    } catch (err: any) { setError("Loading failed."); } finally { setIsMetaLoading(false); }
  };

  const resetApp = () => {
    setMode(AppMode.LANDING);
    setStagedFiles([]);
    setDataset(null);
    setAnalysis(null);
    setSimResult(null);
    setSimInputs(null);
    setError(null);
  };

  const currentStatusMsg = SIM_STATUS_STEPS.slice().reverse().find(step => simProgress >= step.threshold)?.text || SIM_STATUS_STEPS[0].text;

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/20">
            <Key className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tight">Access Required</h1>
            <p className="text-slate-400 font-medium">Please select your Google AI Studio API key to power the Audit Intelligence.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-left space-y-4">
             <p className="text-slate-300 font-medium">To use <b>Gemini 3 Pro</b> models, a paid project API key is required.</p>
             <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-indigo-400 font-bold flex items-center gap-1 hover:underline underline-offset-4">Learn about billing <ArrowUpRight className="w-3.5 h-3.5" /></a>
          </div>
          <button onClick={handleSelectKey} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl transition-all active:scale-95">Select API Key</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {mode === AppMode.LANDING && (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 text-center">
          <div className="mb-16 animate-in slide-in-from-top-12 duration-1000">
            <h1 className="text-7xl font-black text-slate-900 mb-6 flex items-center justify-center gap-4">
              Ad <span className="text-indigo-600">Pilot</span>
              <Rocket className="w-12 h-12 text-indigo-600" />
            </h1>
            <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
              Senior Advertising Intelligence. Analyze dimension exports or architect new campaigns with AI.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-[1500px] mb-12 animate-in fade-in zoom-in-95 duration-1000 delay-300">
            {[
              { title: 'Connect Meta', sub: 'Direct API sync.', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50', action: handleMetaConnect, label: 'Connect Account', loading: isMetaLoading },
              { title: 'Upload CSV', sub: 'Multi-dimensional analysis.', icon: FileSpreadsheet, color: 'text-indigo-600', bg: 'bg-indigo-50', action: () => document.getElementById('csv-upload-main')?.click(), label: 'Select Files' },
              { title: 'Strategy Architect', sub: 'Predictive media plans.', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50', action: () => setMode(AppMode.GENERATE), label: 'Build My Plan' },
              { title: 'Creative Studio', sub: 'AI Vision & Focus Groups.', icon: Palette, color: 'text-rose-600', bg: 'bg-rose-50', action: () => setMode(AppMode.CREATIVE_STUDIO), label: 'Audit Creative' }
            ].map((card, i) => (
              <div key={i} className="group bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col items-center">
                <div className={`w-20 h-20 ${card.bg} ${card.color} rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                  {card.loading ? <Loader2 className="w-10 h-10 animate-spin" /> : <card.icon className="w-10 h-10" />}
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-4">{card.title}</h2>
                <p className="text-slate-500 text-sm mb-8">{card.sub}</p>
                {card.title === 'Upload CSV' && <input type="file" multiple accept=".csv" onChange={handleFileSelection} className="hidden" id="csv-upload-main" />}
                <button onClick={card.action} className={`w-full py-4 ${card.title === 'Strategy Architect' ? 'bg-purple-600' : card.title === 'Connect Meta' ? 'bg-indigo-600' : card.title === 'Creative Studio' ? 'bg-rose-600' : 'bg-slate-900'} text-white font-black rounded-2xl uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all`}>{card.label}</button>
              </div>
            ))}
          </div>
          <button onClick={() => setShowMetaSettings(!showMetaSettings)} className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">Version: {APP_VERSION}</button>
          {error && <div className="mt-8 bg-red-50 text-red-600 px-6 py-4 rounded-3xl border border-red-100 font-bold text-sm flex items-center gap-4 max-w-2xl"><AlertTriangle className="w-6 h-6 shrink-0" /> {error}</div>}
        </div>
      )}

      {mode === AppMode.UPLOAD && (
        <div className="flex flex-col items-center justify-center min-h-screen max-w-4xl mx-auto px-4 py-20">
          <button onClick={() => { setStagedFiles([]); setMode(AppMode.LANDING); }} className="self-start mb-8 text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest"><ArrowLeft className="w-4 h-4" /> Reset</button>
          <div className="w-full bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden p-12">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-10">Data Staging Area</h2>
            <div className="space-y-4 mb-12">
              {stagedFiles.map((staged, idx) => (
                <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-5">
                    <FileSpreadsheet className="w-8 h-8 text-indigo-600" />
                    <div><div className="font-bold text-slate-900">{staged.file.name}</div><div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">{staged.detectedType}</div></div>
                  </div>
                  <button onClick={() => setStagedFiles(prev => prev.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
                </div>
              ))}
              <label htmlFor="csv-add-more" className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-indigo-300 cursor-pointer">
                <input type="file" multiple accept=".csv" onChange={handleFileSelection} className="hidden" id="csv-add-more" />
                <Plus className="w-5 h-5" /> Add Dimension
              </label>
            </div>
            <button onClick={processStagedFiles} disabled={isAnalyzing} className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-3xl text-lg uppercase tracking-widest flex items-center justify-center gap-4 shadow-xl disabled:bg-slate-300 transition-all">
              {isAnalyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />}
              {isAnalyzing ? 'Analyzing...' : 'Start Audit'}
            </button>
          </div>
        </div>
      )}

      {mode === AppMode.GENERATE && (
        <SimulationWizard 
          language={language} 
          onCancel={() => setMode(AppMode.LANDING)} 
          onGenerate={handleGenerateSimulation} 
        />
      )}

      {mode === AppMode.CREATIVE_STUDIO && (
        <div className="max-w-[1500px] mx-auto px-4 py-12">
          <CreativeStudio 
            language={language} 
            context={{
              product: simInputs?.product || 'New Product Offering',
              audience: simInputs?.customerProfile || 'General Consumer Audience',
              offer: simInputs?.offer || 'Limited Time Discount Offer'
            }}
            onBack={() => setMode(AppMode.LANDING)}
          />
        </div>
      )}

      {isSimulating && (
        <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col items-center justify-center text-white gap-12 animate-in fade-in duration-700">
           <div className="relative group">
              <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full"></div>
              <div className="relative w-48 h-48 rounded-full flex items-center justify-center border-2 border-white/10 shadow-2xl backdrop-blur-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                <div className="relative animate-pulse"><Sparkles className="w-16 h-16 text-indigo-400" /></div>
                <div className="absolute inset-0 border-t-2 border-indigo-400/50 rounded-full animate-[spin_3s_linear_infinite]"></div>
              </div>
           </div>
           
           <div className="text-center space-y-10 max-w-2xl px-6">
             <div className="space-y-4">
                <h2 className="text-5xl font-black tracking-tight text-white mb-2">Architecting Strategy...</h2>
                <p className="text-slate-400 text-lg font-medium leading-relaxed">
                  We analyze live search demand, industry benchmarks and market trends to build a realistic 30-day strategy forecast
                  {simInputs?.product && simInputs.product !== 'Not sure' && (
                    <> for <span className="text-indigo-400 font-black">{simInputs.product}</span></>
                  )}.
                </p>
             </div>
             
             <div className="space-y-6 w-full max-w-md mx-auto">
                <div className="flex justify-between items-end mb-2">
                   <div className="flex items-center gap-2 text-indigo-400">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{currentStatusMsg}</span>
                   </div>
                   <span className="text-sm font-black text-white">{Math.round(simProgress)}%</span>
                </div>
                
                <div className="w-full h-3 bg-white/5 rounded-full border border-white/10 p-0.5 shadow-inner">
                   <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-300 ease-out shadow-lg shadow-indigo-500/20" style={{ width: `${simProgress}%` }} />
                </div>
             </div>
           </div>
        </div>
      )}

      {mode === AppMode.SIMULATION_RESULT && simResult && simInputs && (
        <div className="max-w-[1500px] mx-auto px-4 py-12">
          <div className="flex justify-between items-center mb-10">
            <button onClick={resetApp} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase hover:text-slate-900 tracking-widest"><ArrowLeft className="w-4 h-4" /> Exit Simulation</button>
            <div className="flex bg-slate-200/50 p-1 rounded-2xl">
              {(['ENG', 'LV'] as const).map(lang => (
                <button key={lang} onClick={() => setLanguage(lang)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${language === lang ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{lang}</button>
              ))}
            </div>
          </div>
          <SimulationResults 
            result={simResult} 
            inputs={simInputs} 
            onTweak={handleTweakSimulation} 
            onViewAudit={() => setMode(AppMode.DASHBOARD)} 
            language={language}
            isUpdating={isSimulating}
          />
        </div>
      )}

      {mode === AppMode.DASHBOARD && dataset && (
        <div className="max-w-[1500px] mx-auto px-4 py-12">
          <div className="flex justify-between items-center mb-10">
            <button onClick={() => simResult ? setMode(AppMode.SIMULATION_RESULT) : resetApp()} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase hover:text-slate-900 tracking-widest"><ArrowLeft className="w-4 h-4" /> {simResult ? 'Back to Strategy' : 'Exit Audit'}</button>
            <div className="flex items-center gap-4">
               <div className="flex bg-slate-200/50 p-1 rounded-2xl mr-4">
                 {(['ENG', 'LV'] as const).map(lang => (
                   <button key={lang} onClick={() => setLanguage(lang)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${language === lang ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{lang}</button>
                 ))}
               </div>
               <div className="flex -space-x-2">
                 {dataset.files.map((f, i) => (
                   <div key={f.id} title={f.name} className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-indigo-600 shadow-sm"><Files className="w-3.5 h-3.5" /></div>
                 ))}
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dataset.files.length} Dimensions</span>
            </div>
          </div>
          <AnalysisView dataset={dataset} analysis={analysis} isAnalyzing={isAnalyzing} language={language} onLanguageChange={setLanguage} />
        </div>
      )}

      {mode === AppMode.META_SELECT && (
         <div className="flex flex-col items-center justify-center min-h-screen max-w-2xl mx-auto px-4">
            <button onClick={() => setMode(AppMode.LANDING)} className="self-start mb-6 text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest"><ArrowLeft className="w-4 h-4" /> Back</button>
            <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6">
                <h2 className="text-2xl font-black mb-6">Select Meta Account</h2>
                <div className="space-y-2">
                    {metaAccounts.map(acc => (
                        <button key={acc.id} onClick={() => handleMetaAccountSelect(acc)} className="w-full p-4 flex items-center justify-between rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors">
                            <div className="text-left font-bold text-slate-800">{acc.name}</div>
                            <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                        </button>
                    ))}
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default App;
