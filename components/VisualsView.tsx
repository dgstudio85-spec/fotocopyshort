
import React, { useState, useRef, useEffect } from 'react';
import { analyzeVideoToScenes, analyzeTextToScenes, generateImage } from '../services/geminiService';

interface SocialPlatformData {
  title: string;
  description: string;
  tags: string;
}

interface SocialMetadata {
  youtube: SocialPlatformData;
  tiktok: SocialPlatformData;
  instagram: SocialPlatformData;
}

interface SceneResult {
  id: string;
  title: string;
  prompt: string;
  sfx: string;
  timestamp: number;
  imageUrl?: string;
  isGenerating?: boolean;
}

type InputMode = 'video' | 'text';

const VISUAL_STYLES = [
  { id: '3d-cartoon', label: '3D Cartoon', icon: '🧸' },
  { id: '3d-realistic', label: '3D Realistic', icon: '🕶️' },
  { id: '3d-chibi', label: '3D Chibi', icon: '🐥' },
  { id: '3d-lowpoly', label: '3D Low Poly', icon: '💎' },
  { id: '2d-flat', label: '2D Cartoon Flat', icon: '🎨' },
  { id: '2d-anime', label: '2D Anime', icon: '⛩️' },
  { id: 'motion-graphic', label: 'Motion Graphic 2D', icon: '📈' },
  { id: 'parallax', label: '2.5D Parallax', icon: '🖼️' },
  { id: 'ai-video', label: 'AI Generated Video', icon: '🎬' },
  { id: 'consistent', label: 'AI Character Consistent', icon: '👥' },
  { id: 'cinematic', label: 'Cinematic Style', icon: '🎞️' },
  { id: 'stop-motion', label: 'Stop Motion Style', icon: '🧶' },
];

