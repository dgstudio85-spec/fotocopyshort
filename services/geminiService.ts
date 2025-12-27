
import { GoogleGenAI, Type } from "@google/genai";

const SCENE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    characterDNA: { type: Type.STRING, description: "Detailed and consistent physical description of the main character (hair, eyes, outfit, height, features)" },
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          prompt: { type: Type.STRING, description: "Visual prompt that MUST start with the character description, followed by action and environment" },
          sfx: { type: Type.STRING, description: "Detailed sound design: ambience, foley, and specific sound effects" }
        },
        required: ["title", "prompt", "sfx"]
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

/**
 * Menganalisis naskah dengan fokus pada KONSISTENSI KARAKTER di setiap adegan.
 */
export const analyzeTextToScenes = async (story: string, numScenes: number = 4, visualStyle: string = "Cinematic Style") => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Anda adalah Sutradara Film Profesional. Naskah: "${story}". Buatlah ${numScenes} adegan.
  
  KEWAJIBAN UTAMA:
  1. Tentukan deskripsi fisik KARAKTER UTAMA secara sangat detail (Character DNA). Contoh: "Seorang pria berumur 30 tahun, mengenakan jubah neon biru, rambut perak cepak, mata cybernetic merah".
  2. Di SETIAP adegan, prompt visual HARUS dimulai dengan mengulang deskripsi fisik karakter tersebut agar hasilnya konsisten.
  3. Format Visual Prompt: [Deskripsi Karakter] sedang [Aksi] di [Lokasi] dengan [Sudut Kamera & Pencahayaan].
  4. Format Sound Design (SFX): Berikan detail suara latar dan suara aksi spesifik.
  
  Gaya Visual: ${visualStyle}.
  Output dalam JSON sesuai schema.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: SCENE_SCHEMA
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Text Analysis Error:", e);
    throw new Error("Gagal menganalisis teks.");
  }
};

/**
 * Menganalisis video untuk menghasilkan adegan baru dengan karakter yang tetap sama.
 */
export const analyzeVideoToScenes = async (frames: { data: string, mimeType: string }[], numScenes: number = 4, visualStyle: string = "Cinematic Style") => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Analisis Karakter dari Video.
  1. Ekstrak deskripsi fisik paling akurat dari tokoh di video ini sebagai "Character DNA".
  2. Buat ${numScenes} adegan baru/lanjutan.
  3. SETIAP adegan HARUS menggunakan deskripsi karakter yang sama persis di awal prompt visual.
  4. Sertakan instruksi Sound Design yang dramatis sesuai gaya ${visualStyle}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [...frames.map(f => ({ inlineData: f })), { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: SCENE_SCHEMA
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Video Analysis Error:", e);
    throw new Error("Gagal menganalisis video.");
  }
};

export const generateImage = async (prompt: string, aspectRatio: "16:9" | "9:16" | "1:1" = "16:9") => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: aspectRatio } }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image data");
  } catch (e) {
    console.error("Image Generation Error:", e);
    throw e;
  }
};

// Fix: Added missing generateText function for ChatView
/**
 * Menghasilkan teks umum dari Gemini.
 */
export const generateText = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response;
  } catch (e) {
    console.error("Text Generation Error:", e);
    throw e;
  }
};

// Fix: Added missing searchGrounding function for GroundingView
/**
 * Melakukan pencarian grounding dengan Google Search.
 */
export const searchGrounding = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    return response;
  } catch (e) {
    console.error("Search Grounding Error:", e);
    throw e;
  }
};

// Fix: Added missing mapsGrounding function for GroundingView
/**
 * Melakukan grounding dengan Google Maps.
 */
export const mapsGrounding = async (prompt: string, lat?: number, lng?: number) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const config: any = {
      tools: [{ googleMaps: {} }],
    };

    if (lat !== undefined && lng !== undefined) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: lat,
            longitude: lng
          }
        }
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite-latest',
      contents: prompt,
      config: config
    });
    return response;
  } catch (e) {
    console.error("Maps Grounding Error:", e);
    throw e;
  }
};
