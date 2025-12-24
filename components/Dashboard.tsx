
import React from 'react';
import { AppView } from '../types';

interface DashboardProps {
  onViewChange: (view: AppView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onViewChange }) => {
  const features = [
    {
      id: AppView.VISUALS,
      title: 'Video Storyboarder',
      desc: 'Unggah video dan biarkan AI memecahnya menjadi 4 adegan cinematic secara otomatis.',
      icon: '🎬',
      color: 'blue'
    },
    {
      id: AppView.CHAT,
      title: 'AI Chat Pro',
      desc: 'Tanya jawab cerdas, analisis dokumen, dan brainstorming ide kreatif.',
      icon: '💬',
      color: 'purple'
    },
    {
      id: AppView.LIVE,
      title: 'Voice Lab',
      desc: 'Ngobrol langsung dengan Gemini menggunakan suara secara real-time.',
      icon: '🎙️',
      color: 'yellow'
    },
    {
      id: AppView.GROUNDING,
      title: 'Cek Fakta',
      desc: 'Cari informasi terbaru yang akurat dari Google Search dan Maps.',
      icon: '🌍',
      color: 'green'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto py-10">
      <div className="mb-12 text-center md:text-left">
        <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tighter">Halo, Kreator!</h1>
        <p className="text-slate-400 text-xl max-w-2xl font-medium">
          Pilih tools di bawah ini untuk memulai produktivitas Anda dengan kecerdasan Gemini.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {features.map((f) => (
          <button
            key={f.id}
            onClick={() => onViewChange(f.id)}
            className="group relative p-10 rounded-[2.5rem] bg-slate-900 border border-slate-800 hover:border-blue-500 hover:bg-slate-800/50 transition-all text-left overflow-hidden shadow-2xl"
          >
            <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">{f.icon}</div>
            <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tight">{f.title}</h3>
            <p className="text-slate-400 text-lg leading-relaxed font-medium">{f.desc}</p>
            <div className="mt-10 flex items-center text-sm font-black uppercase tracking-widest text-blue-400">
              Buka Aplikasi <span className="ml-2 group-hover:translate-x-2 transition-transform">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
