
import React, { useState, useRef } from 'react';
import { analyzeVideoToScenes, generateImage } from '../services/geminiService';

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
  timestamp: number;
  imageUrl?: string;
  isGenerating?: boolean;
}

const VisualsView: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scenes, setScenes] = useState<SceneResult[]>([]);
  const [socialMetadata, setSocialMetadata] = useState<SocialMetadata | null>(null);
  const [progress, setProgress] = useState('');
  const [numScenes, setNumScenes] = useState(4);
  const [globalAspectRatio, setGlobalAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [duration, setDuration] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setScenes([]);
      setSocialMetadata(null);
      setDuration(null);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const captureFrames = async (count: number) => {
    const video = videoRef.current;
    if (!video) return [];
    const frames = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const points = [];
    for (let i = 0; i < count; i++) points.push(0.05 + (i * (0.9 / (count - 1 || 1))));
    for (const p of points) {
      const ts = video.duration * p;
      video.currentTime = ts;
      await new Promise(resolve => {
        const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(null); };
        video.addEventListener('seeked', onSeeked);
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push({ data: canvas.toDataURL('image/jpeg', 0.8).split(',')[1], mimeType: 'image/jpeg', timestamp: ts });
    }
    return frames;
  };

  const startAnalysis = async () => {
    if (!videoUrl) return;
    setIsAnalyzing(true);
    setScenes([]); 
    setSocialMetadata(null);
    setProgress(`Menganalisis Strategi Viral...`);
    try {
      const frames = await captureFrames(numScenes);
      const result = await analyzeVideoToScenes(frames, numScenes);
      if (result.socialMetadata) {
        setSocialMetadata(result.socialMetadata);
      }
      setScenes(result.scenes.map((s: any, idx: number) => ({
        ...s,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: frames[idx]?.timestamp || 0
      })));
    } catch (err) {
      console.error(err);
      alert("Gagal menganalisis video. Pastikan video valid.");
    } finally {
      setIsAnalyzing(false);
      setProgress("");
    }
  };

  const visualizeScene = async (id: string) => {
    const idx = scenes.findIndex(s => s.id === id);
    if (idx === -1) return;
    const updated = [...scenes];
    updated[idx].isGenerating = true;
    setScenes(updated);
    try {
      const url = await generateImage(scenes[idx].prompt, globalAspectRatio);
      const final = [...scenes];
      final[idx].imageUrl = url;
      final[idx].isGenerating = false;
      setScenes(final);
    } catch (err) {
      alert("Gagal render visual.");
      const final = [...scenes];
      final[idx].isGenerating = false;
      setScenes(final);
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyText = (id: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGlobalFormatChange = (format: "16:9" | "9:16") => {
    setGlobalAspectRatio(format);
    // Reset images when format changes to ensure consistency
    setScenes(prev => prev.map(s => ({ ...s, imageUrl: undefined })));
  };

  const SocialColumn = ({ platform, data, color, icon, isLandscape = false }: { platform: string, data?: SocialPlatformData, color: string, icon: string, isLandscape?: boolean }) => {
    if (!data) return null;

    const labels = {
      youtube: { title: 'Viral Header', desc: 'SEO Meta Description' },
      tiktok: { title: 'Hook Sentence', desc: 'Interaction Caption' },
      instagram: { title: 'Aesthetic Heading', desc: 'Visual Context' }
    };
    const currentLabels = labels[platform as keyof typeof labels];

    return (
      <div className={`bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 hover:border-${color} transition-all group flex flex-col shadow-2xl relative overflow-hidden h-full ${isLandscape ? 'md:flex-row md:items-stretch gap-8' : ''}`}>
        <div className={`absolute -top-10 -right-10 w-40 h-40 bg-${color}/10 blur-[80px] group-hover:bg-${color}/20 transition-all pointer-events-none`}></div>
        <div className={`flex items-center gap-4 mb-8 relative z-10 ${isLandscape ? 'md:mb-0 md:flex-col md:justify-center md:border-r md:border-white/10 md:pr-8' : ''}`}>
          <div className={`w-14 h-14 bg-${color} rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-${color}/30`}>{icon}</div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Platform</span>
            <span className="text-sm font-black text-white uppercase tracking-widest leading-none">{platform}</span>
          </div>
        </div>
        <div className={`space-y-8 flex-1 relative z-10 ${isLandscape ? 'md:grid md:grid-cols-3 md:space-y-0 md:gap-8 md:items-start' : ''}`}>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{currentLabels.title}</label>
              <button onClick={() => handleCopyText(`${platform}-t`, data.title)} className={`text-[9px] font-black uppercase transition-all px-3 py-1 rounded-full ${copiedId === `${platform}-t` ? 'bg-green-500 text-white' : 'text-white/50 hover:text-white bg-white/5'}`}> {copiedId === `${platform}-t` ? '✓ Copied' : 'Copy'} </button>
            </div>
            <div className="bg-black/60 p-5 rounded-3xl border border-white/5 text-xs text-white font-black italic leading-relaxed shadow-inner"> {data.title || "Generating..."} </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{currentLabels.desc}</label>
              <button onClick={() => handleCopyText(`${platform}-d`, data.description)} className={`text-[9px] font-black uppercase transition-all px-3 py-1 rounded-full ${copiedId === `${platform}-d` ? 'bg-green-500 text-white' : 'text-white/50 hover:text-white bg-white/5'}`}> {copiedId === `${platform}-d` ? '✓ Copied' : 'Copy'} </button>
            </div>
            <div className={`bg-white/5 p-5 rounded-3xl border border-white/5 text-[11px] text-white/70 font-medium leading-relaxed overflow-y-auto custom-scrollbar italic shadow-inner ${isLandscape ? 'h-32 md:h-40' : 'max-h-40'}`}> {data.description || "Generating..."} </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">High Reach Tags</label>
              <button onClick={() => handleCopyText(`${platform}-h`, data.tags)} className={`text-[9px] font-black uppercase transition-all px-3 py-1 rounded-full ${copiedId === `${platform}-h` ? 'bg-green-500 text-white' : 'text-white/50 hover:text-white bg-white/5'}`}> {copiedId === `${platform}-h` ? '✓ Copied' : 'Copy'} </button>
            </div>
            <div className="bg-black/60 p-5 rounded-3xl border border-white/5 text-[10px] text-white/40 font-black tracking-tight italic leading-relaxed shadow-inner"> {data.tags || "#trending #viral"} </div>
          </div>
        </div>
        <button 
          onClick={() => handleCopyText(platform, `${data.title}\n\n${data.description}\n\n${data.tags}`)}
          className={`py-5 rounded-[2rem] bg-white/5 hover:bg-${color} hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/10 shadow-xl active:scale-95 ${isLandscape ? 'md:w-48 md:h-full md:mt-0 md:rounded-3xl' : 'w-full mt-10'}`}
        >
          {copiedId === platform ? '✓ Success' : (isLandscape ? 'Salin Paket' : 'Salin Semua Metadata')}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-16 pb-32">
      {/* Upload & Global Controls Section */}
      <section className="bg-white/5 backdrop-blur-2xl p-1 rounded-[3.5rem] border border-white/10 shadow-2xl overflow-hidden">
        {!videoUrl ? (
          <div onClick={() => fileInputRef.current?.click()} className="group cursor-pointer m-4 border-2 border-dashed border-white/10 rounded-[3rem] py-24 flex flex-col items-center justify-center hover:border-red-500/50 transition-all bg-black/20">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-3xl mb-6 group-hover:bg-red-600 group-hover:scale-110 transition-all border border-white/10 shadow-xl">📹</div>
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Impor Video Kamu</h3>
            <p className="text-[11px] text-white/40 font-bold uppercase tracking-[0.3em] mt-3">Analis. Fotocopy. Optimasi.</p>
          </div>
        ) : (
          <div className="p-10 flex flex-col lg:flex-row gap-12">
            <div className="lg:w-1/2 space-y-6">
              <div className="relative aspect-video rounded-[2.5rem] overflow-hidden bg-black/60 border border-white/10 shadow-inner group">
                <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" controls onLoadedMetadata={handleLoadedMetadata} />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-xl z-50">
                    <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-600 animate-spin rounded-full mb-6"></div>
                    <p className="text-red-500 text-[11px] font-black uppercase tracking-[0.5em] animate-pulse">{progress}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-3xl border border-white/10 text-center backdrop-blur-xl">
                  <p className="text-[8px] font-black text-white/20 uppercase mb-1 tracking-widest">Format Durasi</p>
                  <p className="text-white font-black text-base">{duration ? formatTime(duration) : '--:--'}</p>
                </div>
                <button onClick={() => setVideoUrl(null)} className="py-4 rounded-3xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-[10px] font-black uppercase tracking-widest transition-all border border-white/10">Ganti Video</button>
              </div>
            </div>
            <div className="lg:w-1/2 flex flex-col justify-center space-y-8">
              <div className="bg-black/40 p-10 rounded-[3rem] border border-white/10 backdrop-blur-xl shadow-2xl space-y-8">
                {/* Global Aspect Ratio Control */}
                <div className="space-y-4">
                  <h4 className="text-white/40 font-black text-[9px] uppercase tracking-[0.3em] italic">1. Pilih Format Global</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleGlobalFormatChange("16:9")}
                      className={`flex items-center justify-center gap-3 py-5 rounded-[2rem] border transition-all font-black text-[10px] uppercase tracking-widest ${globalAspectRatio === '16:9' ? 'bg-white text-black border-white shadow-xl scale-105' : 'bg-white/5 text-white/30 border-white/5 hover:border-white/20'}`}
                    >
                      <span className="text-lg">📺</span> Landscape
                    </button>
                    <button 
                      onClick={() => handleGlobalFormatChange("9:16")}
                      className={`flex items-center justify-center gap-3 py-5 rounded-[2rem] border transition-all font-black text-[10px] uppercase tracking-widest ${globalAspectRatio === '9:16' ? 'bg-white text-black border-white shadow-xl scale-105' : 'bg-white/5 text-white/30 border-white/5 hover:border-white/20'}`}
                    >
                      <span className="text-lg">📱</span> Portrait
                    </button>
                  </div>
                </div>

                {/* Number of Scenes Control */}
                <div className="space-y-4">
                  <h4 className="text-white/40 font-black text-[9px] uppercase tracking-[0.3em] italic">2. Kepadatan Adegan</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 4, 6, 8].map(n => (
                      <button key={n} onClick={() => setNumScenes(n)} className={`py-4 rounded-2xl text-[11px] font-black uppercase transition-all ${numScenes === n ? 'bg-red-600 text-white shadow-lg shadow-red-500/40' : 'bg-white/5 text-white/30 hover:text-white border border-white/5'}`}>{n}</button>
                    ))}
                  </div>
                </div>

                <button onClick={startAnalysis} disabled={isAnalyzing} className="w-full py-6 rounded-[2.5rem] bg-red-600 text-white font-black uppercase tracking-[0.3em] text-[11px] hover:bg-white hover:text-black transition-all shadow-2xl disabled:opacity-20 active:scale-95">Mulai Fotocopy Video</button>
              </div>
            </div>
          </div>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileChange} />
      </section>

      {/* Social Optimizer Section */}
      {socialMetadata && (
        <section className="space-y-10 animate-in slide-in-from-bottom-20 duration-1000">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="px-4 py-2 bg-red-600 text-[10px] font-black text-white rounded-full uppercase tracking-[0.4em] shadow-lg shadow-red-500/40 animate-pulse">Algoritma Optimal</div>
            <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase drop-shadow-2xl">Social Media Optimizer</h2>
            <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] max-w-lg">Optimasi metadata secara strategis untuk menjangkau viewers maksimal di setiap platform.</p>
          </div>
          <div className="flex flex-col gap-8">
            <div className="w-full h-auto">
              <SocialColumn platform="youtube" data={socialMetadata.youtube} color="red-600" icon="📺" isLandscape={true} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <SocialColumn platform="tiktok" data={socialMetadata.tiktok} color="cyan-400" icon="🎵" />
              <SocialColumn platform="instagram" data={socialMetadata.instagram} color="pink-500" icon="📸" />
            </div>
          </div>
        </section>
      )}

      {/* Gallery Section */}
      {scenes.length > 0 && (
        <section className="space-y-12 animate-in fade-in duration-1000">
          <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Gallery Frame</h2>
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Format Aktif: {globalAspectRatio === '16:9' ? 'LANDSCAPE 16:9' : 'PORTRAIT 9:16'}</p>
            </div>
            <div className="flex items-center gap-3">
               <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
               <span className="text-[11px] font-black text-white/50 uppercase tracking-[0.3em]">{scenes.length} Scenes Ready</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {scenes.map((scene, idx) => (
              <div key={scene.id} className="group flex flex-col bg-white/5 border border-white/10 rounded-[3rem] overflow-hidden hover:border-white/30 transition-all shadow-2xl relative backdrop-blur-3xl">
                <div className="p-10 space-y-6">
                  <div className="flex justify-between items-center bg-black/40 p-4 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-5">
                      <span className="w-10 h-10 flex items-center justify-center bg-red-600 text-white font-black text-xs rounded-2xl shadow-xl">{idx + 1}</span>
                      <p className="font-black text-white text-sm truncate w-48 uppercase tracking-tighter italic">{scene.title}</p>
                    </div>
                    <span className="text-[11px] font-black text-red-500 bg-red-500/10 px-3 py-1 rounded-full tracking-tighter">{formatTime(scene.timestamp)}</span>
                  </div>
                  <div className="relative">
                    <textarea 
                      value={scene.prompt} 
                      onChange={(e) => {
                        const newScenes = [...scenes];
                        newScenes[idx].prompt = e.target.value;
                        setScenes(newScenes);
                      }} 
                      className="w-full bg-transparent border-none p-0 text-[11px] text-white/60 focus:ring-0 italic h-24 resize-none leading-relaxed custom-scrollbar"
                    />
                    <button onClick={() => handleCopyText(scene.id, scene.prompt)} className={`absolute bottom-0 right-0 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${copiedId === scene.id ? 'bg-green-500 text-white' : 'bg-white/10 text-white/50 hover:text-white'}`}> {copiedId === scene.id ? '✓ Copied' : 'Copy Prompt'} </button>
                  </div>
                </div>

                <div className={`relative flex items-center justify-center overflow-hidden m-6 mt-0 rounded-[2.5rem] border border-white/10 shadow-inner group/img bg-black/60 transition-all duration-700 ${globalAspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] max-h-[600px] w-fit mx-auto'}`}>
                  {scene.imageUrl ? (
                    <>
                      <img src={scene.imageUrl} className="w-full h-full object-cover transition-all duration-1000 group-hover/img:scale-110 group-hover/img:brightness-50" alt={scene.title} />
                      <div className="absolute inset-0 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center gap-6 backdrop-blur-md">
                        <button onClick={() => downloadImage(scene.imageUrl!, `fotocopy-${idx+1}`)} className="w-16 h-16 bg-white text-black rounded-3xl flex items-center justify-center shadow-2xl hover:scale-110 transition-all active:scale-90 shadow-white/10"><span className="text-3xl">📥</span></button>
                        <button onClick={() => visualizeScene(scene.id)} className="w-16 h-16 bg-red-600 text-white rounded-3xl flex items-center justify-center shadow-2xl hover:scale-110 transition-all active:scale-90 shadow-red-500/20"><span className="text-3xl">🔄</span></button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-8">
                      <button onClick={() => visualizeScene(scene.id)} disabled={scene.isGenerating} className="bg-white text-black px-12 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl hover:bg-red-600 hover:text-white active:scale-95 disabled:opacity-20">
                        {scene.isGenerating ? 'Rendering...' : 'Generate Format ' + (globalAspectRatio === '16:9' ? 'Wide' : 'Tall')}
                      </button>
                    </div>
                  )}
                  {scene.isGenerating && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center backdrop-blur-2xl z-20">
                      <div className="w-12 h-12 border-2 border-red-500 border-t-transparent animate-spin rounded-full mb-6"></div>
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] animate-pulse">Rendering Pixel...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default VisualsView;
