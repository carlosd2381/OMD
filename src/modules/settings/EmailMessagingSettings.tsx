import { useState, useEffect } from 'react';
import { Save, Mail, MessageSquare, Bell, Facebook, Instagram, Server, User, Smartphone, Trash2, Plus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsService, type SocialIntegration } from '../../services/settingsService';

type NotificationChannel = {
  email: boolean;
  inApp: boolean;
  sms: boolean;
  push: boolean;
};

type NotificationState = Record<string, NotificationChannel>;

const createDefaultNotifications = (): NotificationState => ({
  quoteSent: { email: true, inApp: true, sms: false, push: false },
  newLead: { email: true, inApp: true, sms: false, push: false },
  contractSigned: { email: true, inApp: true, sms: true, push: true },
  invoicePaid: { email: true, inApp: true, sms: false, push: false },
  eventReminder: { email: true, inApp: true, sms: true, push: true }
});

const normalizeChannel = (channel?: Partial<NotificationChannel>): NotificationChannel => ({
  email: channel?.email ?? false,
  inApp: channel?.inApp ?? false,
  sms: channel?.sms ?? false,
  push: channel?.push ?? false
});

const mergeNotificationSettings = (incoming?: Record<string, Partial<NotificationChannel>> | null): NotificationState => {
  const base = createDefaultNotifications();
  if (!incoming) return base;

  Object.entries(incoming).forEach(([key, value]) => {
    base[key] = {
      ...(base[key] || normalizeChannel()),
      ...(value || {})
    } as NotificationChannel;
  });

  return base;
};

