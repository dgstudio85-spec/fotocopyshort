import React, { useState, useEffect } from 'react';
import VisualsView from './components/VisualsView';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(false);

  useEffect(() => {
    const checkKey = async () => {
      try {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasKey(selected);
        if (!selected) {
           handleSelectKey();
        }
      } catch (e) {
        console.warn("API Key check skipped");
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      setHasKey(true);
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* Cinematic Minimalist Header */}
      <header className="h-24 px-8 md:px-12 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-[100]">
        <div className="flex items-center gap-6 group">
          <div 
            onClick={handleSelectKey}
            className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center rotate-3 group-hover:rotate-0 transition-all shadow-[0_0_30px_rgba(255,0,0,0.4)] cursor-pointer"
          >
            <span className="text-white font-black text-2xl italic select-none">AX</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-2xl font-black italic tracking-tighter leading-none text-white">ASWRXXX PRODUCTION</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div 
            onClick={handleSelectKey}
            className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all duration-500 ${hasKey ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' : 'bg-red-600 animate-pulse shadow-[0_0_12px_#ef4444]'}`}
           ></div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-8">
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
          {!hasKey && (
            <div className="mb-8 p-6 bg-red-600/10 border border-red-600/20 rounded-3xl flex items-center justify-between">
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest italic">Engine Offline. Click AX logo to activate.</p>
              <button onClick={handleSelectKey} className="text-[9px] font-black underline uppercase text-white">Connect</button>
            </div>
          )}
          <VisualsView />
        </div>
      </main>

      <footer className="py-12 text-center opacity-10 pointer-events-none text-[10px] uppercase tracking-[0.5em] font-black italic">
        ASWRXXX // NEX-GEN AI ENGINE
      </footer>
    </div>
  );
};

export default App;