
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
      alert("Project API belum aktif atau salah. Silakan pilih API Key dari project yang valid.");
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
    if (inputMode === 'text' && !storyText.trim()) return alert("Enter script text.");
    if (inputMode === 'video' && !videoUrl) return alert("Upload video source.");

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
    setCopiedScenes(prev => new Set(prev).add(id));
    setTimeout(() => setCopyStatus(null), 2000);
  };

  return (
    <div className="space-y-20">
      <section className="text-center space-y-4 mb-16">
        <h2 className="text-6xl font-black italic tracking-tighter uppercase leading-none">fotocopy video ASWRXX</h2>
      </section>

      <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8">
           <div className="glass-card rounded-[3.5rem] p-10 border-white/10 relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-transparent to-red-600"></div>
             
             <div className="flex justify-between items-center mb-8">
               <div className="flex gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5">
                 {['video', 'text'].map(m => (
                   <button 
                     key={m} 
                     onClick={() => setInputMode(m as any)}
                     className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inputMode === m ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-white/30 hover:text-white'}`}
                   >
                     {m} Source
                   </button>
                 ))}
               </div>
               <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Cinematic Layer</span>
             </div>

             {inputMode === 'video' ? (
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="aspect-video bg-black/60 border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:border-red-600/50 transition-all group overflow-hidden relative shadow-inner"
               >
                 {videoUrl ? (
                   <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" />
                 ) : (
                   <div className="text-center space-y-4">
                     <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-4xl group-hover:scale-110 transition-transform mx-auto">🎞️</div>
                     <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em]">Upload 4K Master Source</p>
                   </div>
                 )}
               </div>
             ) : (
               <textarea 
                 value={storyText}
                 onChange={e => setStoryText(e.target.value)}
                 placeholder="Tulis naskah atau ide narasi di sini..."
                 className="w-full aspect-video bg-black/60 border border-white/10 rounded-[3rem] p-10 text-lg italic text-white/80 focus:border-red-600/50 outline-none resize-none custom-scrollbar shadow-inner"
               />
             )}
             <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={e => { if(e.target.files?.[0]) setVideoUrl(URL.createObjectURL(e.target.files[0])); }} />
           </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <div className="glass-card rounded-[3.5rem] p-10 border-white/10 flex flex-col justify-between h-full bg-white/[0.01]">
             <div className="space-y-8">
               <h4 className="text-[11px] font-black text-red-600 uppercase tracking-[0.5em] italic">Engine Parameters</h4>
               
               <div className="space-y-4">
                 <label className="text-[9px] font-black text-white/40 uppercase tracking-widest italic flex justify-between">
                    <span>Visual Palette</span>
                    {isRestyling && <span className="text-emerald-500 animate-pulse">Updating...</span>}
                 </label>
                 <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                    {VISUAL_STYLES.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => setSelectedStyle(s.label)}
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all ${selectedStyle === s.label ? 'bg-red-600 border-red-400 shadow-xl' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                      >
                        <span className="text-xl">{s.icon}</span>
                        <span className="text-[7px] font-black uppercase text-white tracking-widest text-center leading-tight">{s.label}</span>
                      </button>
                    ))}
                 </div>
               </div>

               <div className="space-y-4">
                 <div className="flex justify-between items-center text-[10px] font-black text-white/40 uppercase tracking-widest italic">
                    <span>Scene Budget</span>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        value={numScenes} 
                        onChange={(e) => handleNumChange(e.target.value)}
                        className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-red-600 text-center outline-none focus:border-red-600"
                        min="1" max="1999"
                      />
                    </div>
                 </div>
                 <input type="range" min="1" max="1999" value={numScenes} onChange={e => setNumScenes(parseInt(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-red-600 cursor-pointer" />
               </div>

               <div className="flex gap-2">
                  {['16:9', '9:16'].map(r => (
                    <button 
                      key={r}
                      onClick={() => setAspectRatio(r as any)}
                      className={`flex-1 py-4 rounded-2xl text-[10px] font-black border transition-all ${aspectRatio === r ? 'bg-white text-black border-white' : 'bg-black/40 text-white/30 border-white/5'}`}
                    >
                      {r} Ratio
                    </button>
                  ))}
               </div>
             </div>

             <button 
               onClick={startAnalysis} 
               disabled={isAnalyzing || isRestyling}
               className="w-full py-8 mt-10 rounded-[2.5rem] bg-red-600 text-white font-black uppercase tracking-[0.5em] text-[12px] hover:bg-white hover:text-black transition-all shadow-[0_25px_50px_rgba(220,38,38,0.4)] disabled:opacity-20"
             >
               {isAnalyzing ? 'loading...' : 'star cok'}
             </button>
           </div>
        </div>
      </div>

      {socialMetadata && (
        <section className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
           <div className="flex items-center gap-10 mb-12">
            <h3 className="text-5xl font-black italic tracking-tighter uppercase">VIRAL HOOKS</h3>
            <div className="flex-1 h-[1px] bg-white/10"></div>
          </div>
          
          <div className="glass-card rounded-[4rem] p-12 border-white/5">
            <div className="flex flex-wrap gap-4 mb-12">
              {[
                { id: 'youtube', label: 'YouTube', icon: '🔴' },
                { id: 'tiktok', label: 'TikTok', icon: '🎵' },
                { id: 'instagram', label: 'Instagram', icon: '📸' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlatform(p.id as any)}
                  className={`px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border ${selectedPlatform === p.id ? 'bg-red-600 text-white border-red-500 shadow-xl' : 'bg-white/5 text-white/40 border-white/10 hover:border-white/30'}`}
                >
                  <span className="mr-3">{p.icon}</span> {p.label}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase text-red-600 tracking-[0.4em] italic">Headline Hook</p>
                  <button onClick={() => copyToClipboard(socialMetadata[selectedPlatform].title, 'meta-title')} className="text-[9px] font-black uppercase text-white/20 hover:text-white transition-colors">
                    {copyStatus === 'meta-title' ? 'COPIED' : 'COPY'}
                  </button>
                </div>
                <div className={`p-8 rounded-[2rem] border transition-all min-h-[100px] flex items-center ${copyStatus === 'meta-title' ? 'border-emerald-500/30 bg-emerald-500/5' : 'bg-white/[0.03] border-white/5'}`}>
                  <p className="text-xl font-black italic text-white/90 leading-tight">"{socialMetadata[selectedPlatform].title}"</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase text-red-600 tracking-[0.4em] italic">Algorithm Description</p>
                  <button onClick={() => copyToClipboard(socialMetadata[selectedPlatform].description, 'meta-desc')} className="text-[9px] font-black uppercase text-white/20 hover:text-white transition-colors">
                    {copyStatus === 'meta-desc' ? 'COPIED' : 'COPY'}
                  </button>
                </div>
                <div className={`p-8 rounded-[2rem] border transition-all min-h-[100px] ${copyStatus === 'meta-desc' ? 'border-emerald-500/30 bg-emerald-500/5' : 'bg-white/[0.03] border-white/5'}`}>
                  <p className="text-sm text-white/60 leading-relaxed italic">{socialMetadata[selectedPlatform].description}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase text-red-600 tracking-[0.4em] italic">Trending Tags</p>
                  <button onClick={() => copyToClipboard(socialMetadata[selectedPlatform].tags, 'meta-tags')} className="text-[9px] font-black uppercase text-white/20 hover:text-white transition-colors">
                    {copyStatus === 'meta-tags' ? 'COPIED' : 'COPY'}
                  </button>
                </div>
                <div className={`p-8 rounded-[2rem] border transition-all min-h-[100px] ${copyStatus === 'meta-tags' ? 'border-emerald-500/30 bg-emerald-500/5' : 'bg-white/[0.03] border-white/5'}`}>
                  <p className="text-xs font-bold tracking-[0.2em] text-emerald-500/80 leading-loose">{socialMetadata[selectedPlatform].tags}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {scenes.length > 0 && (
        <section className="space-y-16 mt-32 animate-in fade-in slide-in-from-bottom-20 duration-1000 pb-20">
          <div className="flex items-center gap-10">
            <h3 className="text-5xl font-black italic tracking-tighter uppercase">ASWRXXX</h3>
            <div className="flex-1 h-[1px] bg-white/10"></div>
            <span className="text-[11px] font-black text-white/20 uppercase tracking-[0.5em]">{scenes.length} Scenes Indexed</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {scenes.slice(0, 100).map((scene, idx) => ( 
              <div key={scene.id} className={`group relative glass-card rounded-[4rem] border transition-all duration-700 ${copiedScenes.has(scene.id) ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/5 hover:border-red-500/30'}`}>
                <div className="absolute top-0 left-8 w-1 h-full film-strip-border opacity-10"></div>
                <div className="absolute top-0 right-8 w-1 h-full film-strip-border opacity-10"></div>

                <div className="p-12 pl-20 pr-20 space-y-10">
                  <div className="flex justify-between items-center">
                    <span className={`text-[11px] font-black px-6 py-2 rounded-full text-white uppercase tracking-[0.3em] italic transition-colors ${copiedScenes.has(scene.id) ? 'bg-emerald-600' : 'bg-red-600'}`}>Frame {idx + 1}</span>
                    <h4 className="text-2xl font-black italic uppercase text-white/90 leading-tight flex-1 ml-6">{scene.title}</h4>
                  </div>

                  <div className="space-y-4 relative">
                    <div className={`p-8 rounded-[2.5rem] border relative group/script transition-all ${copiedScenes.has(scene.id) ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/[0.03] border-white/5'}`}>
                       <button 
                        onClick={() => copyToClipboard(`VISUAL PROMPT: ${scene.prompt}\nSOUND FX: ${scene.sfx}`, scene.id)}
                        className={`absolute top-6 right-6 p-3 rounded-xl transition-all border group-hover/script:opacity-100 opacity-0 ${copiedScenes.has(scene.id) ? 'bg-emerald-600 border-emerald-400' : 'bg-white/5 hover:bg-red-600 border-white/10'}`}
                        title="Copy Script Data"
                       >
                         {copyStatus === scene.id ? (
                           <span className="text-[9px] font-black uppercase text-white tracking-widest">COPIED</span>
                         ) : (
                           <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                           </svg>
                         )}
                       </button>

                       <div className="space-y-6">
                         <div>
                           <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-3 italic flex items-center gap-2 ${copiedScenes.has(scene.id) ? 'text-emerald-500' : 'text-red-600'}`}>
                             <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${copiedScenes.has(scene.id) ? 'bg-emerald-500' : 'bg-red-600'}`}></span>
                             Visual Prompt
                           </p>
                           <p className={`text-sm italic leading-relaxed font-medium transition-colors ${copiedScenes.has(scene.id) ? 'text-emerald-100/90' : 'text-white/70'}`}>{scene.prompt}</p>
                         </div>
                         <div className={`pt-6 border-t ${copiedScenes.has(scene.id) ? 'border-emerald-500/20' : 'border-white/5'}`}>
                           <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em] mb-2 italic">Sound FX Architecture</p>
                           <p className={`text-xs font-bold tracking-widest ${copiedScenes.has(scene.id) ? 'text-emerald-400' : 'text-emerald-500/80'}`}>{scene.sfx.toUpperCase()}</p>
                         </div>
                       </div>
                    </div>
                  </div>

                  <div className={`relative rounded-[3rem] overflow-hidden bg-black shadow-[0_40px_80px_rgba(0,0,0,0.8)] border border-white/5 ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] max-w-[320px] mx-auto'}`}>
                    {scene.imageUrl ? (
                      <div className="relative w-full h-full group/media">
                        <img src={scene.imageUrl} className="w-full h-full object-cover" alt={scene.title} />
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/media:opacity-100 transition-all flex items-center justify-center backdrop-blur-md">
                          <button onClick={() => renderVisual(scene.id)} className="px-12 py-4 bg-white text-black rounded-full text-[11px] font-black uppercase tracking-widest hover:scale-110 transition-transform shadow-2xl">Re-Render Style</button>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/[0.01]">
                        <button 
                          onClick={() => renderVisual(scene.id)} 
                          disabled={scene.isGenerating || isRestyling}
                          className="px-12 py-5 bg-white text-black text-[11px] font-black rounded-full uppercase tracking-[0.2em] shadow-2xl hover:bg-red-600 hover:text-white transition-all disabled:opacity-30"
                        >
                          {scene.isGenerating ? 'RENDERING...' : 'GENERATE VISUAL'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={`p-6 rounded-3xl border transition-all ${copiedScenes.has(scene.id) ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/[0.02] border-white/5 group-hover:border-red-500/20'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-2 italic ${copiedScenes.has(scene.id) ? 'text-emerald-500' : 'text-red-600'}`}>Director's Script Note:</p>
                    <p className="text-xs text-white/40 italic font-medium leading-relaxed">"{scene.socialCaption}"</p>
                  </div>
                </div>
              </div>
            ))}
            {scenes.length > 100 && (
              <div className="lg:col-span-2 text-center py-20 bg-white/5 rounded-[4rem] border-2 border-dashed border-white/10">
                <p className="text-white/20 font-black uppercase tracking-[0.5em]">Virtualizing {scenes.length - 100} More Sequences...</p>
              </div>
            )}
          </div>
        </section>
      )}

      {(isAnalyzing || isRestyling) && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-700">
          <div className="relative w-48 h-48 mb-16">
             <div className="absolute inset-0 border-[8px] border-red-600/10 rounded-full"></div>
             <div className="absolute inset-0 border-[8px] border-red-600 border-t-transparent animate-spin rounded-full shadow-[0_0_50px_rgba(255,0,0,0.2)]"></div>
          </div>
          <h3 className="text-3xl font-black italic uppercase tracking-[0.5em] text-white mb-4 animate-pulse">
            {isRestyling ? 'Applying Visual DNA' : 'loading'}
          </h3>
          <p className="text-white/30 font-bold uppercase tracking-[0.4em] text-[11px]">
            {isRestyling ? 'Syncing prompts with selected palette architecture...' : 'tunggu sebentar'}
          </p>
        </div>
      )}
    </div>
  );
};

export default VisualsView;
