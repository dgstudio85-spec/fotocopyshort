
import React from 'react';
import VisualsView from './components/VisualsView';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Header with YouTube Shorts Style Logo */}
      <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-black/10 backdrop-blur-2xl sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <div className="bg-red-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/40 transition-transform hover:scale-110">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.61 5.43L12.01 1.95C10.66 1.11 8.91 1.6 8.13 3.03L3.15 12.18C2.56 13.25 2.8 14.59 3.73 15.39L9.33 18.87C10.68 19.71 12.43 19.22 13.21 17.79L18.19 8.64C18.78 7.57 18.54 6.23 17.61 5.43Z" fill="white"/>
              <path d="M10 9V14L14 11.5L10 9Z" fill="#DC2626"/>
            </svg>
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase italic text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">FOTOCOPY VIDEO</h1>
        </div>
        <div className="hidden md:flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Processing Ready</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          <VisualsView />
        </div>
      </main>

      {/* Footer */}
      <footer className="p-8 text-center border-t border-white/5 bg-black/20 backdrop-blur-md">
        <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.4em]">
          FOTOCOPY VIDEO &bull; Est. 2024 &bull; Intelligence by Gemini 2.5
        </p>
      </footer>
    </div>
  );
};

export default App;