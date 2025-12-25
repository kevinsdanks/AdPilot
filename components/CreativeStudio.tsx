
import React, { useState } from 'react';
import { CreativeAuditResult, FocusGroupResult, AnalysisLanguage } from '../types';
import { analyzeAdCreative, generateFocusGroup } from '../services/geminiService';
import { 
  Sparkles, UploadCloud, Users, CheckCircle2, AlertTriangle, 
  ArrowRight, Loader2, Image as ImageIcon, Brain, Target, Star,
  Activity, Zap, Lightbulb, MessageSquare
} from 'lucide-react';

interface CreativeStudioProps {
  language: AnalysisLanguage;
  context: { product: string; audience: string; offer: string };
  onBack: () => void;
}

export const CreativeStudio: React.FC<CreativeStudioProps> = ({ language, context, onBack }) => {
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSimulatingGroup, setIsSimulatingGroup] = useState(false);
  const [audit, setAudit] = useState<CreativeAuditResult | null>(null);
  const [focusGroup, setFocusGroup] = useState<FocusGroupResult | null>(null);

  const t = language === 'LV' ? {
    title: 'Kreatīva Studija',
    subtitle: 'Multimodāls Intelekts vizuālai auditēšanai',
    upload: 'Augšupielādējiet reklāmas attēlu',
    analyze: 'Auditēt kreatīvu',
    simulate: 'Simulēt Fokusa Grupu',
    personas: 'Sintētiskā Auditorija',
    observations: 'Novērojumi',
    edits: 'Ieteicamie labojumi',
    intent: 'Pirkuma nodoms'
  } : {
    title: 'Creative Studio',
    subtitle: 'Multimodal Intelligence for Visual Auditing',
    upload: 'Upload Ad Creative Image',
    analyze: 'Audit Creative',
    simulate: 'Simulate Focus Group',
    personas: 'Synthetic Audience',
    observations: 'Key Observations',
    edits: 'Suggested Edits',
    intent: 'Purchase Intent'
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const runAudit = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    try {
      const res = await analyzeAdCreative(image, mimeType, { product: context.product, audience: context.audience }, language);
      setAudit(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runFocusGroupSim = async () => {
    setIsSimulatingGroup(true);
    try {
      const res = await generateFocusGroup({ product: context.product, offer: context.offer, audience: context.audience }, language);
      setFocusGroup(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulatingGroup(false);
    }
  };

  const PillarScore = ({ label, score, feedback }: { label: string; score: number; feedback: string }) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <span className={`text-xl font-black ${score > 7 ? 'text-emerald-500' : score > 4 ? 'text-amber-500' : 'text-rose-500'}`}>{score}/10</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full transition-all duration-1000 ${score > 7 ? 'bg-emerald-500' : score > 4 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${score * 10}%` }} />
      </div>
      <p className="text-xs text-slate-500 font-bold leading-relaxed italic">{feedback}</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex items-center justify-between border-b border-slate-200 pb-8">
        <div className="text-left">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 text-white">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{t.title}</h1>
          </div>
          <p className="text-slate-500 font-medium">{t.subtitle}</p>
        </div>
        <button onClick={onBack} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all">Back to Dashboard</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
        {/* LEFT COLUMN: UPLOAD & AUDIT */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden">
            {!image ? (
              <label className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:border-indigo-400 transition-all group">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <div className="p-5 bg-slate-50 rounded-full mb-6 group-hover:scale-110 transition-transform"><UploadCloud className="w-10 h-10 text-slate-400" /></div>
                <span className="text-lg font-black text-slate-900">{t.upload}</span>
                <span className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest">JPG, PNG or WEBP up to 5MB</span>
              </label>
            ) : (
              <div className="space-y-8">
                <div className="relative group">
                  <img src={`data:${mimeType};base64,${image}`} className="w-full h-auto rounded-[2rem] shadow-2xl border border-slate-100" />
                  <button onClick={() => { setImage(null); setAudit(null); }} className="absolute top-4 right-4 bg-slate-900/50 backdrop-blur-md text-white p-3 rounded-full hover:bg-rose-500 transition-all"><AlertTriangle className="w-5 h-5" /></button>
                </div>
                {!audit && (
                  <button onClick={runAudit} disabled={isAnalyzing} className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-3xl text-sm uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-4 transition-all">
                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                    {isAnalyzing ? 'Analyzing Visuals...' : t.analyze}
                  </button>
                )}
              </div>
            )}
          </div>

          {audit && (
            <div className="space-y-8 animate-in slide-in-from-bottom-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PillarScore label="Stopping Power" score={audit.pillars.stopping_power.score} feedback={audit.pillars.stopping_power.feedback} />
                <PillarScore label="Message Clarity" score={audit.pillars.messaging_clarity.score} feedback={audit.pillars.messaging_clarity.feedback} />
                <PillarScore label="Brand Recall" score={audit.pillars.brand_recall.score} feedback={audit.pillars.brand_recall.feedback} />
                <PillarScore label="Visual Hierarchy" score={audit.pillars.visual_hierarchy.score} feedback={audit.pillars.visual_hierarchy.feedback} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Target className="w-4 h-4" /> {t.observations}</h4>
                  <ul className="space-y-4">
                    {audit.key_observations.map((obs, i) => (
                      <li key={i} className="flex gap-4 text-sm font-bold text-slate-700 leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {obs}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 p-10 rounded-[3rem] space-y-6">
                  <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2"><Lightbulb className="w-4 h-4" /> {t.edits}</h4>
                  <ul className="space-y-4">
                    {audit.suggested_edits.map((edit, i) => (
                      <li key={i} className="flex gap-4 text-sm font-black text-indigo-900 leading-relaxed">
                        <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" /> {edit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: FOCUS GROUP */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-slate-950 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden border border-white/5">
            <Brain className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5" />
            <div className="relative z-10 space-y-8">
              <div className="inline-flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-300">
                <Users className="w-4 h-4" /> {t.personas}
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black">{t.simulate}</h3>
                <p className="text-slate-400 font-medium leading-relaxed">AI will simulate reaction profiles based on your product, offer, and audience definitions.</p>
              </div>
              
              {!focusGroup ? (
                <button onClick={runFocusGroupSim} disabled={isSimulatingGroup} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-[2rem] text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all">
                  {isSimulatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                  {isSimulatingGroup ? 'Simulating Participants...' : 'Generate Focus Group'}
                </button>
              ) : (
                <div className="space-y-10 animate-in fade-in duration-1000">
                  <div className="space-y-6">
                    {focusGroup.personas.map((persona, i) => (
                      <div key={i} className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4 hover:bg-white/10 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-black text-white">{persona.name}</div>
                            <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{persona.archetype}</div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.intent}</span>
                            <div className="flex gap-0.5">
                              {[...Array(10)].map((_, j) => (
                                <div key={j} className={`w-1.5 h-1.5 rounded-full ${j < persona.purchase_intent ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-slate-300 font-medium italic leading-relaxed">"{persona.reaction}"</p>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                           <div className="space-y-1">
                             <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">{language === 'LV' ? 'POZITĪVAIS' : 'POSITIVE'}</div>
                             <div className="text-[10px] font-bold text-slate-400 leading-tight">{persona.positive_trigger}</div>
                           </div>
                           <div className="space-y-1">
                             <div className="text-[8px] font-black text-rose-400 uppercase tracking-widest">{language === 'LV' ? 'KRITISKAIS' : 'CRITICAL'}</div>
                             <div className="text-[10px] font-bold text-slate-400 leading-tight">{persona.critical_concern}</div>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-8 bg-indigo-600 rounded-[2.5rem] shadow-xl border border-white/20">
                    <h4 className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Aggregate Strategy Advice</h4>
                    <p className="text-base font-black text-white leading-relaxed mb-6 italic">{focusGroup.aggregate_sentiment}</p>
                    {focusGroup.recommended_pivot && (
                      <div className="bg-white/10 p-4 rounded-2xl border border-white/5 flex gap-3">
                         <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                         <p className="text-xs font-bold text-indigo-100">{focusGroup.recommended_pivot}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
