
import React, { useState, useRef, useEffect } from 'react';
import { analyzeVideoToScenes, analyzeTextToScenes, generateImage, restylePrompts } from '../services/geminiService';

interface SocialMetadata {
  title: string;
  description: string;
  tags: string;
}

interface DistributionMetadata {
  youtube: SocialMetadata;
  tiktok: SocialMetadata;
  instagram: SocialMetadata;
}

interface SceneResult {
  id: string;
  title: string;
  prompt: string;
  sfx: string;
  socialCaption: string;
  imageUrl?: string;
  isGenerating?: boolean;
}

const VISUAL_STYLES = [
  { id: 'imax', label: 'IMAX 70mm Cinematic', icon: '🎥' },
  { id: 'pixar', label: 'Pixar Animation 3D', icon: '🐹' },
  { id: 'ghibli', label: 'Studio Ghibli Hand-drawn', icon: '⛩️' },
  { id: 'cyberpunk', label: 'Cyberpunk Neon Night', icon: '🌃' },
  { id: 'vhs', label: 'Retro VHS 80s Grit', icon: '📼' },
  { id: 'noir', label: 'Noir Detective B&W', icon: '🕵️' },
  { id: 'clay', label: 'Claymation Stop-motion', icon: '🧶' },
  { id: 'ue5', label: 'Unreal Engine 5 Photoreal', icon: '🎮' },
  { id: 'oil', label: 'Classic Oil Painting', icon: '🎨' },
];

