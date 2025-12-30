
import React, { useState, useEffect } from 'react';
import { AppMode, AnalysisLanguage, SimulationInputs, SimulationResult } from './types';
import { runAiSimulation } from './services/geminiService';
import { MetaDashboard } from './components/MetaDashboard';
import { CsvDashboard } from './components/CsvDashboard';
import { SimulationWizard } from './components/SimulationWizard';
import { SimulationResults } from './components/SimulationResults';
import { CreativeStudio } from './components/CreativeStudio';
import { 
  FileSpreadsheet, 
  Sparkles, 
  ArrowUpRight,
  Loader2,
  Rocket,
  Facebook,
  Palette,
  Key,
  AlertTriangle
} from 'lucide-react';

const APP_VERSION = 'v1.4.0';

const App = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.LANDING);
  const [language, setLanguage] = useState<AnalysisLanguage>('ENG');
  const [hasApiKey, setHasApiKey] = useState<boolean>(!!process.env.API_KEY);

  // Simulation State (Kept in App as it's a lightweight flow)
  const [simInputs, setSimInputs] = useState<SimulationInputs | null>(null);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);

  useEffect(() => {
    const checkKey = async () => {
      const aiStudio = (window as any).aistudio;
      if (aiStudio) {
        const selected = await aiStudio.hasSelectedApiKey();
        if (!process.env.API_KEY) {
          setHasApiKey(selected);
        }
      }
    };
    checkKey();
  }, []);

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

  const handleGenerateSimulation = async (inputs: SimulationInputs) => {
    setIsSimulating(true);
    setSimInputs(inputs);
    try {
      const result = await runAiSimulation(inputs, language);
      setSimResult(result);
      setSimProgress(100);
      setTimeout(() => {
        setMode(AppMode.SIMULATION_RESULT);
        setIsSimulating(false);
      }, 800);
    } catch (err) {
      console.error(err);
      setIsSimulating(false);
    }
  };

  const handleTweakSimulation = async (newInputs: SimulationInputs) => {
    setSimInputs(newInputs);
    setIsSimulating(true);
    try {
      const result = await runAiSimulation(newInputs, language);
      setSimResult(result);
      setSimProgress(100);
      setTimeout(() => setIsSimulating(false), 800);
    } catch (err) {
      console.error(err);
      setIsSimulating(false);
    }
  };

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

  // --- ROUTING ---

  if (mode === AppMode.META_SELECT) {
      return <MetaDashboard language={language} onLanguageChange={setLanguage} onBack={() => setMode(AppMode.LANDING)} />;
  }

  if (mode === AppMode.UPLOAD) {
      return <CsvDashboard language={language} onLanguageChange={setLanguage} onBack={() => setMode(AppMode.LANDING)} />;
  }

  if (mode === AppMode.GENERATE) {
      return <SimulationWizard language={language} onCancel={() => setMode(AppMode.LANDING)} onGenerate={handleGenerateSimulation} />;
  }

  if (mode === AppMode.CREATIVE_STUDIO) {
      return (
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
      );
  }

  if (mode === AppMode.SIMULATION_RESULT && simResult && simInputs) {
      return (
        <div className="max-w-[1500px] mx-auto px-4 py-12">
          <div className="flex justify-between items-center mb-10">
            <button onClick={() => setMode(AppMode.LANDING)} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase hover:text-slate-900 tracking-widest transition-colors">
                 Back to Home
            </button>
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
            onViewAudit={() => {}} // No longer routes to audit from sim directly in this structure
            language={language}
            isUpdating={isSimulating}
          />
        </div>
      );
  }

  if (isSimulating) {
      return (
        <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col items-center justify-center text-white gap-12 animate-in fade-in duration-700">
           <div className="text-center space-y-10 max-w-2xl px-6">
             <h2 className="text-5xl font-black tracking-tight text-white mb-2">Architecting Strategy...</h2>
             <div className="space-y-6 w-full max-w-md mx-auto">
                <div className="flex justify-between items-end mb-2">
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Processing...</span>
                   <span className="text-sm font-black text-white">{Math.round(simProgress)}%</span>
                </div>
                <div className="w-full h-3 bg-white/5 rounded-full border border-white/10 p-0.5 shadow-inner">
                   <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-300 ease-out shadow-lg shadow-indigo-500/20" style={{ width: `${simProgress}%` }} />
                </div>
             </div>
           </div>
        </div>
      );
  }

  // LANDING PAGE
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
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
            { title: 'Connect Meta', sub: 'Direct API sync.', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50', action: () => setMode(AppMode.META_SELECT), label: 'Connect Account' },
            { title: 'Upload CSV', sub: 'Multi-dimensional analysis.', icon: FileSpreadsheet, color: 'text-indigo-600', bg: 'bg-indigo-50', action: () => setMode(AppMode.UPLOAD), label: 'Select Files' },
            { title: 'Strategy Architect', sub: 'Predictive media plans.', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50', action: () => setMode(AppMode.GENERATE), label: 'Build My Plan' },
            { title: 'Creative Studio', sub: 'AI Vision & Focus Groups.', icon: Palette, color: 'text-rose-600', bg: 'bg-rose-50', action: () => setMode(AppMode.CREATIVE_STUDIO), label: 'Audit Creative' }
          ].map((card, i) => (
            <div key={i} className="group bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col items-center">
              <div className={`w-20 h-20 ${card.bg} ${card.color} rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                <card.icon className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-4">{card.title}</h2>
              <p className="text-slate-500 text-sm mb-8">{card.sub}</p>
              <button onClick={card.action} className={`w-full py-4 ${card.title === 'Strategy Architect' ? 'bg-purple-600' : card.title === 'Connect Meta' ? 'bg-blue-600' : card.title === 'Creative Studio' ? 'bg-rose-600' : 'bg-slate-900'} text-white font-black rounded-2xl uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all`}>{card.label}</button>
            </div>
          ))}
        </div>
        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Version: {APP_VERSION}</div>
      </div>
    </div>
  );
};

export default App;
