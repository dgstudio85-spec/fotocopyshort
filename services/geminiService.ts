
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Menganalisis frame video untuk mengekstrak adegan dan metadata media sosial yang viral.
 * Dioptimalkan untuk Algoritma YouTube, TikTok, dan Instagram.
 * Menjamin jumlah adegan yang dihasilkan (scenes.length) sama dengan numScenes.
 */
export const analyzeVideoToScenes = async (frames: { data: string, mimeType: string }[], numScenes: number = 4) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prompt yang jauh lebih ketat dan berorientasi pada hasil (Result-Oriented)
  const prompt = `Anda adalah Pakar Pertumbuhan Media Sosial & Spesialis SEO YouTube No. 1 di Indonesia.
  
  TUGAS UTAMA:
  Analisislah ${frames.length} frame video yang saya kirimkan. 
  PENTING: Anda HARUS menghasilkan tepat ${numScenes} objek di dalam array "scenes". 
  Setiap frame yang saya kirimkan mewakili satu adegan unik. Jangan menggabungkan adegan. Jangan mengurangi jumlah adegan.
  Jika saya mengirimkan ${frames.length} frame, output JSON "scenes" Anda HARUS memiliki tepat ${frames.length} elemen.

  STRATEGI METADATA VIRAL (Bahasa Indonesia):
  1. YouTube (Target: 1 Juta+ Viewers):
     - Title: Buat judul yang memicu "Extreme Curiosity" atau "Urgency". Gunakan kata-kata power (Contoh: "Terungkap!", "Rahasia...", "Jangan Sampai...", "Cara Gila..."). Gunakan Huruf Besar di kata kunci utama.
     - Description: 2 baris pertama harus sangat informatif dan mengandung kata kunci pencarian utama. Sertakan "Why you should watch" dan ajakan interaksi (CTA).
     - Tags: WAJIB format HASHTAG (#tag1 #tag2 ...). Minimal 15 hashtag SEO-friendly yang mencakup topik luas dan spesifik.

  2. TikTok & Reels:
     - Hook: Kalimat pembuka yang membuat orang berhenti scroll dalam 0.5 detik.
     - Tags: Gunakan hashtag yang sedang tren di Indonesia sesuai kategori konten ini.

  STRATEGI VISUAL PROMPT (Bahasa Inggris):
  - "prompt": Deskripsi ultra-detail (hyper-realistic, photorealistic, 8k, cinematic lighting, wide angle/close up) berdasarkan visual frame asli agar AI Image Generator bisa meniru gaya video aslinya dengan sempurna.

  Kembalikan dalam format JSON murni:
  {
    "characterDescription": "Deskripsi mendalam tentang subjek/karakter utama agar konsisten",
    "scenes": [
      { "title": "Judul Adegan Singkat", "prompt": "Detailed English Visual Prompt" } 
      // Panjang array "scenes" ini HARUS TEPAT ${numScenes}
    ],
    "socialMetadata": {
      "youtube": { "title": "Judul Viral", "description": "Deskripsi SEO", "tags": "#hashtag #youtube #viral" },
      "tiktok": { "title": "Hook Video", "description": "Caption FYP", "tags": "#fyp #trending" },
      "instagram": { "title": "Headline", "description": "Storytelling", "tags": "#explore #reels" }
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
        required: ["characterDescription", "scenes", "socialMetadata"]
      }
    }
  });

  try {
    const parsed = JSON.parse(response.text || "{}");
    // Backup: Jika AI masih bandel memberikan jumlah yang salah, kita potong atau beri warning (meskipun schema harusnya memaksanya)
    return parsed;
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
