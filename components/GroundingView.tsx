
import React, { useState } from 'react';
import { searchGrounding, mapsGrounding } from '../services/geminiService';

const GroundingView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ text: string; sources: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'search' | 'maps'>('search');

  const handleQuery = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setResult(null);

    try {
      let response;
      if (mode === 'search') {
        response = await searchGrounding(query);
      } else {
        // Simple geo request
        const pos = await new Promise<GeolocationPosition>((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej)
        ).catch(() => null);
        
        response = await mapsGrounding(query, pos?.coords.latitude, pos?.coords.longitude);
      }

      const text = response.text || "";
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      setResult({ text, sources });
    } catch (e) {
      console.error(e);
      alert("Grounding query failed. Ensure you are using a Gemini 2.5/3 Pro model for maps.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="glass p-8 rounded-3xl border border-slate-800">
        <div className="flex space-x-2 mb-6 p-1 bg-slate-950 rounded-xl w-fit">
          <button 
            onClick={() => setMode('search')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'search' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Google Search
          </button>
          <button 
            onClick={() => setMode('maps')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'maps' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Google Maps
          </button>
        </div>

        <div className="flex space-x-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
            placeholder={mode === 'search' ? "Ask about current events or verified facts..." : "Find nearby places, restaurants, or directions..."}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-slate-700 transition-all"
          />
          <button
            onClick={handleQuery}
            disabled={isLoading || !query.trim()}
            className="bg-slate-100 text-slate-950 font-bold px-8 rounded-2xl hover:bg-white transition-all disabled:bg-slate-800 disabled:text-slate-600"
          >
            {isLoading ? 'Thinking...' : 'Run Query'}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="glass p-8 rounded-3xl border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">AI Response with Citations</h4>
            <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-p:text-slate-300">
              <p className="whitespace-pre-wrap">{result.text}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.sources.map((chunk: any, idx: number) => {
              const info = chunk.web || chunk.maps;
              if (!info) return null;
              return (
                <a
                  key={idx}
                  href={info.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all flex items-start space-x-4 group"
                >
                  <div className="text-2xl mt-1">{mode === 'search' ? '🌐' : '📍'}</div>
                  <div className="flex-1 overflow-hidden">
                    <h5 className="font-bold text-white truncate group-hover:text-blue-400 transition-colors">{info.title || 'Referenced Source'}</h5>
                    <p className="text-xs text-slate-500 truncate mt-1">{info.uri}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroundingView;