const VisualsView: React.FC = () => {
  const [inputMode, setInputMode] = useState<InputMode>('video');
  const [selectedStyle, setSelectedStyle] = useState(VISUAL_STYLES[10].label);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [storyText, setStoryText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBatchRendering, setIsBatchRendering] = useState(false);
  const [scenes, setScenes] = useState<SceneResult[]>([]);
  const [socialMetadata, setSocialMetadata] = useState<SocialMetadata | null>(null);
  const [characterDNA, setCharacterDNA] = useState<string>('');
  const [progress, setProgress] = useState('');
  const [numScenes, setNumScenes] = useState(10);
  const [globalAspectRatio, setGlobalAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [markedPrompts, setMarkedPrompts] = useState<Set<string>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      const messages = [
        `Mendefinisikan DNA Karakter...`,
        `Merancang Storyboard...`,
        `Sinkronisasi Visual & Audio...`,
        `Optimasi Gemini Flash...`,
        `Finalisasi Naskah Produksi...`
      ];
      let i = 0;
      interval = setInterval(() => {
        setProgress(messages[i % messages.length]);
        i++;
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    }
  };

  const handleCopyInstruction = (scene: SceneResult) => {
    const combinedText = `### PRODUCTION INSTRUCTION ###\n\n[VISUAL PROMPT]\n${scene.prompt}\n\n[SOUND DESIGN/SFX]\n🔊 ${scene.sfx}`;
    navigator.clipboard.writeText(combinedText);
    setCopiedId(scene.id);
    setMarkedPrompts(prev => {
      const next = new Set(prev);
      next.add(scene.id);
      return next;
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const captureFrames = async (count: number) => {
    const video = videoRef.current;
    if (!video) return [];
    if (video.readyState < 1) {
      await new Promise((resolve) => { video.onloadedmetadata = resolve; });
    }
    const frames = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    canvas.width = 480; 
    canvas.height = 270;
    const duration = video.duration;
    const analysisFrameCount = 8; 
    const analysisInterval = duration / (analysisFrameCount + 1);
    for (let i = 1; i <= analysisFrameCount; i++) {
      setProgress(`Snapshot ${i}/${analysisFrameCount}...`);
      video.currentTime = analysisInterval * i;
      await new Promise(resolve => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve(null);
        };
        video.addEventListener('seeked', onSeeked);
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push({ 
        data: canvas.toDataURL('image/jpeg', 0.6).split(',')[1], 
        mimeType: 'image/jpeg' 
      });
    }
    return frames;
  };

  const startAnalysis = async () => {
    if (inputMode === 'text' && !storyText.trim()) return alert("Tulis naskah!");
    if (inputMode === 'video' && !videoUrl) return alert("Upload video!");

    setIsAnalyzing(true);
    setProgress("Initializing Gemini Engine...");
    
    try {
      let result;
      if (inputMode === 'video') {
        const frames = await captureFrames(numScenes);
        result = await analyzeVideoToScenes(frames, numScenes, selectedStyle);
      } else {
        result = await analyzeTextToScenes(storyText, numScenes, selectedStyle);
      }

      if (!result || !result.scenes) throw new Error("AI output empty.");

      const newScenes = result.scenes.map((s: any, idx: number) => ({
        ...s,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: idx
      }));

      setScenes(newScenes);
      setSocialMetadata(result.socialMetadata);
      setCharacterDNA(result.characterDNA);
      setMarkedPrompts(new Set()); 
    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const visualizeScene = async (id: string) => {
    const scene = scenes.find(s => s.id === id);
    if (!scene || scene.imageUrl || scene.isGenerating) return;
    setScenes(prev => prev.map(s => s.id === id ? { ...s, isGenerating: true } : s));
    try {
      const url = await generateImage(scene.prompt, globalAspectRatio);
      setScenes(prev => prev.map(s => s.id === id ? { ...s, imageUrl: url, isGenerating: false } : s));
    } catch (err) {
      setScenes(prev => prev.map(s => s.id === id ? { ...s, isGenerating: false } : s));
    }
  };

  const renderAllScenes = async () => {
    if (scenes.length === 0 || isBatchRendering) return;
    setIsBatchRendering(true);
    const concurrencyLimit = 3;
    const pendingScenes = scenes.filter(s => !s.imageUrl);
    for (let i = 0; i < pendingScenes.length; i += concurrencyLimit) {
      const chunk = pendingScenes.slice(i, i + concurrencyLimit);
      await Promise.all(chunk.map(scene => visualizeScene(scene.id)));
    }
    setIsBatchRendering(false);
  };

  return (
    <div className="space-y-16 pb-32">
      {/* Mode Selector */}
      <div className="flex justify-center">
        <div className="bg-white/5 p-2 rounded-[2.5rem] border border-white/10 flex items-center shadow-2xl">
          <button onClick={() => setInputMode('video')} className={`px-10 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${inputMode === 'video' ? 'bg-red-600 text-white shadow-xl' : 'text-white/40 hover:text-white'}`}>🎥 VIDEO SOURCE</button>
          <button onClick={() => setInputMode('text')} className={`px-10 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${inputMode === 'text' ? 'bg-red-600 text-white shadow-xl' : 'text-white/40 hover:text-white'}`}>✍️ TEXT SOURCE</button>
        </div>
      </div>

      <section className="bg-white/5 backdrop-blur-2xl p-1 rounded-[3.5rem] border border-white/10 shadow-2xl overflow-hidden">
        <div className="p-10 flex flex-col lg:flex-row gap-12">
          <div className="lg:w-1/2 space-y-6">
            {inputMode === 'video' ? (
               !videoUrl ? (
                <div onClick={() => fileInputRef.current?.click()} className="group cursor-pointer aspect-video border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center hover:border-red-500/50 transition-all bg-black/20">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-2xl mb-4 group-hover:bg-red-600 group-hover:scale-110 transition-all">📹</div>
                  <h3 className="text-sm font-black text-white uppercase italic text-center">Analisis Tokoh Video<br/><span className="text-[10px] opacity-40 lowercase tracking-[0.2em]">Character Persistence Engine</span></h3>
                </div>
              ) : (
                <div className="relative aspect-video rounded-[2.5rem] overflow-hidden bg-black/60 border border-white/10 shadow-inner">
                  <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" controls />
                </div>
              )
            ) : (
              <div className="relative aspect-video rounded-[3rem] overflow-hidden bg-black/60 border border-white/10 flex flex-col p-8">
                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">NASHA CERITA (STORYLINE)</label>
                <textarea 
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  placeholder="Ceritakan kejadian di sini agar karakter tetap konsisten..."
                  className="flex-1 bg-transparent border-none text-white text-sm font-medium leading-relaxed italic outline-none resize-none custom-scrollbar"
                />
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 text-center">
                <p className="text-[8px] font-black text-white/20 uppercase mb-1 tracking-widest">RASIO PRODUKSI</p>
                <div className="flex justify-center gap-2">
                  <button onClick={() => setGlobalAspectRatio('16:9')} className={`px-3 py-1 rounded-lg text-[9px] font-black ${globalAspectRatio === '16:9' ? 'bg-white text-black' : 'bg-white/5 text-white/40'}`}>16:9</button>
                  <button onClick={() => setGlobalAspectRatio('9:16')} className={`px-3 py-1 rounded-lg text-[9px] font-black ${globalAspectRatio === '9:16' ? 'bg-white text-black' : 'bg-white/5 text-white/40'}`}>9:16</button>
                </div>
              </div>
              <button onClick={() => { setVideoUrl(null); setStoryText(''); setScenes([]); setSocialMetadata(null); setMarkedPrompts(new Set()); }} className="py-4 rounded-3xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-[10px] font-black uppercase tracking-widest transition-all border border-white/10">RESET ENGINE</button>
            </div>
          </div>

          <div className="lg:w-1/2 flex flex-col justify-center space-y-8">
            <div className="bg-black/40 p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-8">
              <div className="space-y-4">
                <h4 className="text-white/40 font-black text-[9px] uppercase tracking-[0.3em] italic">Artist Style Selection</h4>
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-2 bg-black/20 rounded-2xl border border-white/5">
                  {VISUAL_STYLES.map((style) => (
                    <button key={style.id} onClick={() => setSelectedStyle(style.label)} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${selectedStyle === style.label ? 'bg-red-600 border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.4)] scale-105' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
                      <span className="text-lg mb-1">{style.icon}</span>
                      <span className="text-[7px] font-black uppercase text-center text-white/80">{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-white/40 font-black text-[9px] uppercase tracking-[0.3em] italic">Kuantitas Adegan</h4>
                  <span className="bg-red-600 px-3 py-1 rounded-lg text-xs font-black text-white italic">{numScenes} SCANES</span>
                </div>
                <div className="flex items-center gap-6 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <input type="range" min="1" max="100" step="1" value={numScenes} onChange={(e) => setNumScenes(parseInt(e.target.value))} className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-600" />
                  <input type="number" min="1" max="1000" value={numScenes} onChange={(e) => setNumScenes(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))} className="w-20 bg-black/60 border border-white/10 rounded-xl py-2 text-center text-white font-black text-xs outline-none focus:border-red-500" />
                </div>
              </div>

              <button onClick={startAnalysis} disabled={isAnalyzing} className="w-full py-6 rounded-[2.5rem] bg-red-600 text-white font-black uppercase tracking-[0.3em] text-[11px] hover:bg-white hover:text-black transition-all shadow-2xl disabled:opacity-20">
                {isAnalyzing ? 'FLASH ANALYSIS...' : `START STORYBOARDING`}
              </button>
            </div>
          </div>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileChange} />
      </section>

      {isAnalyzing && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center">
          <div className="w-24 h-24 border-4 border-red-600/10 border-t-red-600 animate-spin rounded-full mb-8"></div>
          <p className="text-white font-black uppercase tracking-[0.5em] text-lg animate-pulse">{progress}</p>
        </div>
      )}

      {scenes.length > 0 && (
        <section className="space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/10 pb-8">
             <div className="text-center md:text-left">
               <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Production Storyboard</h2>
               <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] mt-1 font-bold">Consistent Character DNA: <span className="text-white/60">{characterDNA.substring(0, 100)}...</span></p>
             </div>
             <button 
                onClick={renderAllScenes} 
                disabled={isBatchRendering || scenes.every(s => s.imageUrl)}
                className="px-12 py-5 rounded-[2.5rem] bg-white text-black font-black uppercase text-[11px] tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-2xl disabled:opacity-20 flex items-center gap-3"
              >
                {isBatchRendering ? <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin rounded-full"></div> : '🚀 Render All Scenes'}
             </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {scenes.map((scene, idx) => {
              const isMarked = markedPrompts.has(scene.id);
              return (
                <div key={scene.id} className={`flex flex-col border rounded-[3.5rem] overflow-hidden transition-all duration-700 bg-white/5 border-white/10 hover:border-white/20 shadow-2xl ${isMarked ? 'ring-2 ring-emerald-500/50' : ''}`}>
                  <div className="p-10 space-y-6">
                    <div className="flex justify-between items-center bg-black/40 p-4 rounded-3xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <span className={`w-10 h-10 flex items-center justify-center font-black text-xs rounded-2xl transition-all shadow-lg ${isMarked ? 'bg-emerald-500 scale-110' : 'bg-red-600'} text-white`}>{idx + 1}</span>
                        <p className="font-black text-sm uppercase italic truncate text-white">{scene.title}</p>
                      </div>
                      <button 
                        onClick={() => handleCopyInstruction(scene)} 
                        className={`text-[9px] font-black px-4 py-2 rounded-full transition-all flex items-center gap-2 ${copiedId === scene.id ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
                      >
                        {copiedId === scene.id ? '✓ COPIED' : 'COPY ALL'}
                      </button>
                    </div>

                    {/* PRODUCTION INSTRUCTIONS BLOCK */}
                    <div className="space-y-4">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 italic">🎬 Production Instructions (Visual & Audio)</label>
                      <div className={`w-full border p-6 rounded-[2.5rem] shadow-inner space-y-6 transition-all duration-700 ${isMarked ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-black/60 border-white/5'}`}>
                        {/* Visual Prompt Section */}
                        <div className="space-y-2">
                          <span className="text-[8px] font-black text-red-500 uppercase tracking-widest border border-red-500/20 px-2 py-0.5 rounded">Visual Scene Prompt</span>
                          <p className={`text-[11px] font-medium italic leading-relaxed ${isMarked ? 'text-emerald-100' : 'text-white/70'}`}>
                            {scene.prompt}
                          </p>
                        </div>
                        {/* Sound Design Section */}
                        <div className="pt-4 border-t border-white/5 space-y-2">
                          <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest border border-cyan-500/20 px-2 py-0.5 rounded">Sound Design / SFX</span>
                          <p className={`text-[11px] font-black italic tracking-wide leading-relaxed ${isMarked ? 'text-emerald-200/60' : 'text-white/40'}`}>
                            🔊 {scene.sfx}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* IMAGE DISPLAY SECTION (BELOW TEXT) */}
                  <div className={`relative m-10 mt-0 rounded-[3rem] overflow-hidden bg-black/60 border border-white/10 transition-all duration-700 shadow-inner group ${globalAspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] max-h-[600px] w-fit mx-auto'}`}>
                    {scene.imageUrl ? (
                      <img src={scene.imageUrl} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" alt={scene.title} />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-transparent to-black/40">
                        <button onClick={() => visualizeScene(scene.id)} disabled={scene.isGenerating || isBatchRendering} className="px-12 py-5 rounded-[2rem] text-[10px] font-black bg-white text-black hover:bg-red-600 hover:text-white transition-all shadow-2xl disabled:opacity-10 uppercase tracking-widest">
                          {scene.isGenerating ? 'Rendering...' : 'Render Visual'}
                        </button>
                      </div>
                    )}
                    {scene.isGenerating && (
                      <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center backdrop-blur-3xl">
                        <div className="w-12 h-12 border-4 border-red-600/20 border-t-red-600 animate-spin rounded-full mb-4"></div>
                        <span className="text-[9px] font-black text-red-500 tracking-[0.5em] uppercase animate-pulse">Analyzing Frames...</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default VisualsView;
