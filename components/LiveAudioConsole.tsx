
import React, { useState, useEffect, useRef } from 'react';
/* Update import to include Modality */
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, X, Loader2, Brain, ShieldCheck } from 'lucide-react';
import { AnalysisLanguage, Dataset } from '../types';
import { exportToCSV } from '../utils/csvHelper';

interface LiveAudioConsoleProps {
  language: AnalysisLanguage;
  dataset: Dataset | null;
  onClose: () => void;
}

export const LiveAudioConsole: React.FC<LiveAudioConsoleProps> = ({ language, dataset, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);

  const t = language === 'LV' ? {
    title: 'Live Stratēģijas Saruna',
    subtitle: 'Runājiet ar AI par saviem datiem reāllaikā',
    connecting: 'Savieno ar AI...',
    active: 'AI klausās...',
    mute: 'Izslēgt mikrofonu',
    unmute: 'Ieslēgt mikrofonu',
    close: 'Aizvērt',
    instruction: 'Tu esi vecākais ad veiktspējas analītiķis. Atbildi īsi, stratēģiski.'
  } : {
    title: 'Live Strategy Session',
    subtitle: 'Converse with AI about your data in real-time',
    connecting: 'Connecting to AI...',
    active: 'AI is listening...',
    mute: 'Mute Microphone',
    unmute: 'Unmute Microphone',
    close: 'Close',
    instruction: 'You are a senior ad performance analyst. Be concise and strategic.'
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const createBlob = (data: Float32Array): { data: string; mimeType: string } => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const startSession = async () => {
    setIsConnecting(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Setup audio contexts
    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    audioContextRef.current = outputAudioContext;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Limit context to avoid Oversized Request errors in Live API
      const datasetContext = dataset ? dataset.files.map(f => `DIMENSION: ${f.name} DATA:\n${exportToCSV(f.data.slice(0, 15))}`).join('\n') : 'No data.';

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => [...prev.slice(-3), `AI: ${message.serverContent!.outputTranscription!.text}`]);
            }
            if (message.serverContent?.inputTranscription) {
              setTranscription(prev => [...prev.slice(-3), `YOU: ${message.serverContent!.inputTranscription!.text}`]);
            }
          },
          onerror: (e) => {
            console.error('Live API Error:', e);
            setIsConnecting(false);
          },
          onclose: () => setIsActive(false),
        },
        config: {
          /* Fixed type error by using Modality.AUDIO instead of string */
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }, // Using standard voice name
          },
          systemInstruction: `${t.instruction} Context: ${datasetContext.substring(0, 1000)}`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Session Init Error:', err);
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    startSession();
    return () => {
      if (sessionRef.current) try { sessionRef.current.close(); } catch(e) {}
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) try { audioContextRef.current.close(); } catch(e) {}
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-3xl bg-slate-900 border border-white/10 rounded-[3rem] shadow-2xl p-12 relative overflow-hidden flex flex-col items-center gap-10">
        <button onClick={onClose} className="absolute top-8 right-8 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all"><X className="w-6 h-6" /></button>
        
        <div className="flex flex-col items-center text-center gap-4">
           <div className="inline-flex items-center gap-3 bg-indigo-500/10 text-indigo-400 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-500/20 shadow-inner">
             <Brain className="w-4 h-4" /> Real-time Analytics
           </div>
           <h2 className="text-4xl font-black text-white tracking-tight">{t.title}</h2>
           <p className="text-slate-400 font-medium">{t.subtitle}</p>
        </div>

        <div className="relative flex items-center justify-center w-64 h-64">
           <div className={`absolute inset-0 bg-indigo-500/20 rounded-full blur-[80px] transition-all duration-1000 ${isActive ? 'scale-150 opacity-100' : 'scale-50 opacity-0'}`} />
           <div className={`w-48 h-48 rounded-full border-4 border-white/10 flex items-center justify-center relative bg-slate-900 shadow-2xl transition-all duration-500 ${isActive ? 'scale-110 border-indigo-500/50' : ''}`}>
              {isConnecting ? (
                <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
              ) : (
                <div className="relative">
                   <div className={`absolute -inset-8 bg-indigo-500/20 rounded-full animate-ping ${isActive && !isMuted ? 'opacity-100' : 'opacity-0'}`} />
                   <div className={`p-10 bg-indigo-600 rounded-full shadow-2xl shadow-indigo-500/40 transition-transform ${isActive ? 'scale-110' : ''}`}>
                      {isMuted ? <MicOff className="w-12 h-12 text-white" /> : <Mic className="w-12 h-12 text-white" />}
                   </div>
                </div>
              )}
           </div>
        </div>

        <div className="w-full space-y-4">
           <div className="h-32 overflow-y-auto custom-scrollbar px-6 space-y-3 flex flex-col-reverse">
              {transcription.slice().reverse().map((line, i) => (
                <div key={i} className={`text-sm font-bold tracking-tight ${line.startsWith('AI:') ? 'text-indigo-300' : 'text-slate-400 opacity-60'}`}>{line}</div>
              ))}
              {isConnecting && <div className="text-sm font-black text-indigo-400 animate-pulse uppercase tracking-widest">{t.connecting}</div>}
              {isActive && !isConnecting && <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">● {t.active}</div>}
           </div>
        </div>

        <div className="flex gap-4">
           <button onClick={() => setIsMuted(!isMuted)} className={`px-8 py-4 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all ${isMuted ? 'bg-rose-500 text-white shadow-rose-500/20 shadow-xl' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isMuted ? t.unmute : t.mute}
           </button>
           <button onClick={onClose} className="px-8 py-4 bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all">{t.close}</button>
        </div>
      </div>
    </div>
  );
};
