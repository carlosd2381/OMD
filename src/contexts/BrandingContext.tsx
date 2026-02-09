import { createContext, useContext, useEffect, useState } from 'react';
import { settingsService, type BrandingSettings } from '../services/settingsService';

interface BrandingContextType {
  settings: BrandingSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType>({
  settings: null,
  loading: true,
  refreshSettings: async () => {},
});

export const useBranding = () => useContext(BrandingContext);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<BrandingSettings | null>(() => {
    // Try to load from localStorage on initial render
    const cached = localStorage.getItem('branding_settings');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);

  // Apply settings immediately if we have them from localStorage
  useEffect(() => {
    if (settings) {
      applyBranding(settings);
    }
  }, []); // Run once on mount to apply cached settings

  const loadSettings = async () => {
    try {
      const data = await settingsService.getBrandingSettings();
      setSettings(data);
      // Cache the new settings
      if (data) {
        localStorage.setItem('branding_settings', JSON.stringify(data));
      }
      applyBranding(data);
    } catch (error) {
      console.error('Failed to load branding settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyBranding = (settings: BrandingSettings | null) => {
    const root = window.document.documentElement;

    if (!settings) {
      // Apply defaults if no settings found
      root.style.setProperty('--color-primary', '#e6c0af');
      root.style.setProperty('--color-secondary', '#EBE0D7');
      root.style.setProperty('--color-accent', '#7E6C5E');
      return;
    }

    // Apply Theme Mode
    root.classList.remove('light', 'dark');

    if (settings.theme_mode === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(settings.theme_mode);
    }

    // Apply Colors (CSS Variables)
    if (settings.primary_color) {
      root.style.setProperty('--color-primary', settings.primary_color);
    }
    if (settings.secondary_color) {
      root.style.setProperty('--color-secondary', settings.secondary_color);
    }
    if (settings.accent_color) {
      root.style.setProperty('--color-accent', settings.accent_color);
    }

    // Apply Company Name to Title
    if (settings.company_name) {
      document.title = settings.company_name;
    }
  };

  useEffect(() => {
    loadSettings();

    // Listen for system theme changes if mode is system
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (settings?.theme_mode === 'system') {
        applyBranding(settings);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings?.theme_mode]);

  return (
    <BrandingContext.Provider value={{ settings, loading, refreshSettings: loadSettings }}>
      {children}
    </BrandingContext.Provider>
  );
}
