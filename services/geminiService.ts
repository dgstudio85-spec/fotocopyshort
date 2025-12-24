
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Menganalisis frame video untuk mengekstrak adegan dan metadata media sosial yang viral.
 * Dioptimalkan untuk Algoritma YouTube, TikTok, dan Instagram dengan format Hashtag siap pakai.
 */
export const analyzeVideoToScenes = async (frames: { data: string, mimeType: string }[], numScenes: number = 4) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Anda adalah Spesialis Konten Viral & Pakar SEO Media Sosial.
  Tugas Anda adalah menganalisis frame video ini dan membuat paket metadata yang PASTI FYP dan mendapatkan banyak viewers.

  KETENTUAN OUTPUT METADATA (Bahasa Indonesia):
  1. YouTube (Fokus pada Search & Suggested):
     - Title: Gunakan teknik High-CTR (Curiosity Gap, High Stakes, atau Result-Oriented). Maks 70 karakter.
     - Description: Pastikan 2 baris pertama mengandung kata kunci utama. Sertakan ringkasan konten yang menggugah rasa penasaran, manfaat bagi penonton, dan Call to Action.
     - Tags: WAJIB dalam format HASHTAG (#kata1 #kata2 #kata3). Gunakan campuran kata kunci broad dan long-tail.
  
  2. TikTok (Fokus pada Hook & Trend):
     - Title/Hook: Kalimat 3 detik pertama yang menghentikan scrolling.
     - Caption: Singkat, menggunakan bahasa slang/tren terkini, dan memancing komentar.
     - Tags: WAJIB dalam format HASHTAG (#fyp #foryou #viral #trend #danLainnya).

  3. Instagram (Fokus pada Aesthetic & Engagement):
     - Title: Headline estetik.
     - Caption: Bercerita (storytelling) dengan format yang bersih dan emoji yang tepat.
     - Tags: WAJIB dalam format HASHTAG (#aesthetic #explore #videoViral #danLainnya).

  KETENTUAN KHUSUS HASHTAG:
  - Setiap kata kunci dalam bagian "tags" HARUS diawali dengan tanda '#'.
  - Pisahkan antar hashtag dengan spasi tunggal agar pengguna bisa langsung menyalin dan menempelnya.
  - Berikan minimal 10-15 hashtag yang relevan per platform.

  KETENTUAN VISUAL PROMPT (Bahasa Inggris):
  - "prompt" untuk adegan: Wajib dalam Bahasa Inggris. Deskripsikan secara teknis (lighting, camera angle, 8k resolution, cinematic style) berdasarkan analisis frame yang diberikan agar hasil render gambar sangat realistis.

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
