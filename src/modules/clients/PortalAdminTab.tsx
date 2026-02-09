import { useState } from 'react';
import { Mail, Lock, Copy, Shield, Eye } from 'lucide-react';
import { clientService } from '../../services/clientService';
import type { Client } from '../../types/client';
import toast from 'react-hot-toast';

interface PortalAdminTabProps {
  client: Client;
  onUpdate: () => void;
}

export default function PortalAdminTab({ client, onUpdate }: PortalAdminTabProps) {
  const [loading, setLoading] = useState(false);

  const handleToggleAccess = async () => {
    try {
      setLoading(true);
      await clientService.togglePortalAccess(client.id, !client.portal_access);
      toast.success(client.portal_access ? 'Portal access disabled' : 'Portal access enabled');
      onUpdate();
    } catch (error) {
      toast.error('Failed to update access');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    try {
      setLoading(true);
      await clientService.sendPortalInvite(client.id);
      toast.success('Access email sent successfully');
    } catch (error) {
      toast.error('Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (confirm('Are you sure you want to send a password reset link?')) {
      try {
        setLoading(true);
        await clientService.resetPortalPassword(client.id);
        toast.success('Password reset link sent');
      } catch (error) {
        toast.error('Failed to send reset link');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/portal/${client.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Magic link copied to clipboard');
  };

  const handleToggleFeature = async (feature: keyof NonNullable<Client['portal_settings']>) => {
    if (!client.portal_settings) return;
    
    const newSettings = {
      ...client.portal_settings,
      [feature]: !client.portal_settings[feature]
    };

    try {
      await clientService.updatePortalSettings(client.id, newSettings);
      onUpdate();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const settings = client.portal_settings || {
    show_quotes: true,
    show_contracts: true,
    show_invoices: true,
    show_questionnaires: true,
  };

  return (
    <div className="space-y-6">
      {/* Access Control Card */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white flex items-center">
            <Shield className="h-5 w-5 mr-2 text-gray-400" />
            Access Control
          </h3>
        </div>
        <div className="px-4 py-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">Portal Status</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                {client.portal_access 
                  ? 'Client can currently access the portal.' 
                  : 'Access is currently disabled for this client.'}
              </p>
            </div>
            <button
              onClick={handleToggleAccess}
              disabled={loading}
              className={`relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                client.portal_access ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white dark:bg-gray-800 dark:bg-gray-800 shadow transform ring-0 transition ease-in-out duration-200 ${
                  client.portal_access ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {client.portal_access && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <button
                onClick={handleSendInvite}
                disabled={loading}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700"
              >
                <Mail className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
                Resend Invite
              </button>
              <button
                onClick={handleResetPassword}
                disabled={loading}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700"
              >
                <Lock className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
                Reset Password
              </button>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700"
              >
                <Copy className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
                Copy Magic Link
              </button>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 p-3 rounded-md flex justify-between items-center">
            <span>Last Login:</span>
            <span className="font-medium text-gray-900 dark:text-white dark:text-white">
              {client.portal_last_login 
                ? new Date(client.portal_last_login).toLocaleString() 
                : 'Never'}
            </span>
          </div>
        </div>
      </div>

      {/* Feature Visibility Card */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white flex items-center">
            <Eye className="h-5 w-5 mr-2 text-gray-400" />
            Tab Visibility
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
            Control which sections are visible to the client in their portal.
          </p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { key: 'show_quotes', label: 'Quotes' },
              { key: 'show_contracts', label: 'Contracts' },
              { key: 'show_invoices', label: 'Invoices' },
              { key: 'show_questionnaires', label: 'Questionnaires' },
            ].map((feature) => (
              <div key={feature.key} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg">
                <span className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">{feature.label}</span>
                <button
                  onClick={() => handleToggleFeature(feature.key as keyof typeof settings)}
                  className={`relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                    settings[feature.key as keyof typeof settings] ? 'bg-primary' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white dark:bg-gray-800 dark:bg-gray-800 shadow transform ring-0 transition ease-in-out duration-200 ${
                      settings[feature.key as keyof typeof settings] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
