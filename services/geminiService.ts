
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Menganalisis frame video untuk mengekstrak adegan dan metadata media sosial yang viral.
 * Dioptimalkan untuk konsistensi karakter (Identical Character Consistency).
 */
export const analyzeVideoToScenes = async (frames: { data: string, mimeType: string }[], numScenes: number = 4) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Anda adalah Pakar Forensik Visual & Spesialis Karakter AI.
  
  TUGAS UTAMA:
  1. Identifikasi tokoh utama dalam frame ini.
  2. Buat "DNA KARAKTER" yang sangat detail (Character Anchor) agar AI pembuat gambar bisa mereplikasi tokoh ini 100% sama.
  
  DETAIL DNA KARAKTER (WAJIB ADA):
  - Wajah: Struktur tulang pipi, bentuk mata, detail alis, warna kulit (skintone), dan tanda lahir/karakteristik unik.
  - Rambut: Tekstur, panjang, warna, dan gaya sisiran secara teknis.
  - Pakaian: Identifikasi warna spesifik (HEX atau nama warna teknis), jenis bahan (linen, jeans, wool), dan pola pakaian.
  - Raut Wajah: Cara tokoh tersenyum atau menatap (ekspresi khas).

  INSTRUKSI ADEGAN:
  - Buat tepat ${numScenes} adegan.
  - "prompt" untuk setiap adegan HARUS diawali dengan deskripsi DNA Karakter tadi, lalu diikuti aksi/latar spesifik di frame tersebut.
  - Gunakan istilah fotografi profesional (e.g., "shot on 35mm lens", "f/1.8", "cinematic color grading").

  STRATEGI METADATA (Bahasa Indonesia):
  - Buat Judul & Deskripsi YouTube yang dioptimalkan untuk CTR tinggi (Gunakan Teknik Hook/Curiosity Gap).
  - Hashtag WAJIB diawali tanda '#' dan dipisahkan spasi.

  Kembalikan dalam format JSON:
  {
    "characterDNA": "Deskripsi fisik teknis lengkap karakter utama dalam Bahasa Inggris",
    "scenes": [
      { "title": "...", "prompt": "Character DNA + Scene Action + Lighting + Camera Specs (English)" }
    ],
    "socialMetadata": {
      "youtube": { "title": "...", "description": "...", "tags": "..." },
      "tiktok": { "title": "...", "description": "...", "tags": "..." },
      "instagram": { "title": "...", "description": "...", "tags": "..." }
    }
  }`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [...frames.map(f => ({ inlineData: f })), { text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          characterDNA: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            minItems: numScenes,
            maxItems: numScenes,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                prompt: { type: Type.STRING }
              },
              required: ["title", "prompt"]
            }
          },
          socialMetadata: {
            type: Type.OBJECT,
            properties: {
              youtube: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  tags: { type: Type.STRING }
                },
                required: ["title", "description", "tags"]
              },
              tiktok: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  tags: { type: Type.STRING }
                },
                required: ["title", "description", "tags"]
              },
              instagram: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  tags: { type: Type.STRING }
                },
                required: ["title", "description", "tags"]
              }
            }
          }
        },
        required: ["characterDNA", "scenes", "socialMetadata"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("JSON parse error", e);
    return { characterDNA: "", scenes: [], socialMetadata: null };
  }
};

export const generateImage = async (prompt: string, aspectRatio: "16:9" | "9:16" | "1:1" = "16:9") => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: { 
      imageConfig: { 
        aspectRatio: aspectRatio 
      } 
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("No image generated");
};

export const generateText = async (message: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: message });
};

export const searchGrounding = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] },
  });
};

export const mapsGrounding = async (prompt: string, latitude?: number, longitude?: number) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return await ai.models.generateContent({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    contents: prompt,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: (latitude !== undefined && longitude !== undefined) ? {
        retrievalConfig: { latLng: { latitude, longitude } }
      } : undefined
    },
  });
};
