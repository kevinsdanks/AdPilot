import React, { useState } from 'react';
import { AppMode, DataRow, Dataset, AnalysisResult } from './types';
import { parseCSV, detectCurrency } from './utils/csvHelper';
import { generateDataset, analyzeDataset } from './services/geminiService';
import { AnalysisView } from './components/AnalysisView';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Sparkles, 
  ArrowLeft, 
  Loader2,
  Rocket,
  AlertCircle
} from 'lucide-react';

const App = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.LANDING);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationTopic, setGenerationTopic] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const { data: parsedData, excludedCount } = parseCSV(text);
        if (parsedData.length > 0) {
          const columns = Object.keys(parsedData[0]);
          const detectedCurrency = detectCurrency(columns);
          
          setDataset({
            name: file.name,
            data: parsedData,
            columns: columns,
            summaryRowsExcluded: excludedCount
          });
          setMode(AppMode.DASHBOARD);
          performAnalysis(parsedData, detectedCurrency);
        } else {
          setError("Could not parse any valid rows. Please check the file format.");
        }
      } catch (err: any) {
        console.error("CSV Parse Error:", err);
        setError(err.message || "An error occurred while parsing the CSV file.");
      }
    };
    reader.onerror = () => {
      setError("Failed to read the file.");
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleGenerate = async () => {
    if (!generationTopic.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const data = await generateDataset(generationTopic);
      setDataset({
        name: `Generated: ${generationTopic}`,
        data: data,
        columns: data.length > 0 ? Object.keys(data[0]) : [],
        summaryRowsExcluded: 0
      });
      setMode(AppMode.DASHBOARD);
      performAnalysis(data, 'USD');
    } catch (error) {
      setError("Failed to generate data. Please check your API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const performAnalysis = async (data: DataRow[], currency: string = 'USD') => {
    setIsAnalyzing(true);
    const result = await analyzeDataset(data, currency);
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  const resetApp = () => {
    setMode(AppMode.LANDING);
    setDataset(null);
    setAnalysis(null);
    setGenerationTopic('');
    setError(null);
  };

  const renderLanding = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-in fade-in zoom-in duration-500">
      <div className="text-center mb-12 max-w-2xl">
        <h1 className="text-6xl font-extrabold text-slate-900 mb-6 tracking-tight flex items-center justify-center gap-4">
          Ad<span className="text-indigo-600">Pilot</span>
          <Rocket className="w-10 h-10 text-indigo-600" />
        </h1>
        <p className="text-xl text-slate-500 leading-relaxed font-medium">
          Professional advertising analytics for modern teams. Transform raw campaign data into strategic growth insights.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
        <button 
          onClick={() => setMode(AppMode.UPLOAD)}
          className="group relative flex flex-col items-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 text-left"
        >
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-6 group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Upload CSV</h2>
          <p className="text-slate-500 text-center font-medium">
            Analyze your existing exports from Meta, Google, or LinkedIn.
          </p>
          <div className="absolute bottom-6 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 font-bold flex items-center gap-2">
            Start Analysis <ArrowLeft className="w-4 h-4 rotate-180" />
          </div>
        </button>

        <button 
          onClick={() => setMode(AppMode.GENERATE)}
          className="group relative flex flex-col items-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl hover:border-purple-300 transition-all duration-300 text-left"
        >
           <div className="p-4 bg-purple-50 text-purple-600 rounded-full mb-6 group-hover:scale-110 transition-transform">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Simulate Data</h2>
          <p className="text-slate-500 text-center font-medium">
            Describe a campaign to generate a realistic scenario for testing.
          </p>
           <div className="absolute bottom-6 opacity-0 group-hover:opacity-100 transition-opacity text-purple-600 font-bold flex items-center gap-2">
            Generate Now <ArrowLeft className="w-4 h-4 rotate-180" />
          </div>
        </button>
      </div>
    </div>
  );

  const renderUpload = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto px-4 animate-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => { setMode(AppMode.LANDING); setError(null); }} className="self-start mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Landing
      </button>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3 max-w-xl w-full">
           <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
           <span className="text-sm font-medium">{error}</span>
        </div>
      )}
      
      <div className="w-full bg-white p-12 rounded-3xl border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-all text-center group">
        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-105 transition-transform">
          <UploadCloud className="w-12 h-12 text-indigo-500" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-3">Upload Data File</h2>
        <p className="text-slate-500 mb-10 font-medium">Meta Ads or generic performance reports (.csv)</p>
        
        <div className="relative inline-block">
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-100 uppercase tracking-widest text-xs">
            Choose File
          </button>
        </div>
      </div>
    </div>
  );

  const renderGenerate = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-xl mx-auto px-4 animate-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => { setMode(AppMode.LANDING); setError(null); }} className="self-start mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Landing
      </button>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3 w-full">
           <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
           <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="w-full bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-purple-100 rounded-2xl">
             <Sparkles className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Generate Data</h2>
        </div>
        
        <p className="text-slate-600 mb-8 font-medium leading-relaxed">
          Describe the campaign type and performance goals. AdPilot will generate a realistic row-level dataset for exploration.
        </p>

        <textarea
          value={generationTopic}
          onChange={(e) => setGenerationTopic(e.target.value)}
          placeholder="e.g., E-commerce campaign for luxury watches with high ROAS on Meta..."
          className="w-full p-6 rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-50 outline-none transition-all resize-none h-40 mb-8 font-medium"
        />

        <button 
          onClick={handleGenerate}
          disabled={!generationTopic.trim() || isGenerating}
          className="w-full py-5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all shadow-xl shadow-purple-100 uppercase tracking-widest text-xs flex items-center justify-center gap-3"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" /> Generate Scenario
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="animate-in fade-in duration-700 pb-20">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div onClick={resetApp} className="cursor-pointer flex items-center gap-3 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-2xl text-slate-900 tracking-tighter">Ad<span className="text-indigo-600">Pilot</span></span>
          </div>
          <div className="flex gap-3">
            <button 
                onClick={resetApp}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              Reset
            </button>
            <button 
              className="px-6 py-2.5 text-xs font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all shadow-xl shadow-slate-200"
              onClick={() => dataset && performAnalysis(dataset.data, detectCurrency(dataset.columns))}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <AnalysisView 
            data={dataset?.data || []} 
            analysis={analysis} 
            isAnalyzing={isAnalyzing} 
            summaryRowsExcluded={dataset?.summaryRowsExcluded || 0}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {mode === AppMode.LANDING && renderLanding()}
      {mode === AppMode.UPLOAD && renderUpload()}
      {mode === AppMode.GENERATE && renderGenerate()}
      {mode === AppMode.DASHBOARD && renderDashboard()}
    </div>
  );
};

export default App;