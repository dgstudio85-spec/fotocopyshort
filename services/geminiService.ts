
import { GoogleGenAI, Type } from "@google/genai";

// Note: We create a new instance of GoogleGenAI within each function call 
// to ensure the latest API key is always used, as per coding guidelines.

/**
 * Generates a video based on a prompt using Veo 3.1.
 * This is an async process that requires polling.
 */
export const generateVideo = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  // Polling until video is ready
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed");
  
  // Append API key for fetching the actual mp4 bytes
  return `${downloadLink}&key=${process.env.API_KEY}`;
};

/**
 * Analyzes video frames to extract scenes and character description using Gemini 3 Pro.
 */
export const analyzeVideoToScenes = async (frames: { data: string, mimeType: string }[], numScenes: number = 4) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analisis frame video ini. Tugas Anda adalah:
  1. Identifikasi karakter utama secara sangat mendetail.
  2. Buat deskripsi karakter (characterDescription) yang konsisten.
  3. Buat tepat ${numScenes} adegan awal (scenes) berdasarkan alur video.
  Kembalikan dalam format JSON:
  {
    "characterDescription": "...",
    "scenes": [{"title": "...", "prompt": "..."}]
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
          }
        },
        required: ["characterDescription", "scenes"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { characterDescription: "", scenes: [] };
  }
};

/**
 * Generates an image based on a prompt using Gemini 2.5 Flash Image.
 */
export const generateImage = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: "16:9" } }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("No image generated");
};

/**
 * Simple text generation using Gemini 3 Pro.
 */
export const generateText = async (message: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: message });
};

/**
 * Perform Search Grounding using Gemini 3 Flash.
 */
export const searchGrounding = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
};

/**
 * Perform Maps Grounding using Gemini 2.5 series model.
 */
export const mapsGrounding = async (prompt: string, latitude?: number, longitude?: number) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return await ai.models.generateContent({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    contents: prompt,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: (latitude !== undefined && longitude !== undefined) ? {
        retrievalConfig: {
          latLng: {
            latitude,
            longitude,
          }
        }
      } : undefined
    },
  });
};
