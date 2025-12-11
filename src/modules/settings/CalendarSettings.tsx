import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon, Clock, Globe, Link as LinkIcon, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsService } from '../../services/settingsService';

export default function CalendarSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState({
    timezone: 'America/Cancun',
    weekStart: 'sunday', // sunday, monday
    defaultView: 'month', // month, week, day
    workingHours: {
      start: '09:00',
      end: '18:00',
      days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    },
    eventColors: {
      wedding: '#db2777', // pink-600
      corporate: '#2563eb', // blue-600
      social: '#16a34a', // green-600
      meeting: '#9333ea', // purple-600
      other: '#6b7280', // gray-500
    },
    integrations: {
      google: false,
      outlook: false,
      apple: false,
    }
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.getCalendarSettings();
      if (data) {
        // Parse working_hours JSON to extract everything
        const config = data.working_hours as any || {};
        setSettings({
          timezone: data.timezone,
          weekStart: data.week_start_day,
          defaultView: config.defaultView || 'month',
          workingHours: config.workingHours || { start: '09:00', end: '18:00', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
          eventColors: config.eventColors || { wedding: '#db2777', corporate: '#2563eb', social: '#16a34a', meeting: '#9333ea', other: '#6b7280' },
          integrations: config.integrations || { google: false, outlook: false, apple: false },
        });
      }
    } catch (error) {
      console.error('Error loading calendar settings:', error);
      toast.error('Failed to load calendar settings');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Pack everything into working_hours JSON
      const packedConfig = {
        workingHours: settings.workingHours,
        defaultView: settings.defaultView,
        eventColors: settings.eventColors,
        integrations: settings.integrations,
      };

      await settingsService.updateCalendarSettings({
        timezone: settings.timezone,
        week_start_day: settings.weekStart,
        working_hours: packedConfig,
      });
      toast.success('Calendar settings saved successfully');
    } catch (error) {
      console.error('Error saving calendar settings:', error);
      toast.error('Failed to save calendar settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://app.omd.com/calendar/feed.ics');
    toast.success('Calendar feed URL copied to clipboard');
  };

  const toggleIntegration = (key: keyof typeof settings.integrations) => {
    setSettings({
      ...settings,
      integrations: {
        ...settings.integrations,
        [key]: !settings.integrations[key]
      }
    });
    if (!settings.integrations[key]) {
      toast.success(`Connected to ${key.charAt(0).toUpperCase() + key.slice(1)} Calendar`);
    } else {
      toast('Disconnected', { icon: '🔌' });
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
            <h2 className="text-2xl font-bold text-gray-900">Calendar Settings</h2>
            <p className="text-sm text-gray-500">Manage timezones, event colors, and integrations.</p>
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
        
        {/* Left Column */}
        <div className="space-y-6">
          
          {/* General Preferences */}
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Globe className="h-5 w-5 mr-2 text-gray-400" />
              General Preferences
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                >
                  <option value="America/Cancun">Cancun (EST/No DST)</option>
                  <option value="America/Mexico_City">Mexico City (CST)</option>
                  <option value="America/New_York">New York (EST)</option>
                  <option value="America/Los_Angeles">Los Angeles (PST)</option>
                  <option value="UTC">UTC</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">All events will be displayed in this timezone.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Week Starts On</label>
                  <select
                    value={settings.weekStart}
                    onChange={(e) => setSettings({ ...settings, weekStart: e.target.value })}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                  >
                    <option value="sunday">Sunday</option>
                    <option value="monday">Monday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Default View</label>
                  <select
                    value={settings.defaultView}
                    onChange={(e) => setSettings({ ...settings, defaultView: e.target.value })}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                  >
                    <option value="month">Month</option>
                    <option value="week">Week</option>
                    <option value="day">Day</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-gray-400" />
              Working Hours
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input
                    type="time"
                    value={settings.workingHours.start}
                    onChange={(e) => setSettings({
                      ...settings,
                      workingHours: { ...settings.workingHours, start: e.target.value }
                    })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <input
                    type="time"
                    value={settings.workingHours.end}
                    onChange={(e) => setSettings({
                      ...settings,
                      workingHours: { ...settings.workingHours, end: e.target.value }
                    })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Work Days</label>
                <div className="flex flex-wrap gap-2">
                  {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => (
                    <button
                      key={day}
                      onClick={() => {
                        const days = settings.workingHours.days.includes(day)
                          ? settings.workingHours.days.filter(d => d !== day)
                          : [...settings.workingHours.days, day];
                        setSettings({
                          ...settings,
                          workingHours: { ...settings.workingHours, days }
                        });
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium uppercase transition-colors ${
                        settings.workingHours.days.includes(day)
                          ? 'bg-pink-100 text-pink-800 border border-pink-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">

          {/* Event Colors */}
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <div className="h-5 w-5 mr-2 rounded-full bg-linear-to-br from-pink-500 to-purple-500 opacity-50" />
              Event Type Colors
            </h3>
            <div className="space-y-3">
              {Object.entries(settings.eventColors).map(([type, color]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 capitalize">{type}</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setSettings({
                        ...settings,
                        eventColors: { ...settings.eventColors, [type as keyof typeof settings.eventColors]: e.target.value }
                      })}
                      className="h-8 w-8 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setSettings({
                        ...settings,
                        eventColors: { ...settings.eventColors, [type as keyof typeof settings.eventColors]: e.target.value }
                      })}
                      className="w-24 rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Integrations */}
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-gray-400" />
              Sync & Integrations
            </h3>
            <div className="space-y-4">
              {[
                { id: 'google', label: 'Google Calendar', icon: 'https://www.google.com/favicon.ico' },
                { id: 'outlook', label: 'Outlook Calendar', icon: 'https://outlook.live.com/favicon.ico' },
                { id: 'apple', label: 'Apple Calendar (iCal)', icon: 'https://www.apple.com/favicon.ico' },
              ].map((integration) => (
                <div key={integration.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center">
                    <img src={integration.icon} alt="" className="h-5 w-5 mr-3 opacity-70" />
                    <span className="text-sm font-medium text-gray-900">{integration.label}</span>
                  </div>
                  <button
                    onClick={() => toggleIntegration(integration.id as keyof typeof settings.integrations)}
                    className={`relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 ${
                      settings.integrations[integration.id as keyof typeof settings.integrations] ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        settings.integrations[integration.id as keyof typeof settings.integrations] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription Link */}
          <div className="bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <LinkIcon className="h-5 w-5 mr-2 text-gray-400" />
              Staff Subscription Feed
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Share this link with staff members to let them subscribe to the event calendar on their mobile devices.
            </p>
            <div className="flex rounded-md shadow-sm">
              <div className="relative grow focus-within:z-10">
                <input
                  type="text"
                  readOnly
                  value="https://app.omd.com/calendar/feed.ics"
                  className="focus:ring-pink-500 focus:border-pink-500 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300 bg-gray-50 text-gray-500"
                />
              </div>
              <button
                onClick={handleCopyLink}
                className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
              >
                <Copy className="h-4 w-4 text-gray-400" />
                <span>Copy</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
