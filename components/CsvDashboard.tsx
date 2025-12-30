
import React, { useState } from 'react';
import { Dataset, DimensionFile, AnalysisResult, AnalysisLanguage } from '../types';
import { parseCSV } from '../utils/csvHelper';
import { AnalysisView } from './AnalysisView';
import { FileSpreadsheet, Trash2, Plus, Loader2, Play, ArrowLeft, UploadCloud, AlertTriangle } from 'lucide-react';

interface CsvDashboardProps {
  language: AnalysisLanguage;
  onLanguageChange: (lang: AnalysisLanguage) => void;
  onBack: () => void;
}

interface StagedFile {
  file: File;
  detectedType: DimensionFile['type'];
}

export const CsvDashboard: React.FC<CsvDashboardProps> = ({ language, onLanguageChange, onBack }) => {
  // Local State for CSV Workflow
  const [view, setView] = useState<'UPLOAD' | 'ANALYSIS'>('UPLOAD');
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
    setError(null);
  };

  const processFiles = async () => {
    if (stagedFiles.length === 0) return;
    setIsProcessing(true);
    setError(null);
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
        setDataset({ 
            name: stagedFiles[0].file.name.replace('.csv', ''), 
            files: dimensionFiles, 
            source: 'CSV' 
        });
        setView('ANALYSIS');
      } else { 
          setError("Files contain no valid data or could not be parsed."); 
      }
    } catch (err) { 
        console.error(err);
        setError("Error processing files. Please check CSV format."); 
    } finally { 
        setIsProcessing(false); 
    }
  };

  if (view === 'ANALYSIS' && dataset) {
      return (
          <div className="max-w-[1500px] mx-auto px-4 py-12">
              <div className="flex justify-between items-center mb-10">
                  <button onClick={() => setView('UPLOAD')} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase hover:text-slate-900 tracking-widest transition-colors">
                      <ArrowLeft className="w-4 h-4" /> Upload New Files
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
                  analysis={null} // AnalysisView will trigger initial analysis
                  isAnalyzing={false} 
                  language={language} 
                  onLanguageChange={onLanguageChange} 
              />
          </div>
      );
  }

  // Upload View
  return (
    <div className="flex flex-col items-center justify-center min-h-screen max-w-4xl mx-auto px-4 py-20 animate-in fade-in duration-500">
      <button onClick={onBack} className="self-start mb-8 text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest hover:text-slate-600">
          <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>
      
      <div className="w-full bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden p-12 relative">
        <div className="absolute top-0 right-0 p-10 opacity-5">
            <FileSpreadsheet className="w-64 h-64 text-indigo-600" />
        </div>

        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4 relative z-10">CSV Data Staging</h2>
        <p className="text-slate-500 font-medium mb-10 relative z-10 max-w-xl">Upload one or more CSV files. AdPilot will automatically detect dimensions (Demographic, Creative, Daily) and merge them for analysis.</p>

        <div className="space-y-4 mb-12 relative z-10">
          {stagedFiles.map((staged, idx) => (
            <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-5">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                    <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                    <div className="font-bold text-slate-900">{staged.file.name}</div>
                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">{staged.detectedType} Dimension</div>
                </div>
              </div>
              <button onClick={() => setStagedFiles(prev => prev.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          
          <label htmlFor="csv-upload-zone" className={`flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed rounded-3xl cursor-pointer transition-all group ${stagedFiles.length === 0 ? 'border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
            <input type="file" multiple accept=".csv" onChange={handleFileSelection} className="hidden" id="csv-upload-zone" />
            <div className={`p-4 rounded-full transition-transform group-hover:scale-110 ${stagedFiles.length === 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                {stagedFiles.length === 0 ? <UploadCloud className="w-8 h-8" /> : <Plus className="w-6 h-6" />}
            </div>
            <span className={`font-bold ${stagedFiles.length === 0 ? 'text-indigo-900' : 'text-slate-400'}`}>
                {stagedFiles.length === 0 ? 'Click to upload CSV files' : 'Add another file'}
            </span>
          </label>
        </div>

        {error && (
            <div className="mb-8 bg-red-50 text-red-600 px-6 py-4 rounded-2xl border border-red-100 font-bold text-sm flex items-center gap-3 animate-in slide-in-from-top-2 relative z-10">
                <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
            </div>
        )}

        <button 
            onClick={processFiles} 
            disabled={isProcessing || stagedFiles.length === 0} 
            className="w-full py-6 bg-slate-900 hover:bg-indigo-600 text-white font-black rounded-3xl text-lg uppercase tracking-widest flex items-center justify-center gap-4 shadow-xl disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all relative z-10"
        >
          {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />}
          {isProcessing ? 'Processing Data...' : 'Launch Audit'}
        </button>
      </div>
    </div>
  );
};
