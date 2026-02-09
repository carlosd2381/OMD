import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Moon, Sun, Monitor, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsService, type BrandingSettings as BrandingSettingsType } from '../../services/settingsService';
import { useBranding } from '../../contexts/BrandingContext';

export default function BrandingSettings() {
  const navigate = useNavigate();
  const { refreshSettings } = useBranding();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Partial<BrandingSettingsType>>({
    theme_mode: 'system',
    primary_color: '#db2777', // Default pink-600
    secondary_color: '#fce7f3', // Default pink-100
    accent_color: '#be185d', // Default pink-700
    company_name: 'Oh My Desserts MX',
    logo_url: null,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.getBrandingSettings();
      if (data) {
        setSettings(data);
      } else {
        // If no settings exist, ensure we are using the defaults
        setSettings({
          theme_mode: 'system',
          primary_color: '#db2777',
          secondary_color: '#fce7f3',
          accent_color: '#be185d',
          company_name: 'Oh My Desserts MX',
          logo_url: null,
        });
      }
    } catch (error) {
      console.error('Error loading branding settings:', error);
      toast.error('Failed to load branding settings');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await settingsService.updateBrandingSettings(settings);
      await refreshSettings();
      toast.success('Branding settings saved successfully');
    } catch (error) {
      console.error('Error saving branding settings:', error);
      toast.error('Failed to save branding settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Branding & Appearance</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Customize the look and feel of your application.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Settings */}
        <div className="space-y-6">
          
          {/* Theme Selection */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-4">Display Mode</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'light', icon: Sun, label: 'Light' },
                { id: 'dark', icon: Moon, label: 'Dark' },
                { id: 'system', icon: Monitor, label: 'System' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSettings({ ...settings, theme_mode: mode.id as any })}
                  className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${
                    settings.theme_mode === mode.id
                      ? 'border-primary bg-secondary text-primary'
                      : 'border-gray-200 dark:border-gray-700 dark:border-gray-700 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <mode.icon className="h-6 w-6 mb-2" />
                  <span className="text-sm font-medium">{mode.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Logo Upload */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-4">Brand Logo</h3>
            <div className="flex items-center space-x-6">
              <div className="shrink-0 h-24 w-24 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 flex items-center justify-center">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo preview" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-gray-400 text-xs text-center px-2">No logo uploaded</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-end mb-2">
                  {settings.logo_url && (
                    <button
                      onClick={() => setSettings({ ...settings, logo_url: null })}
                      className="text-xs text-red-600 hover:text-red-500 font-medium"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>
                <label className="block w-full">
                  <span className="sr-only">Choose logo</span>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary transition-colors cursor-pointer relative">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none"
                        >
                          <span>Upload a file</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleLogoUpload} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">PNG, JPG, GIF up to 2MB</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Company Name */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-4">Company Name</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                value={settings.company_name || ''}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                placeholder="Oh My Desserts MX"
              />
            </div>
          </div>

          {/* Color Palette */}
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-4">Color Palette</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={settings.accent_color}
                    onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                    className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.accent_color}
                    onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg p-6 sticky top-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-4">Live Preview</h3>
            <div className="border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* Mock App Header */}
              <div 
                className="h-12 px-4 flex items-center justify-between"
                style={{ backgroundColor: settings.primary_color }}
              >
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-6 bg-white dark:bg-gray-800 dark:bg-gray-800/20 rounded-md"></div>
                  <div className="h-4 w-24 bg-white dark:bg-gray-800 dark:bg-gray-800/20 rounded"></div>
                </div>
                <div className="h-8 w-8 bg-white dark:bg-gray-800 dark:bg-gray-800/20 rounded-full"></div>
              </div>

              {/* Mock App Content */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 min-h-[300px] space-y-4">
                <div className="flex space-x-4">
                  {/* Sidebar Mock */}
                  <div className="w-1/4 space-y-2">
                    <div className="h-8 bg-white dark:bg-gray-800 dark:bg-gray-800 rounded shadow-sm"></div>
                    <div className="h-8 bg-white dark:bg-gray-800 dark:bg-gray-800 rounded shadow-sm"></div>
                    <div className="h-8 bg-white dark:bg-gray-800 dark:bg-gray-800 rounded shadow-sm"></div>
                  </div>
                  
                  {/* Main Content Mock */}
                  <div className="flex-1 space-y-4">
                    <div className="h-32 bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-3">
                      <div className="h-6 w-1/3 bg-gray-100 rounded"></div>
                      <div className="h-4 w-full bg-gray-100 rounded"></div>
                      <div className="h-4 w-2/3 bg-gray-100 rounded"></div>
                      <div className="flex justify-end">
                        <button 
                          className="px-3 py-1.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: settings.primary_color }}
                        >
                          Primary Action
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-24 bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-sm p-3 border-l-4" style={{ borderColor: settings.secondary_color }}>
                        <div className="h-4 w-1/2 bg-gray-100 rounded mb-2"></div>
                        <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: settings.secondary_color }}>
                          <Check className="h-4 w-4" style={{ color: settings.primary_color }} />
                        </div>
                      </div>
                      <div className="h-24 bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg shadow-sm p-3 border-l-4" style={{ borderColor: settings.accent_color }}>
                        <div className="h-4 w-1/2 bg-gray-100 rounded mb-2"></div>
                        <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: settings.accent_color }}>
                          <div className="h-4 w-4 bg-white dark:bg-gray-800 dark:bg-gray-800/50 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 text-center">
              This is how your changes will appear in the application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
