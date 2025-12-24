
import React, { useState, useRef, useEffect } from 'react';
import { analyzeVideoToScenes, generateImage } from '../services/geminiService';

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
  const [charDesc, setCharDesc] = useState('');
  const [progress, setProgress] = useState('');
  const [numScenes, setNumScenes] = useState(4);
  const [previews, setPreviews] = useState<string[]>([]);
  const [duration, setDuration] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (videoUrl && !isAnalyzing) {
      generatePreviews();
    }
  }, [numScenes, videoUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setScenes([]);
      setCharDesc('');
      setDuration(null);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const generatePreviews = async () => {
    const video = previewVideoRef.current;
    if (!video) return;
    const newPreviews: string[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || video.readyState < 1) return;
    canvas.width = 320; 
    canvas.height = (video.videoHeight / video.videoWidth) * 320;
    const points: number[] = [];
    for (let i = 0; i < numScenes; i++) {
      points.push(0.05 + (i * (0.9 / (numScenes - 1 || 1))));
    }
    for (const p of points) {
      video.currentTime = video.duration * p;
      await new Promise(resolve => {
        const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(null); };
        video.addEventListener('seeked', onSeeked);
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      newPreviews.push(canvas.toDataURL('image/jpeg', 0.6));
    }
    setPreviews(newPreviews);
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
    setProgress(`Menganalisis adegan...`);
    try {
      const frames = await captureFrames(numScenes);
      const result = await analyzeVideoToScenes(frames, numScenes);
      setCharDesc(result.characterDescription);
      setScenes(result.scenes.map((s: any, idx: number) => ({
        ...s,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: frames[idx]?.timestamp || 0
      })));
    } catch (err) {
      alert("Gagal menganalisis video.");
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
      const url = await generateImage(scenes[idx].prompt);
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

  const downloadImage = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyPrompt = (id: string, prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-12 pb-20">
      <section className="bg-white/5 backdrop-blur-xl p-1 rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden">
        {!videoUrl ? (
          <div onClick={() => fileInputRef.current?.click()} className="group cursor-pointer m-4 border-2 border-dashed border-white/10 rounded-[2.5rem] py-20 flex flex-col items-center justify-center hover:border-blue-500/50 transition-all bg-black/10">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-2xl mb-4 group-hover:bg-red-600 transition-all border border-white/10">📹</div>
            <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Pilih Video Sumber</h3>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-2">MP4 atau WebM disarankan</p>
          </div>
        ) : (
          <div className="p-8 flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/2 space-y-4">
              <div className="relative aspect-video rounded-3xl overflow-hidden bg-black/40 border border-white/10">
                <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" controls onLoadedMetadata={handleLoadedMetadata} />
                <video ref={previewVideoRef} src={videoUrl} className="hidden" muted />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-md">
                    <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 animate-spin rounded-full mb-4"></div>
                    <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">{progress}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-center backdrop-blur-md">
                  <p className="text-[7px] font-black text-white/30 uppercase mb-1 tracking-widest">Durasi</p>
                  <p className="text-white font-black text-sm">{duration ? formatTime(duration) : '--:--'}</p>
                </div>
                <button onClick={() => setVideoUrl(null)} className="py-3 rounded-2xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-[9px] font-black uppercase tracking-widest transition-all border border-white/10">Ganti</button>
              </div>
            </div>
            <div className="lg:w-1/2 space-y-6">
              <div className="bg-black/20 p-6 rounded-3xl border border-white/10 backdrop-blur-xl">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-white/60 font-black text-sm uppercase italic tracking-tight">Kepadatan Adegan</h4>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {[3, 4, 6, 8].map(n => (
                    <button key={n} onClick={() => setNumScenes(n)} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${numScenes === n ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-white/5 text-white/40 hover:text-white border border-white/5'}`}>{n}</button>
                  ))}
                </div>
                <button onClick={startAnalysis} disabled={isAnalyzing} className="w-full py-4 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-red-600 hover:text-white transition-all shadow-xl disabled:opacity-20">Mulai Analisis</button>
              </div>
            </div>
          </div>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileChange} />
      </section>

      {scenes.length > 0 && (
        <section className="space-y-8 animate-in fade-in duration-700">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Gallery Frame</h2>
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">{scenes.length} Scenes Analyzed</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-10">
            {scenes.map((scene, idx) => (
              <div key={scene.id} className="group flex flex-col bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden hover:border-white/30 transition-all shadow-2xl relative backdrop-blur-xl">
                <div className="p-8 space-y-5">
                  <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 flex items-center justify-center bg-red-600 text-white font-black text-[11px] rounded-xl shadow-lg">{idx + 1}</span>
                      <p className="font-black text-white text-[12px] truncate w-40 uppercase tracking-tighter italic">{scene.title}</p>
                    </div>
                    <span className="text-[10px] font-black text-red-500 tracking-tighter">{formatTime(scene.timestamp)}</span>
                  </div>
                  <div className="relative">
                    <textarea 
                      value={scene.prompt} 
                      onChange={(e) => setScenes(scenes.map(s => s.id === scene.id ? {...s, prompt: e.target.value} : s))} 
                      className="w-full bg-transparent border-none p-0 text-[11px] text-white/60 focus:ring-0 italic h-24 resize-none leading-relaxed"
                    />
                    <button 
                      onClick={() => handleCopyPrompt(scene.id, scene.prompt)} 
                      className={`absolute bottom-0 right-0 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${copiedId === scene.id ? 'bg-green-500 text-white' : 'bg-white/10 text-white/50 hover:text-white'}`}
                    >
                      {copiedId === scene.id ? '✓ OK' : 'Copy Prompt'}
                    </button>
                  </div>
                </div>

                <div className="relative aspect-video bg-black/40 flex items-center justify-center overflow-hidden m-4 mt-0 rounded-[2rem] border border-white/10 shadow-inner">
                  {scene.imageUrl ? (
                    <div className="relative w-full h-full group/img">
                      <img src={scene.imageUrl} className="w-full h-full object-cover transition-all duration-1000 group-hover/img:scale-110 group-hover/img:brightness-50" alt={scene.title} />
                      
                      <div className="absolute inset-0 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center gap-4 backdrop-blur-sm">
                        <button 
                          onClick={() => downloadImage(scene.imageUrl!, `fotocopy-${idx+1}`)}
                          className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 transition-all active:scale-90"
                        >
                          <span className="text-2xl">📥</span>
                        </button>
                        <button 
                          onClick={() => visualizeScene(scene.id)}
                          className="w-14 h-14 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 transition-all active:scale-90"
                        >
                          <span className="text-2xl">🔄</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6">
                      <button 
                        onClick={() => visualizeScene(scene.id)} 
                        disabled={scene.isGenerating} 
                        className="bg-white text-black px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl hover:bg-red-600 hover:text-white active:scale-95 disabled:opacity-20"
                      >
                        {scene.isGenerating ? 'Rendering...' : 'Generate Visual'}
                      </button>
                    </div>
                  )}

                  {scene.isGenerating && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md z-20">
                      <div className="w-10 h-10 border-2 border-red-500 border-t-transparent animate-spin rounded-full mb-4"></div>
                      <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.3em] animate-pulse">Processing Frame...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="pt-20 flex flex-col items-center">
            <button onClick={() => window.print()} className="px-20 py-6 bg-white text-black rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.4em] hover:bg-red-600 hover:text-white transition-all shadow-2xl active:scale-95">Print Storyboard Sheet</button>
          </div>
        </section>
      )}
    </div>
  );
};

export default VisualsView;
