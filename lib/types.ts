import type { Settings as ScreenpipeAppSettings } from "@screenpipe/js";

export interface WorkLog {
  title: string;
  description: string;
  tags: string[];
  startTime: string;
  endTime: string;
}

export interface Contact {
  name: string;
  company?: string;
  lastInteraction: string;
  sentiment: number;
  topics: string[];
  nextSteps: string[];
}

export interface Intelligence {
  contacts: Contact[];
  insights: {
    followUps: string[];
    opportunities: string[];
  };
}

export interface AISettings {
  aiProviderType: string;
  aiModel: string;
  aiUrl: string;
  apiKey: string;
}

export interface Settings {
  focusSettings: {
    defaultFocusTask: string;
    pollInterval: number;
    distractionThreshold: number;
  };
  prompt:string;
  aiSettings: AISettings;
  screenpipeAppSettings?: ScreenpipeAppSettings;
}
