import React, { useState, useEffect } from 'react';
import VisualsView from './components/VisualsView';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(false);

  useEffect(() => {
    const checkKey = async () => {
      try {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasKey(selected);
        // Jika belum ada key, otomatis buka dialog pilihan key untuk meminimalisir error di awal
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
      <header className="h-28 px-8 md:px-16 flex items-center justify-between border-b border-white/5 bg-black/60 backdrop-blur-2xl sticky top-0 z-[100]">
        <div className="flex items-center gap-6 group">
          <div 
            onClick={handleSelectKey}
            className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center rotate-3 group-hover:rotate-0 transition-all shadow-[0_0_40px_rgba(255,0,0,0.4)] cursor-pointer"
          >
            <span className="text-white font-black text-3xl italic select-none">FV</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-3xl font-black italic tracking-tighter leading-none text-white">FOTOCOPY VIDEO</h1>
          </div>
        </div>

        {/* Discreet Connection Indicator */}
        <div className="flex items-center">
           <div 
            onClick={handleSelectKey}
            className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-500 ${hasKey ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-red-600 animate-pulse shadow-[0_0_15px_#ef4444]'}`}
            title={hasKey ? "Engine Connected" : "Connection Required"}
           ></div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-8 md:p-16">
        <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
          {!hasKey && (
            <div className="mb-12 p-8 bg-red-600/10 border border-red-600/20 rounded-[2.5rem] flex items-center justify-between animate-pulse">
              <p className="text-[11px] font-black text-red-600 uppercase tracking-[0.3em] italic">Engine belum terhubung. Klik logo FV untuk mengaktifkan AI.</p>
              <button onClick={handleSelectKey} className="text-[10px] font-black underline uppercase tracking-widest text-white">Hubungkan Sekarang</button>
            </div>
          )}
          <VisualsView />
        </div>
      </main>

      <footer className="py-20 text-center opacity-10 pointer-events-none">
        {/* Footer text removed as per user request */}
      </footer>
    </div>
  );
};

export default App;