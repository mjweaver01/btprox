import type { AppConfig } from '@shared/types';
import { DEFAULT_CONFIG } from '@shared/constants';

const CONFIG_KEY = 'btprox:config';

async function getPreferences() {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    return Preferences;
  } catch {
    return null;
  }
}

export async function loadLocalConfig(): Promise<AppConfig> {
  const prefs = await getPreferences();
  if (prefs) {
    try {
      const { value } = await prefs.get({ key: CONFIG_KEY });
      return value ? { ...DEFAULT_CONFIG, ...JSON.parse(value) } : { ...DEFAULT_CONFIG };
    } catch {
      // fall through
    }
  }
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveLocalConfig(config: AppConfig): Promise<void> {
  const prefs = await getPreferences();
  if (prefs) {
    try {
      await prefs.set({ key: CONFIG_KEY, value: JSON.stringify(config) });
      return;
    } catch {
      // fall through
    }
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}
