import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  CalendarDays, 
  Calendar,
  Settings, 
  UtensilsCrossed,
  Briefcase,
  Inbox,
  CheckSquare,
  DollarSign,
  Mail
} from 'lucide-react';
import clsx from 'clsx';
import { useBranding } from '../../contexts/BrandingContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Inbox },
  { name: 'Messages', href: '/messages', icon: Mail },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Venues', href: '/venues', icon: Building2 },
  { name: 'Planners', href: '/planners', icon: Briefcase },
  { name: 'Events', href: '/events', icon: CalendarDays },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Staff', href: '/staff', icon: Users },
  { name: 'Payroll', href: '/payroll', icon: DollarSign },
  { name: 'Products', href: '/products', icon: UtensilsCrossed },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const { settings } = useBranding();

  return (
    <div className="flex h-full w-64 flex-col bg-white dark:bg-gray-800 dark:bg-gray-800 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 dark:border-gray-700 dark:border-gray-800">
      <div className="flex h-16 items-center justify-center border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 dark:border-gray-800 px-4">
        {settings?.logo_url ? (
          <img src={settings.logo_url} alt={settings.company_name || 'Logo'} className="h-10 w-auto object-contain" />
        ) : (
          <h1 className="text-xl font-bold text-primary truncate">{settings?.company_name || 'Oh My Desserts MX'}</h1>
        )}
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={clsx(
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-800 hover:text-primary',
                'group flex items-center rounded-md px-2 py-2 text-sm font-medium'
              )}
            >
              <item.icon
                className={clsx(
                  isActive ? 'text-primary' : 'text-gray-400 group-hover:text-primary',
                  'mr-3 h-5 w-5 shrink-0'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
