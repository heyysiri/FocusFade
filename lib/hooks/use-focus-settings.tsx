import { useState, useEffect } from 'react';
import { Settings } from '@/lib/types';
import {
  getScreenpipeAppSettings,
  updateScreenpipeAppSettings,
} from '@/lib/actions/get-screenpipe-app-settings';

const DEFAULT_SETTINGS: Partial<Settings> = {
  focusSettings: {
    defaultFocusTask: 'coding',
    pollInterval: 5000,
    distractionThreshold: 120000,
  },
  aiSettings: {
    aiProviderType: 'ollama',
    aiModel: 'llama3',
    aiUrl: 'http://localhost:11434',
    apiKey: '',
  },
};

export function useFocusSettings() {
  const [settings, setSettings] = useState<Partial<Settings> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const screenpipeSettings = await getScreenpipeAppSettings();
      
      const pipeSettings = screenpipeSettings.customSettings?.focusThief || {};
      
      setSettings({
        ...DEFAULT_SETTINGS,
        ...pipeSettings,
        screenpipeAppSettings: screenpipeSettings,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading };
} 