const VisualsView: React.FC = () => {
  const [inputMode, setInputMode] = useState<'video' | 'text'>('video');
  const [selectedStyle, setSelectedStyle] = useState(VISUAL_STYLES[0].label);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [storyText, setStoryText] = useState('');
  const [scenes, setScenes] = useState<SceneResult[]>([]);
  const [socialMetadata, setSocialMetadata] = useState<DistributionMetadata | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'youtube' | 'tiktok' | 'instagram'>('youtube');
  const [characterDNA, setCharacterDNA] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRestyling, setIsRestyling] = useState(false);
  const [numScenes, setNumScenes] = useState(8);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [copiedScenes, setCopiedScenes] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (scenes.length > 0 && !isRestyling && !isAnalyzing) {
      handleAutoRestyle();
    }
  }, [selectedStyle]);

  const handleError = async (err: any) => {
    console.error("Engine Error:", err);
    if (err.message?.includes("Requested entity was not found")) {
      alert("Project API Error. Silakan pilih kunci project Penagihan Berbayar yang valid.");
      try {
        await (window as any).aistudio.openSelectKey();
      } catch (e) {
        console.error("Failed to reopen key selector", e);
      }
    } else {
      alert(`System Error: ${err.message}`);
    }
  };

  const handleAutoRestyle = async () => {
    setIsRestyling(true);
    try {
      const restyled = await restylePrompts(scenes, selectedStyle, characterDNA);
      setScenes(prev => prev.map((s, idx) => ({
        ...s,
        ...restyled[idx],
        imageUrl: undefined 
      })));
    } catch (err) {
      handleError(err);
    } finally {
      setIsRestyling(false);
    }
  };

  const startAnalysis = async () => {
    if (inputMode === 'text' && !storyText.trim()) return alert("Masukkan teks naskah.");
    if (inputMode === 'video' && !videoUrl) return alert("Unggah sumber video.");

    setIsAnalyzing(true);
    try {
      let result;
      if (inputMode === 'video') {
        const frames = await captureFrames();
        result = await analyzeVideoToScenes(frames, numScenes, selectedStyle);
      } else {
        result = await analyzeTextToScenes(storyText, numScenes, selectedStyle);
      }
      setCharacterDNA(result.characterDNA || "");
      setSocialMetadata(result.socialMetadata || null);
      setScenes(result.scenes.map((s: any) => ({ 
        ...s, 
        id: Math.random().toString(36).substr(2, 9)
      })));
      setCopiedScenes(new Set()); 
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const captureFrames = async () => {
    const video = videoRef.current;
    if (!video) return [];
    if (video.readyState < 1) await new Promise(r => video.onloadedmetadata = r);
    const frames = [];
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 360;
    const ctx = canvas.getContext('2d')!;
    const effectiveNum = Math.min(numScenes, 12); 
    const step = video.duration / (effectiveNum + 1);
    for (let i = 1; i <= effectiveNum; i++) {
      video.currentTime = step * i;
      await new Promise(r => video.onseeked = r);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push({ data: canvas.toDataURL('image/jpeg', 0.6).split(',')[1], mimeType: 'image/jpeg' });
    }
    return frames;
  };

  const renderVisual = async (id: string) => {
    const scene = scenes.find(s => s.id === id);
    if (!scene) return;
    setScenes(prev => prev.map(s => s.id === id ? { ...s, isGenerating: true } : s));
    try {
      const url = await generateImage(scene.prompt, aspectRatio);
      setScenes(prev => prev.map(s => s.id === id ? { ...s, imageUrl: url, isGenerating: false } : s));
    } catch (err) {
      handleError(err);
      setScenes(prev => prev.map(s => s.id === id ? { ...s, isGenerating: false } : s));
    }
  };

  const handleNumChange = (val: string) => {
    const n = parseInt(val);
    if (isNaN(n)) return;
    setNumScenes(Math.min(Math.max(n, 1), 1999));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(id);
    if (!id.startsWith('meta')) {
      setCopiedScenes(prev => new Set(prev).add(id));
    }
    setTimeout(() => setCopyStatus(null), 2000);
  };

  return (
    <div className="space-y-16">
      <section className="text-center space-y-4 mb-8">
        <h2 className="text-7xl font-black italic tracking-tighter uppercase leading-none text-white">fotocopy video ASWRXX</h2>
        <p className="text-red-600 font-bold tracking-[0.3em] uppercase italic">Pusat Produksi AI Generasi Terbaru</p>
      </section>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
           <div className="glass-card rounded-[3.5rem] p-10 border-white/10 relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-transparent to-red-600"></div>
             
             <div className="flex justify-between items-center mb-8">
               <div className="flex gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5">
                 {['video', 'text'].map(m => (
                   <button 
                     key={m} 
                     onClick={() => setInputMode(m as any)}
                     className={`px-12 py-4 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${inputMode === m ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-white/30 hover:text-white'}`}
                   >
                     Sumber {m === 'video' ? 'Video' : 'Teks'}
                   </button>
                 ))}
               </div>
               <span className="text-[12px] font-black text-white/30 uppercase tracking-[0.4em]">Layer Produksi</span>
             </div>

             {inputMode === 'video' ? (
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="aspect-video bg-black/60 border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:border-red-600/50 transition-all group overflow-hidden relative shadow-inner"
               >
                 {videoUrl ? (
                   <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" />
                 ) : (
                   <div className="text-center space-y-6">
                     <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-5xl group-hover:scale-110 transition-transform mx-auto">🎞️</div>
                     <p className="text-[14px] font-black text-white/50 uppercase tracking-[0.4em]">Klik untuk Unggah Master Source</p>
                   </div>
                 )}
               </div>
             ) : (
               <textarea 
                 value={storyText}
                 onChange={e => setStoryText(e.target.value)}
                 placeholder="Tulis naskah atau narasi film Anda di sini..."
                 className="w-full aspect-video bg-black/60 border border-white/10 rounded-[3rem] p-12 text-xl italic text-white/90 focus:border-red-600/50 outline-none resize-none custom-scrollbar shadow-inner"
               />
             )}
             <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={e => { if(e.target.files?.[0]) setVideoUrl(URL.createObjectURL(e.target.files[0])); }} />
           </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <div className="glass-card rounded-[3.5rem] p-12 border-white/10 flex flex-col justify-between h-full bg-white/[0.01]">
             <div className="space-y-10">
               <h4 className="text-[14px] font-black text-red-600 uppercase tracking-[0.5em] italic border-b border-white/5 pb-4">Parameter Mesin</h4>
               
               <div className="space-y-6">
                 <label className="text-[14px] font-black text-white/80 uppercase tracking-widest italic flex justify-between items-center">
                    <span>Palet Visual</span>
                    {isRestyling && <span className="text-emerald-500 animate-pulse text-[10px]">UPDATING...</span>}
                 </label>
                 <div className="grid grid-cols-2 gap-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                    {VISUAL_STYLES.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => setSelectedStyle(s.label)}
                        className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all ${selectedStyle === s.label ? 'bg-red-600 border-red-400 shadow-[0_0_30px_rgba(255,0,0,0.3)] scale-[1.05] z-10' : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'}`}
                      >
                        <span className="text-3xl">{s.icon}</span>
                        <span className="text-[11px] font-black uppercase text-white tracking-widest text-center leading-tight">{s.label}</span>
                      </button>
                    ))}
                 </div>
               </div>

               <div className="space-y-6">
                 <div className="flex justify-between items-center text-[14px] font-black text-white/80 uppercase tracking-widest italic">
                    <span>Anggaran Adegan</span>
                    <div className="flex items-center gap-3 bg-black/60 rounded-2xl p-2 border border-white/20 shadow-inner">
                      <button 
                        onClick={() => setNumScenes(Math.max(1, numScenes - 1))}
                        className="w-12 h-12 flex items-center justify-center text-white bg-white/5 hover:bg-red-600 hover:text-white rounded-xl transition-all text-2xl font-bold border border-white/10"
                      >
                        -
                      </button>
                      <input 
                        type="number" 
                        value={numScenes} 
                        onChange={(e) => handleNumChange(e.target.value)}
                        className="w-20 bg-transparent text-center text-white text-3xl font-black focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button 
                        onClick={() => setNumScenes(Math.min(1999, numScenes + 1))}
                        className="w-12 h-12 flex items-center justify-center text-white bg-white/5 hover:bg-red-600 hover:text-white rounded-xl transition-all text-2xl font-bold border border-white/10"
                      >
                        +
                      </button>
                    </div>
                 </div>
                 <input type="range" min="1" max="1999" value={numScenes} onChange={e => setNumScenes(parseInt(e.target.value))} className="w-full h-2 bg-white/10 rounded-full appearance-none accent-red-600 cursor-pointer" />
               </div>

               <div className="space-y-6">
                 <label className="text-[14px] font-black text-white/80 uppercase tracking-widest italic">Rasio Layar</label>
                 <div className="flex gap-4">
                    {['16:9', '9:16'].map(r => (
                      <button 
                        key={r}
                        onClick={() => setAspectRatio(r as any)}
                        className={`flex-1 py-8 rounded-[2rem] text-[18px] font-black border transition-all ${aspectRatio === r ? 'bg-white text-black border-white shadow-[0_0_40px_rgba(255,255,255,0.2)] scale-[1.05] z-10' : 'bg-black/40 text-white/40 border-white/10 hover:border-white/40 hover:text-white'}`}
                      >
                        {r}
                      </button>
                    ))}
                 </div>
               </div>
             </div>

             <button 
               onClick={startAnalysis} 
               disabled={isAnalyzing || isRestyling}
               className="w-full py-10 mt-12 rounded-[3rem] bg-red-600 text-white font-black uppercase tracking-[0.5em] text-[16px] hover:bg-white hover:text-black transition-all shadow-[0_20px_50px_rgba(255,0,0,0.3)] disabled:opacity-20 active:scale-95"
             >
               {isAnalyzing ? 'MEMPROSES...' : 'STAR COK'}
             </button>
           </div>
        </div>
      </div>

      {socialMetadata && (
        <section className="animate-in fade-in slide-in-from-bottom-10 duration-1000 mt-20">
           <div className="flex items-center gap-10 mb-12">
            <h3 className="text-5xl font-black italic tracking-tighter uppercase text-white">HOOK VIRAL</h3>
            <div className="flex-1 h-[1px] bg-white/10"></div>
          </div>
          
          <div className="glass-card rounded-[4rem] p-16 border-white/5">
            <div className="flex flex-wrap gap-6 mb-16">
              {[
                { id: 'youtube', label: 'YouTube', icon: '🔴' },
                { id: 'tiktok', label: 'TikTok', icon: '🎵' },
                { id: 'instagram', label: 'Instagram', icon: '📸' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlatform(p.id as any)}
                  className={`px-12 py-5 rounded-full text-[14px] font-black uppercase tracking-widest transition-all border ${selectedPlatform === p.id ? 'bg-red-600 text-white border-red-500 shadow-xl scale-110' : 'bg-white/5 text-white/40 border-white/10 hover:border-white/30'}`}
                >
                  <span className="mr-3">{p.icon}</span> {p.label}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-[12px] font-black uppercase text-red-600 tracking-[0.4em] italic">Judul Headline</p>
                  <button onClick={() => copyToClipboard(socialMetadata[selectedPlatform].title, 'meta-title')} className="text-[11px] font-black uppercase text-white/30 hover:text-white transition-colors">
                    {copyStatus === 'meta-title' ? 'DI SALIN' : 'SALIN'}
                  </button>
                </div>
                <div className={`p-10 rounded-[2.5rem] border transition-all min-h-[150px] flex items-center ${copyStatus === 'meta-title' ? 'border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'bg-white/[0.03] border-white/5'}`}>
                  <p className="text-2xl font-black italic text-white/95 leading-tight">"{socialMetadata[selectedPlatform].title}"</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-[12px] font-black uppercase text-red-600 tracking-[0.4em] italic">Deskripsi Algoritma</p>
                  <button onClick={() => copyToClipboard(socialMetadata[selectedPlatform].description, 'meta-desc')} className="text-[11px] font-black uppercase text-white/30 hover:text-white transition-colors">
                    {copyStatus === 'meta-desc' ? 'DI SALIN' : 'SALIN'}
                  </button>
                </div>
                <div className={`p-10 rounded-[2.5rem] border transition-all min-h-[150px] ${copyStatus === 'meta-desc' ? 'border-emerald-500/30 bg-emerald-500/5' : 'bg-white/[0.03] border-white/5'}`}>
                  <p className="text-base text-white/70 leading-relaxed italic">{socialMetadata[selectedPlatform].description}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-[12px] font-black uppercase text-red-600 tracking-[0.4em] italic">Tag Trending</p>
                  <button onClick={() => copyToClipboard(socialMetadata[selectedPlatform].tags, 'meta-tags')} className="text-[11px] font-black uppercase text-white/30 hover:text-white transition-colors">
                    {copyStatus === 'meta-tags' ? 'DI SALIN' : 'SALIN'}
                  </button>
                </div>
                <div className={`p-10 rounded-[2.5rem] border transition-all min-h-[150px] ${copyStatus === 'meta-tags' ? 'border-emerald-500/30 bg-emerald-500/5' : 'bg-white/[0.03] border-white/5'}`}>
                  <p className="text-sm font-bold tracking-[0.2em] text-emerald-500/90 leading-loose">{socialMetadata[selectedPlatform].tags}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {scenes.length > 0 && (
        <section className="space-y-16 mt-32 animate-in fade-in slide-in-from-bottom-20 duration-1000 pb-20">
          <div className="flex items-center gap-10">
            <h3 className="text-6xl font-black italic tracking-tighter uppercase text-white">INDEX ADEGAN</h3>
            <div className="flex-1 h-[1px] bg-white/10"></div>
            <span className="text-[14px] font-black text-white/40 uppercase tracking-[0.5em] italic">{scenes.length} Adegan Terdaftar</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {scenes.slice(0, 100).map((scene, idx) => ( 
              <div key={scene.id} className={`group relative glass-card rounded-[4rem] border transition-all duration-700 ${copiedScenes.has(scene.id) ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_50px_rgba(16,185,129,0.1)]' : 'border-white/5 hover:border-red-500/30 hover:shadow-[0_0_50px_rgba(255,0,0,0.1)]'}`}>
                <div className="absolute top-0 left-8 w-1 h-full film-strip-border opacity-10"></div>
                <div className="absolute top-0 right-8 w-1 h-full film-strip-border opacity-10"></div>

                <div className="p-12 pl-24 pr-24 space-y-12">
                  <div className="flex justify-between items-center">
                    <span className={`text-[12px] font-black px-8 py-3 rounded-full text-white uppercase tracking-[0.3em] italic transition-all ${copiedScenes.has(scene.id) ? 'bg-emerald-600 scale-110 shadow-lg shadow-emerald-600/20' : 'bg-red-600'}`}>FRAME {idx + 1}</span>
                    <h4 className="text-3xl font-black italic uppercase text-white leading-tight flex-1 ml-8">{scene.title}</h4>
                  </div>

                  <div className="space-y-6 relative">
                    <div className={`p-10 rounded-[3rem] border relative group/script transition-all ${copiedScenes.has(scene.id) ? 'bg-emerald-500/10 border-emerald-500/20 shadow-inner' : 'bg-white/[0.03] border-white/5 shadow-inner'}`}>
                       <button 
                        onClick={() => copyToClipboard(`PROMPT VISUAL: ${scene.prompt}\nEFEK SUARA: ${scene.sfx}`, scene.id)}
                        className={`absolute top-8 right-8 p-4 rounded-2xl transition-all border group-hover/script:opacity-100 opacity-0 ${copiedScenes.has(scene.id) ? 'bg-emerald-600 border-emerald-400' : 'bg-white/10 hover:bg-red-600 border-white/20'}`}
                        title="Salin Data Naskah"
                       >
                         {copyStatus === scene.id ? (
                           <span className="text-[10px] font-black uppercase text-white tracking-widest">DI SALIN</span>
                         ) : (
                           <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                           </svg>
                         )}
                       </button>

                       <div className="space-y-8">
                         <div>
                           <p className={`text-[12px] font-black uppercase tracking-[0.4em] mb-4 italic flex items-center gap-3 ${copiedScenes.has(scene.id) ? 'text-emerald-500' : 'text-red-600'}`}>
                             <span className={`w-2 h-2 rounded-full animate-pulse ${copiedScenes.has(scene.id) ? 'bg-emerald-500' : 'bg-red-600'}`}></span>
                             Prompt Visual
                           </p>
                           <p className={`text-lg italic leading-relaxed font-medium transition-colors ${copiedScenes.has(scene.id) ? 'text-emerald-50/90' : 'text-white/80'}`}>{scene.prompt}</p>
                         </div>
                         <div className={`pt-8 border-t ${copiedScenes.has(scene.id) ? 'border-emerald-500/20' : 'border-white/10'}`}>
                           <p className="text-[12px] font-black uppercase text-white/40 tracking-[0.4em] mb-3 italic">Arsitektur Efek Suara</p>
                           <p className={`text-sm font-bold tracking-[0.3em] ${copiedScenes.has(scene.id) ? 'text-emerald-400' : 'text-emerald-500/80'}`}>{scene.sfx.toUpperCase()}</p>
                         </div>
                       </div>
                    </div>
                  </div>

                  <div className={`relative rounded-[3.5rem] overflow-hidden bg-black shadow-[0_50px_100px_rgba(0,0,0,0.9)] border border-white/5 ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] max-w-[400px] mx-auto'}`}>
                    {scene.imageUrl ? (
                      <div className="relative w-full h-full group/media">
                        <img src={scene.imageUrl} className="w-full h-full object-cover" alt={scene.title} />
                        <div className="absolute inset-0 bg-black/75 opacity-0 group-hover/media:opacity-100 transition-all flex items-center justify-center backdrop-blur-xl">
                          <button onClick={() => renderVisual(scene.id)} className="px-16 py-6 bg-white text-black rounded-full text-[14px] font-black uppercase tracking-widest hover:scale-110 transition-transform shadow-2xl active:scale-95">Render Ulang Gaya</button>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/[0.01]">
                        <button 
                          onClick={() => renderVisual(scene.id)} 
                          disabled={scene.isGenerating || isRestyling}
                          className="px-16 py-7 bg-white text-black text-[14px] font-black rounded-full uppercase tracking-[0.3em] shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:bg-red-600 hover:text-white transition-all disabled:opacity-30 active:scale-95"
                        >
                          {scene.isGenerating ? 'MERERENDER...' : 'BUAT VISUAL'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={`p-8 rounded-[2.5rem] border transition-all ${copiedScenes.has(scene.id) ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/[0.02] border-white/5 group-hover:border-red-500/30'}`}>
                    <p className={`text-[12px] font-black uppercase tracking-[0.4em] mb-3 italic ${copiedScenes.has(scene.id) ? 'text-emerald-500' : 'text-red-600'}`}>Catatan Sutradara:</p>
                    <p className="text-sm text-white/50 italic font-medium leading-relaxed">"{scene.socialCaption}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(isAnalyzing || isRestyling) && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-700">
          <div className="relative w-40 h-40 mb-12">
             <div className="absolute inset-0 border-[8px] border-red-600/10 rounded-full"></div>
             <div className="absolute inset-0 border-[8px] border-red-600 border-t-transparent animate-spin rounded-full shadow-[0_0_50px_rgba(255,0,0,0.3)]"></div>
          </div>
          <h3 className="text-3xl font-black italic uppercase tracking-[0.6em] text-white mb-3 animate-pulse">
            {isRestyling ? 'MENERAPKAN DNA' : 'MEMUAT'}
          </h3>
          <p className="text-white font-bold uppercase tracking-[0.4em] text-[12px]">mohon tunggu sebentar...</p>
        </div>
      )}
    </div>
  );
};

export default VisualsView;
