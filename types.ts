
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  CHAT = 'CHAT',
  VISUALS = 'VISUALS',
  LIVE = 'LIVE',
  GROUNDING = 'GROUNDING'
}

export interface StoryboardScene {
  id: string;
  order: number;
  rawInput: string;
  refinedPrompt: string;
  imageUrl?: string;
  isExpanding: boolean;
  isRendering: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  sources?: Array<{
    title: string;
    uri: string;
  }>;
}

export interface VisualAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  status: 'pending' | 'completed' | 'failed';
}
