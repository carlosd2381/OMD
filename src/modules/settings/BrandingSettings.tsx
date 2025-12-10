import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Moon, Sun, Monitor, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BrandingSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Mock state - in a real app this would come from a context or API
  const [settings, setSettings] = useState({
    theme: 'system', // light, dark, system
    colors: {
      primary: '#E6C0B0', // Dusty Peach
      secondary: '#EBE0D6', // Latte Cream
      accent: '#7E6C5E', // Taupe Brown
      background: '#ffffff',
      text: '#7E6C5E', // Taupe Brown
    },
    logo: null as string | null,
  });

  const handleSave = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Branding settings saved successfully');
    setLoading(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logo: reader.result as string });
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
            <ArrowLeft className="h-6 w-6 text-gray-500" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Branding & Appearance</h2>
            <p className="text-sm text-gray-500">Customize the look and feel of your application.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Settings */}
        <div className="space-y-6">
          
          {/* Theme Selection */}
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Display Mode</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'light', icon: Sun, label: 'Light' },
                { id: 'dark', icon: Moon, label: 'Dark' },
                { id: 'system', icon: Monitor, label: 'System' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSettings({ ...settings, theme: mode.id })}
                  className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${
                    settings.theme === mode.id
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <mode.icon className="h-6 w-6 mb-2" />
                  <span className="text-sm font-medium">{mode.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Logo Upload */}
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Brand Logo</h3>
            <div className="flex items-center space-x-6">
              <div className="shrink-0 h-24 w-24 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                {settings.logo ? (
                  <img src={settings.logo} alt="Logo preview" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-gray-400 text-xs text-center px-2">No logo uploaded</span>
                )}
              </div>
              <div className="flex-1">
                <label className="block w-full">
                  <span className="sr-only">Choose logo</span>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-pink-500 transition-colors cursor-pointer relative">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-pink-600 hover:text-pink-500 focus-within:outline-none"
                        >
                          <span>Upload a file</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleLogoUpload} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 2MB</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Color Palette */}
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Color Palette</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={settings.colors.primary}
                    onChange={(e) => setSettings({
                      ...settings,
                      colors: { ...settings.colors, primary: e.target.value }
                    })}
                    className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.colors.primary}
                    onChange={(e) => setSettings({
                      ...settings,
                      colors: { ...settings.colors, primary: e.target.value }
                    })}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={settings.colors.secondary}
                    onChange={(e) => setSettings({
                      ...settings,
                      colors: { ...settings.colors, secondary: e.target.value }
                    })}
                    className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.colors.secondary}
                    onChange={(e) => setSettings({
                      ...settings,
                      colors: { ...settings.colors, secondary: e.target.value }
                    })}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={settings.colors.accent}
                    onChange={(e) => setSettings({
                      ...settings,
                      colors: { ...settings.colors, accent: e.target.value }
                    })}
                    className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.colors.accent}
                    onChange={(e) => setSettings({
                      ...settings,
                      colors: { ...settings.colors, accent: e.target.value }
                    })}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="space-y-6">
          <div className="bg-white shadow sm:rounded-lg p-6 sticky top-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Live Preview</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Mock App Header */}
              <div 
                className="h-12 px-4 flex items-center justify-between"
                style={{ backgroundColor: settings.colors.primary }}
              >
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-6 bg-white/20 rounded-md"></div>
                  <div className="h-4 w-24 bg-white/20 rounded"></div>
                </div>
                <div className="h-8 w-8 bg-white/20 rounded-full"></div>
              </div>

              {/* Mock App Content */}
              <div className="p-4 bg-gray-50 min-h-[300px] space-y-4">
                <div className="flex space-x-4">
                  {/* Sidebar Mock */}
                  <div className="w-1/4 space-y-2">
                    <div className="h-8 bg-white rounded shadow-sm"></div>
                    <div className="h-8 bg-white rounded shadow-sm"></div>
                    <div className="h-8 bg-white rounded shadow-sm"></div>
                  </div>
                  
                  {/* Main Content Mock */}
                  <div className="flex-1 space-y-4">
                    <div className="h-32 bg-white rounded-lg shadow-sm p-4 space-y-3">
                      <div className="h-6 w-1/3 bg-gray-100 rounded"></div>
                      <div className="h-4 w-full bg-gray-100 rounded"></div>
                      <div className="h-4 w-2/3 bg-gray-100 rounded"></div>
                      <div className="flex justify-end">
                        <button 
                          className="px-3 py-1.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: settings.colors.primary }}
                        >
                          Primary Action
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-24 bg-white rounded-lg shadow-sm p-3 border-l-4" style={{ borderColor: settings.colors.secondary }}>
                        <div className="h-4 w-1/2 bg-gray-100 rounded mb-2"></div>
                        <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: settings.colors.secondary }}>
                          <Check className="h-4 w-4" style={{ color: settings.colors.primary }} />
                        </div>
                      </div>
                      <div className="h-24 bg-white rounded-lg shadow-sm p-3 border-l-4" style={{ borderColor: settings.colors.accent }}>
                        <div className="h-4 w-1/2 bg-gray-100 rounded mb-2"></div>
                        <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: settings.colors.accent }}>
                          <div className="h-4 w-4 bg-white/50 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500 text-center">
              This is how your changes will appear in the application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
