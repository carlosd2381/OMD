import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  CalendarDays, 
  Settings, 
  UtensilsCrossed,
  FileText,
  Briefcase,
  Inbox
} from 'lucide-react';
import clsx from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Inbox },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Venues', href: '/venues', icon: Building2 },
  { name: 'Planners', href: '/planners', icon: Briefcase },
  { name: 'Events', href: '/events', icon: CalendarDays },
  { name: 'Products', href: '/products', icon: UtensilsCrossed },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <h1 className="text-xl font-bold text-pink-500">OMD Web App</h1>
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
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                'group flex items-center rounded-md px-2 py-2 text-sm font-medium'
              )}
            >
              <item.icon
                className={clsx(
                  isActive ? 'text-pink-500' : 'text-gray-400 group-hover:text-pink-500',
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
