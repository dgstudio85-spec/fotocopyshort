
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

const LiveView: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  const toggleSession = async () => {
    if (isActive) {
      sessionRef.current?.close();
      streamRef.current?.getTracks().forEach(t => t.stop());
      setIsActive(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) { int16[i] = inputData[i] * 32768; }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            setIsActive(true);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.outputTranscription) {
              setTranscription(prev => [...prev.slice(-10), `Model: ${msg.serverContent?.outputTranscription?.text}`]);
            }
            if (msg.serverContent?.inputTranscription) {
              setTranscription(prev => [...prev.slice(-10), `You: ${msg.serverContent?.inputTranscription?.text}`]);
            }

            const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsActive(false),
          onerror: (e) => {
            console.error("Live Error:", e);
            setIsActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      alert("Please ensure microphone access and a valid API key.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center">
      <div className="w-full glass rounded-[3rem] p-12 mb-8 text-center relative overflow-hidden border border-slate-800">
        <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl mb-8 transition-all duration-700 shadow-2xl ${
            isActive ? 'bg-blue-600 scale-110 shadow-blue-500/40' : 'bg-slate-800 shadow-black'
          }`}>
            <div className={isActive ? 'animate-pulse' : ''}>🎙️</div>
          </div>
          <h2 className="text-4xl font-black mb-4 text-white tracking-tighter">
            {isActive ? 'SESSION ACTIVE' : 'LIVE VOICE LAB'}
          </h2>
          <p className="text-slate-400 mb-10 max-w-sm mx-auto font-medium leading-relaxed">
            Instant multimodal conversation with Gemini. Experience human-like responses in real-time.
          </p>
          <button
            onClick={toggleSession}
            className={`px-16 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl ${
              isActive 
                ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20' 
                : 'bg-white text-slate-950 hover:bg-slate-200'
            }`}
          >
            {isActive ? 'Disconnect Session' : 'Initiate Conversation'}
          </button>
        </div>
      </div>

      <div className="w-full glass rounded-[2.5rem] p-8 h-80 overflow-y-auto custom-scrollbar border border-slate-800 shadow-inner">
        <div className="flex items-center justify-between mb-6 px-2">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Multimodal Stream</h4>
            {isActive && <div className="flex space-x-1"><div className="w-1 h-1 bg-red-500 rounded-full animate-ping"></div><span className="text-[10px] text-red-500 font-bold uppercase">Live</span></div>}
        </div>
        <div className="space-y-4">
          {transcription.length === 0 && <p className="text-slate-700 italic text-center py-10 text-sm font-medium">Listening for audio signals...</p>}
          {transcription.map((t, i) => (
            <div key={i} className={`p-4 rounded-2xl text-xs font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-300 ${t.startsWith('You:') ? 'bg-blue-500/5 text-blue-300 border border-blue-500/10 ml-12' : 'bg-slate-800/50 text-slate-300 border border-slate-700/50 mr-12'}`}>
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiveView;
