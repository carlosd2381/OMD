import { 
  Palette, 
  Mail, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  Clock, 
  FileText, 
  Tags, 
  Users, 
  Shield, 
  Key, 
  LayoutTemplate, 
  Zap, 
  Folder, 
  ArrowLeftRight, 
  Plug, 
  Sliders,
  Building,
  Truck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const settingsCategories = [
  { name: 'Company Details', icon: Building, description: 'Address, contact info, and social media' },
  { name: 'Branding', icon: Palette, description: 'Logo, colors, and themes' },
  { name: 'Delivery & Logistics', icon: Truck, description: 'Delivery fees and distance settings' },
  { name: 'Email/Messaging', icon: Mail, description: 'Templates and signatures' },
  { name: 'Calendar', icon: Calendar, description: 'Availability and syncing' },
  { name: 'Financial', icon: DollarSign, description: 'Currency and tax settings' },
  { name: 'Payment Methods', icon: CreditCard, description: 'Gateways and options' },
  { name: 'Payment Schedules', icon: Clock, description: 'Default payment terms' },
  { name: 'Contact Forms', icon: FileText, description: 'Lead capture forms' },
  { name: 'Expense Categories', icon: Tags, description: 'Track spending types' },
  { name: 'User Management', icon: Users, description: 'Team members and access' },
  { name: 'Roles Permissions', icon: Shield, description: 'Access control levels' },
  { name: 'Token Management', icon: Key, description: 'Merge tags and shortcodes' },
  { name: 'Templates', icon: LayoutTemplate, description: 'Document templates' },
  { name: 'Automations', icon: Zap, description: 'Workflows and triggers' },
  { name: 'File Library', icon: Folder, description: 'Shared documents and assets' },
  { name: 'Import Export', icon: ArrowLeftRight, description: 'Data migration tools' },
  { name: 'API Integrations', icon: Plug, description: 'Connect external services' },
  { name: 'Advanced Configurations', icon: Sliders, description: 'System-level settings' },
];

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
            Settings
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
            Manage your application preferences and configurations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {settingsCategories.map((category) => (
          <div
            key={category.name}
            className="relative group bg-white dark:bg-gray-800 dark:bg-gray-800 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700 dark:border-gray-700"
            onClick={() => {
              if (category.name === 'Company Details') {
                navigate('/settings/company');
              } else if (category.name === 'Branding') {
                navigate('/settings/branding');
              } else if (category.name === 'Delivery & Logistics') {
                navigate('/settings/delivery');
              } else if (category.name === 'Calendar') {
                navigate('/settings/calendar');
              } else if (category.name === 'Financial') {
                navigate('/settings/financial');
              } else if (category.name === 'Payment Methods') {
                navigate('/settings/payment-methods');
              } else if (category.name === 'Payment Schedules') {
                navigate('/settings/payment-schedules');
              } else if (category.name === 'Contact Forms') {
                navigate('/settings/contact-forms');
              } else if (category.name === 'Expense Categories') {
                navigate('/settings/expense-categories');
              } else if (category.name === 'User Management') {
                navigate('/settings/user-management');
              } else if (category.name === 'Roles Permissions') {
                navigate('/settings/roles-permissions');
              } else if (category.name === 'Token Management') {
                navigate('/settings/tokens');
              } else if (category.name === 'Templates') {
                navigate('/settings/templates');
              } else if (category.name === 'Automations') {
                navigate('/settings/automations');
              } else if (category.name === 'Email/Messaging') {
                navigate('/settings/email-messaging');
              } else {
                console.log(`Navigate to ${category.name}`);
              }
            }}
          >
            <div>
              <span className="rounded-lg inline-flex p-3 bg-secondary text-accent ring-4 ring-white group-hover:bg-pink-100 transition-colors">
                <category.icon className="h-6 w-6" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-medium">
                <a href="#" className="focus:outline-none">
                  {/* Extend touch target to entire panel */}
                  <span className="absolute inset-0" aria-hidden="true" />
                  {category.name}
                </a>
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                {category.description}
              </p>
            </div>
            <span
              className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400"
              aria-hidden="true"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
              </svg>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
