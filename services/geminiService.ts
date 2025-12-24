
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Menganalisis frame video untuk mengekstrak adegan dan metadata media sosial yang viral.
 */
export const analyzeVideoToScenes = async (frames: { data: string, mimeType: string }[], numScenes: number = 4) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analisis frame video ini untuk strategi konten viral. Tugas Anda:
  1. Identifikasi karakter dan suasana utama.
  2. Buat tepat ${numScenes} adegan (scenes) berdasarkan alur video.
  3. Buat metadata sosial media yang dioptimalkan untuk jangkauan luas (high reach) pada 3 platform utama.
  
  Ketentuan Bahasa (SANGAT PENTING):
  - Judul, deskripsi, caption, dan tag: WAJIB dalam BAHASA INDONESIA yang menarik dan viral.
  - "prompt" untuk adegan: WAJIB dalam BAHASA INGGRIS yang sangat detail, teknis, dan deskriptif untuk menghasilkan gambar berkualitas tinggi (sebutkan lighting, cinematic style, dan detail objek).
  
  Ketentuan Metadata:
  - YouTube: Judul yang memancing klik (clickbait positif), deskripsi SEO yang kuat, dan tag pencarian populer.
  - TikTok: Kalimat hook pembuka yang kuat, caption singkat & padat, dan hashtag trending.
  - Instagram: Caption estetik yang mengundang interaksi, deskripsi singkat, dan hashtag populer.
  
  Kembalikan dalam format JSON murni:
  {
    "characterDescription": "...",
    "scenes": [{"title": "...", "prompt": "..."}],
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
          characterDescription: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
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
        required: ["characterDescription", "scenes", "socialMetadata"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("JSON parse error", e);
    return { characterDescription: "", scenes: [], socialMetadata: null };
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
