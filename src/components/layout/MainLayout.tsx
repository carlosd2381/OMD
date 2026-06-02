import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import { clientService } from '../../services/clientService';

type AccessState =
  | { status: 'checking' }
  | { status: 'allowed' }
  | { status: 'redirect-portal'; clientId: string };

const STAFF_ROLE_HINTS = ['admin', 'super_admin', 'manager', 'planner', 'staff', 'owner'];

export default function MainLayout() {
  const { user, loading: authLoading } = useAuth();
  const [access, setAccess] = useState<AccessState>({ status: 'checking' });

  useEffect(() => {
    let cancelled = false;

    const evaluateAccess = async () => {
      if (authLoading || !user) return;

      try {
        const staff = await userService.getUserByAuthId(user.id);
        const isStaff = Array.isArray(staff?.role)
          ? staff!.role.some((role) =>
              STAFF_ROLE_HINTS.some((hint) => role.toLowerCase().includes(hint))
            )
          : false;

        if (isStaff) {
          if (!cancelled) setAccess({ status: 'allowed' });
          return;
        }

        const linkedClient = await clientService.getClientByAuthUser(user.id);
        if (linkedClient?.id) {
          if (!cancelled) setAccess({ status: 'redirect-portal', clientId: linkedClient.id });
          return;
        }

        if (!cancelled) setAccess({ status: 'allowed' });
      } catch (error) {
        console.error('MainLayout access check failed:', error);
        if (!cancelled) setAccess({ status: 'allowed' });
      }
    };

    evaluateAccess();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  if (access.status === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (access.status === 'redirect-portal') {
    return <Navigate to={`/portal/${access.clientId}`} replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-700 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