export default function EmailMessagingSettings() {
  const [activeTab, setActiveTab] = useState('email');
  const [loading, setLoading] = useState(false);
  const [socialIntegrations, setSocialIntegrations] = useState<SocialIntegration[]>([]);
  const [showSocialForm, setShowSocialForm] = useState<'facebook' | 'instagram' | null>(null);
  const [newSocialConfig, setNewSocialConfig] = useState({
    page_id: '',
    access_token: '',
    page_name: ''
  });

  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: '',
    username: '',
    password: '',
    secure: false,
    fromName: '',
    replyTo: ''
  });

  const [signature, setSignature] = useState('');
  
  const [notifications, setNotifications] = useState<NotificationState>(() => createDefaultNotifications());

  const [twilioSettings, setTwilioSettings] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [emailData, socialData] = await Promise.all([
        settingsService.getEmailSettings(),
        settingsService.getSocialIntegrations()
      ]);

      if (emailData) {
        const smtp = emailData.smtp_config as any || {};
        const sender = emailData.sender_identity as any || {};
        const notifs = (emailData.notifications as Record<string, Partial<NotificationChannel>> | null) || null;
        const sms = emailData.sms_config as any || {};

        setSmtpSettings({
          host: smtp.host || '',
          port: smtp.port || '',
          username: smtp.username || '',
          password: smtp.password || '',
          secure: smtp.secure || false,
          fromName: sender.fromName || '',
          replyTo: sender.replyTo || ''
        });
        setSignature(emailData.signature || '');
        
        setNotifications(mergeNotificationSettings(notifs));

        setTwilioSettings({
            accountSid: sms.accountSid || '',
            authToken: sms.authToken || '',
            phoneNumber: sms.phoneNumber || ''
        });
      }

      setSocialIntegrations(socialData);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const handleSaveSocial = async () => {
    if (!showSocialForm || !newSocialConfig.page_id || !newSocialConfig.access_token) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await settingsService.saveSocialIntegration({
        platform: showSocialForm,
        page_id: newSocialConfig.page_id,
        page_name: newSocialConfig.page_name || `${showSocialForm} Page`,
        access_token: newSocialConfig.access_token,
        is_active: true
      });
      
      toast.success('Social integration saved');
      setShowSocialForm(null);
      setNewSocialConfig({ page_id: '', access_token: '', page_name: '' });
      loadSettings();
    } catch (error) {
      console.error('Error saving social integration:', error);
      toast.error('Failed to save integration');
    }
  };

  const handleDeleteSocial = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this integration?')) {
      try {
        await settingsService.deleteSocialIntegration(id);
        toast.success('Integration removed');
        loadSettings();
      } catch (error) {
        toast.error('Failed to remove integration');
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await settingsService.updateEmailSettings({
        smtp_config: {
            host: smtpSettings.host,
            port: smtpSettings.port,
            username: smtpSettings.username,
            password: smtpSettings.password,
            secure: smtpSettings.secure
        },
        sender_identity: {
            fromName: smtpSettings.fromName,
            replyTo: smtpSettings.replyTo
        },
        signature: signature,
        notifications: notifications,
        sms_config: twilioSettings
      });
      toast.success('Email settings saved successfully');
    } catch (error) {
      console.error('Error saving email settings:', error);
      toast.error('Failed to save email settings');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'email', label: 'Email Configuration', icon: Mail },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'sms', label: 'SMS Gateway', icon: Smartphone },
    { id: 'social', label: 'Social Integrations', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Email & Messaging</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Configure how your system communicates with clients and staff.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
              } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <tab.icon
                className={`${
                  activeTab === tab.id ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:text-gray-400'
                } -ml-0.5 mr-2 h-5 w-5`}
                aria-hidden="true"
              />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow rounded-lg p-6">
        
        {/* Email Configuration Tab */}
        {activeTab === 'email' && (
          <div className="space-y-8">
            {/* SMTP Settings */}
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white dark:text-white flex items-center">
                <Server className="h-5 w-5 mr-2 text-gray-400" />
                SMTP Configuration
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Configure your outgoing email server settings.</p>
              <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-4">
                  <label className="block text-sm font-medium text-gray-700">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpSettings.host}
                    onChange={(e) => setSmtpSettings({...smtpSettings, host: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Port</label>
                  <input
                    type="text"
                    value={smtpSettings.port}
                    onChange={(e) => setSmtpSettings({...smtpSettings, port: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    value={smtpSettings.username}
                    onChange={(e) => setSmtpSettings({...smtpSettings, username: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={smtpSettings.password}
                    onChange={(e) => setSmtpSettings({...smtpSettings, password: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
                <div className="sm:col-span-6">
                  <div className="flex items-center">
                    <input
                      id="secure-smtp"
                      type="checkbox"
                      checked={smtpSettings.secure}
                      onChange={(e) => setSmtpSettings({...smtpSettings, secure: e.target.checked})}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="secure-smtp" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                      Use Secure Connection (SSL/TLS)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 pt-8">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white dark:text-white flex items-center">
                <User className="h-5 w-5 mr-2 text-gray-400" />
                Sender Identity
              </h3>
              <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">From Name</label>
                  <input
                    type="text"
                    value={smtpSettings.fromName}
                    onChange={(e) => setSmtpSettings({...smtpSettings, fromName: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Reply-To Email</label>
                  <input
                    type="email"
                    value={smtpSettings.replyTo}
                    onChange={(e) => setSmtpSettings({...smtpSettings, replyTo: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-700 pt-8">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white dark:text-white">Global Email Signature</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">This signature will be appended to all system emails.</p>
              <div className="mt-4">
                <textarea
                  rows={5}
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm font-mono"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">HTML is supported.</p>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white dark:text-white">Notification Preferences</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-6">Choose how you want to be notified for different events.</p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-4 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 pb-2 font-medium text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                <div className="col-span-1">Event Type</div>
                <div className="text-center">Email</div>
                <div className="text-center">In-App</div>
                <div className="text-center">SMS</div>
                <div className="text-center">Push</div>
              </div>

              {Object.entries(notifications).map(([key, prefs]) => (
                <div key={key} className="grid grid-cols-5 gap-4 items-center py-2">
                  <div className="col-span-1 text-sm font-medium text-gray-900 dark:text-white dark:text-white capitalize">
                    {key.replace(/([A-Z])/g, ' ').trim()}
                  </div>
                  {Object.entries(prefs).map(([channel, enabled]) => (
                    <div key={channel} className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setNotifications({
                          ...notifications,
                          [key]: { ...prefs, [channel]: e.target.checked }
                        })}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SMS Gateway Tab */}
        {activeTab === 'sms' && (
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white dark:text-white flex items-center">
              <Smartphone className="h-5 w-5 mr-2 text-gray-400" />
              Twilio Configuration
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Connect your Twilio account to enable SMS features.</p>
            
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label className="block text-sm font-medium text-gray-700">Account SID</label>
                <input
                  type="text"
                  value={twilioSettings.accountSid}
                  onChange={(e) => setTwilioSettings({...twilioSettings, accountSid: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-sm font-medium text-gray-700">Auth Token</label>
                <input
                  type="password"
                  value={twilioSettings.authToken}
                  onChange={(e) => setTwilioSettings({...twilioSettings, authToken: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-sm font-medium text-gray-700">Twilio Phone Number</label>
                <input
                  type="text"
                  value={twilioSettings.phoneNumber}
                  onChange={(e) => setTwilioSettings({...twilioSettings, phoneNumber: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="+1234567890"
                />
              </div>
            </div>
          </div>
        )}

        {/* Social Integrations Tab */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Social Media Integrations</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Connect your social accounts to manage messages directly.</p>
              </div>
            </div>

            {/* Active Integrations List */}
            {socialIntegrations.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {socialIntegrations.map((integration) => (
                  <div key={integration.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center space-x-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        integration.platform === 'facebook' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
                      }`}>
                        {integration.platform === 'facebook' ? <Facebook className="h-5 w-5" /> : <Instagram className="h-5 w-5" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white capitalize">{integration.platform}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{integration.page_name} ({integration.page_id})</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                      <button
                        onClick={() => handleDeleteSocial(integration.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Integration */}
            {!showSocialForm ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mt-6">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 flex flex-col items-center text-center space-y-4 hover:border-primary/50 transition-colors">
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <Facebook className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">Facebook Messenger</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Receive and reply to page messages.</p>
                  </div>
                  <button 
                    onClick={() => setShowSocialForm('facebook')}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Facebook
                  </button>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 flex flex-col items-center text-center space-y-4 hover:border-primary/50 transition-colors">
                  <div className="h-12 w-12 bg-pink-100 rounded-full flex items-center justify-center text-pink-600">
                    <Instagram className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">Instagram Direct</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage DMs and story replies.</p>
                  </div>
                  <button 
                    onClick={() => setShowSocialForm('instagram')}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Instagram
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mt-6">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4 capitalize">
                  Connect {showSocialForm}
                </h4>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Page Name (Optional)</label>
                    <input
                      type="text"
                      value={newSocialConfig.page_name}
                      onChange={(e) => setNewSocialConfig({...newSocialConfig, page_name: e.target.value})}
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                      placeholder="My Business Page"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Page ID</label>
                    <input
                      type="text"
                      value={newSocialConfig.page_id}
                      onChange={(e) => setNewSocialConfig({...newSocialConfig, page_id: e.target.value})}
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                      placeholder="1234567890"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Page Access Token
                      <span className="ml-2 text-xs text-gray-500">
                        (Generate this in the <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="text-primary hover:underline">Graph API Explorer</a>)
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      value={newSocialConfig.access_token}
                      onChange={(e) => setNewSocialConfig({...newSocialConfig, access_token: e.target.value})}
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm font-mono"
                      placeholder="EAA..."
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowSocialForm(null)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSocial}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Save Integration
                  </button>
                </div>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 mt-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-blue-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    To receive messages, you must also configure Webhooks in your Meta App Dashboard.
                    <br />
                    Callback URL: <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">https://your-project.supabase.co/functions/v1/meta-webhook</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
