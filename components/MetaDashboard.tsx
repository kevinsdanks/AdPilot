
import React, { useState, useEffect } from 'react';
import { Dataset, AnalysisResult, AnalysisLanguage, MetaAdAccount, DateRange } from '../types';
import { initMetaSdk, loginWithMeta, fetchAdAccounts, fetchMetaInsights, fetchMetaPlatformBreakdown } from '../services/metaService';
import { AnalysisView } from './AnalysisView';
import { Facebook, ArrowLeft, ChevronRight, CheckCircle2, Calendar, AlertTriangle, Loader2, Rocket } from 'lucide-react';

const GLOBAL_META_APP_ID = '1235976105092992';

interface MetaDashboardProps {
  language: AnalysisLanguage;
  onLanguageChange: (lang: AnalysisLanguage) => void;
  onBack: () => void;
}

export const MetaDashboard: React.FC<MetaDashboardProps> = ({ language, onLanguageChange, onBack }) => {
  // Local State for Meta Workflow
  const [view, setView] = useState<'CONFIG' | 'ANALYSIS'>('CONFIG');
  const [dataset, setDataset] = useState<Dataset | null>(null);
  
  // Meta Specific State
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<MetaAdAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date State for API Fetching
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return {
        label: 'Last 30 Days',
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
  });

  // Initialize SDK on mount
  useEffect(() => {
    const init = async () => {
        try {
            const customId = localStorage.getItem('adpilot_meta_app_id');
            await initMetaSdk(customId || GLOBAL_META_APP_ID);
        } catch (e) {
            console.error("Meta SDK Init Failed", e);
        }
    };
    init();
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const token = await loginWithMeta();
        setAccessToken(token);
        const fetchedAccounts = await fetchAdAccounts(token);
        setAccounts(fetchedAccounts);
    } catch (err: any) {
        setError(typeof err === 'string' ? err : "Connection failed. Please ensure you are an admin.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleFetchData = async () => {
    if (!accessToken || !selectedAccount) return;
    setIsLoading(true);
    setError(null);

    try {
        const startDate = new Date(dateRange.start);
        if (isNaN(startDate.getTime())) throw new Error("Invalid start date.");

        // 1. Fetch Current Data
        const currentData = await fetchMetaInsights(
            selectedAccount.id, 
            accessToken,
            dateRange.start,
            dateRange.end
        );

        // 2. Fetch Comparison (Graceful fail)
        let prevData: any[] = [];
        try {
             if (startDate.getFullYear() > 2015) {
                const endDate = new Date(dateRange.end);
                const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                
                const prevEndDate = new Date(startDate);
                prevEndDate.setDate(prevEndDate.getDate() - 1);
                const prevStartDate = new Date(prevEndDate);
                prevStartDate.setDate(prevStartDate.getDate() - diffDays + 1);

                prevData = await fetchMetaInsights(
                    selectedAccount.id,
                    accessToken,
                    prevStartDate.toISOString().split('T')[0],
                    prevEndDate.toISOString().split('T')[0]
                );
             }
        } catch (e) { console.warn("Comparison fetch skipped", e); }

        // 3. Fetch Platform Breakdown
        let platformData: any[] = [];
        try {
            platformData = await fetchMetaPlatformBreakdown(
                selectedAccount.id,
                accessToken,
                dateRange.start,
                dateRange.end
            );
        } catch (e) { console.warn("Platform fetch skipped", e); }

        if (!currentData || currentData.length === 0) {
            throw new Error("No data found for this period.");
        }

        setDataset({ 
            name: `Meta: ${selectedAccount.name} (${dateRange.label})`, 
            files: [
                { id: 'meta-ads', name: 'Ad Level Insights', data: currentData, type: 'CREATIVE' },
                { id: 'meta-platform', name: 'Platform Breakdown', data: platformData, type: 'PLATFORM' }
            ], 
            source: 'META',
            currency: selectedAccount.currency,
            comparison: { label: 'Previous Period', data: prevData }
        });
        setView('ANALYSIS');

    } catch (err: any) {
        setError(err.message || "Failed to fetch insights.");
    } finally {
        setIsLoading(false);
    }
  };

  const setPresetDate = (days: number | 'lifetime' | 'month', label: string) => {
      const end = new Date();
      let start = new Date();
      
      if (days === 'lifetime') {
        start = new Date('2010-01-01');
      } else if (days === 'month') {
        start = new Date(end.getFullYear(), end.getMonth(), 1);
      } else {
        start.setDate(end.getDate() - days);
      }
      
      setDateRange({
          label,
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
      });
  };

  // View: Analysis
  if (view === 'ANALYSIS' && dataset) {
      return (
          <div className="max-w-[1500px] mx-auto px-4 py-12">
              <div className="flex justify-between items-center mb-10">
                  <button onClick={() => setView('CONFIG')} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase hover:text-slate-900 tracking-widest transition-colors">
                      <ArrowLeft className="w-4 h-4" /> Change Account / Date
                  </button>
                  <div className="flex items-center gap-4">
                      <div className="flex bg-slate-200/50 p-1 rounded-2xl">
                          {(['ENG', 'LV'] as const).map(lang => (
                              <button key={lang} onClick={() => onLanguageChange(lang)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${language === lang ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{lang}</button>
                          ))}
                      </div>
                      <button onClick={onBack} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                          Exit
                      </button>
                  </div>
              </div>
              <AnalysisView 
                  dataset={dataset} 
                  analysis={null} 
                  isAnalyzing={false} 
                  language={language} 
                  onLanguageChange={onLanguageChange} 
              />
          </div>
      );
  }

  // View: Config (Login & Select)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen max-w-3xl mx-auto px-4 py-12 animate-in fade-in duration-500">
        <button onClick={onBack} className="self-start mb-6 text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest hover:text-slate-600 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
        
        <div className="w-full bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden p-10 relative">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                    <Facebook className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-900">Meta Integration</h2>
                    <p className="text-slate-500 font-medium">Secure direct API connection to Ad Manager.</p>
                </div>
            </div>

            {/* State 1: Not Connected */}
            {!accessToken && (
                <div className="text-center py-10">
                    <p className="text-slate-500 mb-8 max-w-md mx-auto">Connect your Meta account to automatically import campaign data, creative thumbnails, and platform breakdowns.</p>
                    <button 
                        onClick={handleConnect} 
                        disabled={isLoading}
                        className="px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-sm uppercase tracking-widest shadow-xl transition-all disabled:opacity-70 flex items-center gap-3 mx-auto"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Facebook className="w-5 h-5" />}
                        {isLoading ? 'Connecting...' : 'Connect with Facebook'}
                    </button>
                    {error && (
                        <div className="mt-8 bg-red-50 text-red-600 px-6 py-4 rounded-2xl border border-red-100 font-bold text-xs flex items-center justify-center gap-3">
                            <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
                        </div>
                    )}
                </div>
            )}

            {/* State 2: Account Selection */}
            {accessToken && !selectedAccount && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Select Ad Account</h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {accounts.map(acc => (
                            <button key={acc.id} onClick={() => setSelectedAccount(acc)} className="w-full p-5 flex items-center justify-between rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 transition-all group">
                                <div className="text-left">
                                    <div className="font-black text-lg text-slate-800 group-hover:text-indigo-700 transition-colors">{acc.name}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{acc.id} • {acc.currency}</div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all shadow-sm">
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-white" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* State 3: Date Config & Fetch */}
            {accessToken && selectedAccount && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                    <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Active Account</span>
                                <div className="text-xl font-black text-indigo-900">{selectedAccount.name}</div>
                            </div>
                            <button onClick={() => setSelectedAccount(null)} className="text-xs font-bold text-indigo-500 hover:text-indigo-700 underline decoration-indigo-300 decoration-2 underline-offset-4">Change</button>
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2"><Calendar className="w-4 h-4" /> Audit Timeframe</label>
                        
                        <div className="grid grid-cols-4 gap-2">
                            <button onClick={() => setPresetDate(7, 'Last 7 Days')} className={`py-3 px-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateRange.label === 'Last 7 Days' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>7D</button>
                            <button onClick={() => setPresetDate(30, 'Last 30 Days')} className={`py-3 px-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateRange.label === 'Last 30 Days' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>30D</button>
                            <button onClick={() => setPresetDate('month', 'This Month')} className={`py-3 px-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateRange.label === 'This Month' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Month</button>
                            <button onClick={() => setPresetDate('lifetime', 'Lifetime')} className={`py-3 px-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateRange.label === 'Lifetime' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Max</button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Start</span>
                                <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value, label: 'Custom' }))} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">End</span>
                                <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value, label: 'Custom' }))} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 px-6 py-4 rounded-2xl border border-red-100 font-bold text-xs flex items-center gap-3 animate-in slide-in-from-top-2">
                            <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
                        </div>
                    )}

                    <button 
                        onClick={handleFetchData} 
                        disabled={isLoading}
                        className="w-full py-6 bg-slate-900 hover:bg-indigo-600 text-white font-black rounded-3xl text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                        {isLoading ? 'Fetching Intelligence...' : 'Run Audit'}
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};
