
import { GoogleGenAI, Type } from "@google/genai";

const SCENE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    characterDNA: { type: Type.STRING, description: "Detailed physical description of the character" },
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Judul adegan dalam Bahasa Indonesia" },
          prompt: { type: Type.STRING, description: "Prompt visual detail (Bisa Inggris/Indonesia)" },
          sfx: { type: Type.STRING, description: "Deskripsi efek suara" },
          socialCaption: { type: Type.STRING, description: "Caption viral singkat dalam Bahasa Indonesia" }
        },
        required: ["title", "prompt", "sfx", "socialCaption"]
      }
    },
    socialMetadata: {
      type: Type.OBJECT,
      properties: {
        youtube: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, tags: { type: Type.STRING } } },
        tiktok: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, tags: { type: Type.STRING } } },
        instagram: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, tags: { type: Type.STRING } } }
      },
      required: ["youtube", "tiktok", "instagram"]
    }
  },
  required: ["characterDNA", "scenes", "socialMetadata"]
};

export const analyzeTextToScenes = async (story: string, numScenes: number = 4, visualStyle: string = "Cinematic Style") => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Sutradara: "${story}". Buat ${numScenes} adegan dengan gaya visual: ${visualStyle}. Fokus Hook Tinggi & Konsistensi Karakter. WAJIB MENGGUNAKAN BAHASA INDONESIA untuk semua Judul, Deskripsi, dan Tag sosial media. Output JSON.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: prompt }] },
    config: { responseMimeType: "application/json", responseSchema: SCENE_SCHEMA }
  });
  return JSON.parse(response.text || "{}");
};

export const analyzeVideoToScenes = async (frames: { data: string, mimeType: string }[], numScenes: number = 4, visualStyle: string = "Cinematic Style") => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analisis Karakter Video & Buat ${numScenes} adegan baru dengan gaya: ${visualStyle}. Konsistensi DNA Karakter wajib. WAJIB MENGGUNAKAN BAHASA INDONESIA untuk semua Judul, Deskripsi, dan Tag sosial media. Output JSON.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [...frames.map(f => ({ inlineData: f })), { text: prompt }] },
    config: { responseMimeType: "application/json", responseSchema: SCENE_SCHEMA }
  });
  return JSON.parse(response.text || "{}");
};

export const restylePrompts = async (scenes: any[], newStyle: string, characterDNA: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Ubah gaya visual (Visual Style) dari list adegan berikut menjadi: ${newStyle}. Pertahankan narasi asli tapi buat prompt visual jauh lebih mendalam, fotorealistik, dan konsisten dengan DNA Karakter: ${characterDNA}. Pastikan semua teks pendukung tetap dalam BAHASA INDONESIA. Kembalikan list JSON dengan format yang sama.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: prompt + "\n\nData: " + JSON.stringify(scenes) }] },
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: (SCENE_SCHEMA.properties.scenes as any).items
      }
    }
  });
  return JSON.parse(response.text || "[]");
};

export const generateImage = async (prompt: string, aspectRatio: "16:9" | "9:16" | "1:1" = "16:9") => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: aspectRatio } }
  });
  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (part?.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  throw new Error("No image data");
};
