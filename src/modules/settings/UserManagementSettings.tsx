import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Filter, MoreVertical, Shield, Key, LogOut, Mail, User, Clock, Smartphone, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';

type UserStatus = 'active' | 'pending' | 'deactivated';
type Role = 'admin' | 'manager' | 'staff';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  lastLogin: string;
}

interface Session {
  id: string;
  userId: string;
  userName: string;
  device: string;
  type: 'mobile' | 'desktop';
  ip: string;
  lastActive: string;
  location: string;
}

const MOCK_USERS: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@omd.com', role: 'admin', status: 'active', lastLogin: '2023-10-25 10:30 AM' },
  { id: '2', name: 'Sarah Baker', email: 'sarah@omd.com', role: 'manager', status: 'active', lastLogin: '2023-10-24 02:15 PM' },
  { id: '3', name: 'John Dough', email: 'john@omd.com', role: 'staff', status: 'pending', lastLogin: '-' },
  { id: '4', name: 'Ex Employee', email: 'ex@omd.com', role: 'staff', status: 'deactivated', lastLogin: '2023-09-15 09:00 AM' },
];

const MOCK_SESSIONS: Session[] = [
  { id: 's1', userId: '1', userName: 'Admin User', device: 'Chrome on macOS', type: 'desktop', ip: '192.168.1.1', lastActive: 'Just now', location: 'Mexico City, MX' },
  { id: 's2', userId: '2', userName: 'Sarah Baker', device: 'Safari on iPhone', type: 'mobile', ip: '10.0.0.5', lastActive: '5 mins ago', location: 'Guadalajara, MX' },
  { id: 's3', userId: '1', userName: 'Admin User', device: 'Firefox on Windows', type: 'desktop', ip: '192.168.1.2', lastActive: '2 hours ago', location: 'Mexico City, MX' },
];

export default function UserManagementSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'security' | 'sessions'>('users');
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [sessions, setSessions] = useState<Session[]>(MOCK_SESSIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  
  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('staff');

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    passwordRotationDays: 90,
    requireSpecialChars: true,
    requireTwoFactor: false,
    sessionTimeoutMinutes: 60,
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleInvite = () => {
    if (!inviteEmail) return;
    const newUser: User = {
      id: Date.now().toString(),
      name: inviteEmail.split('@')[0], // Placeholder name
      email: inviteEmail,
      role: inviteRole,
      status: 'pending',
      lastLogin: '-',
    };
    setUsers([...users, newUser]);
    setIsInviteModalOpen(false);
    setInviteEmail('');
    toast.success(`Invitation sent to ${inviteEmail}`);
  };

  const handleRevokeSession = (sessionId: string) => {
    setSessions(sessions.filter(s => s.id !== sessionId));
    toast.success('Session revoked');
  };

  const handleRevokeAllSessions = () => {
    setSessions([]);
    toast.success('All sessions revoked');
  };

  const handleSaveSecurity = () => {
    toast.success('Security policies updated');
  };

  const toggleUserStatus = (userId: string) => {
    setUsers(users.map(u => {
      if (u.id === userId) {
        const newStatus = u.status === 'active' ? 'deactivated' : 'active';
        return { ...u, status: newStatus };
      }
      return u;
    }));
    toast.success('User status updated');
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
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-500">Manage team access, security, and sessions.</p>
          </div>
        </div>
        {activeTab === 'users' && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Invite User
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`${
              activeTab === 'users'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <User className="h-4 w-4 mr-2" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`${
              activeTab === 'security'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Shield className="h-4 w-4 mr-2" />
            Security
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`${
              activeTab === 'sessions'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Clock className="h-4 w-4 mr-2" />
            Active Sessions
          </button>
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center ml-4">
              <Filter className="h-5 w-5 text-gray-400 mr-2" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="deactivated">Deactivated</option>
              </select>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="shrink-0 h-10 w-10">
                          <span className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-medium">
                            {user.name.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${user.status === 'active' ? 'bg-green-100 text-green-800' : 
                          user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLogin}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => toggleUserStatus(user.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        {user.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white shadow sm:rounded-lg p-6 max-w-3xl">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Password & Access Policies</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Password Rotation (Days)</label>
              <p className="text-sm text-gray-500 mb-2">How often users must change their password.</p>
              <input
                type="number"
                value={securitySettings.passwordRotationDays}
                onChange={(e) => setSecuritySettings({...securitySettings, passwordRotationDays: parseInt(e.target.value)})}
                className="block w-full max-w-xs border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Session Timeout (Minutes)</label>
              <p className="text-sm text-gray-500 mb-2">Automatically log out inactive users.</p>
              <input
                type="number"
                value={securitySettings.sessionTimeoutMinutes}
                onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeoutMinutes: parseInt(e.target.value)})}
                className="block w-full max-w-xs border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
              />
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="special_chars"
                  type="checkbox"
                  checked={securitySettings.requireSpecialChars}
                  onChange={(e) => setSecuritySettings({...securitySettings, requireSpecialChars: e.target.checked})}
                  className="focus:ring-pink-500 h-4 w-4 text-pink-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="special_chars" className="font-medium text-gray-700">Require Special Characters</label>
                <p className="text-gray-500">Passwords must contain at least one symbol (!@#$%).</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="2fa"
                  type="checkbox"
                  checked={securitySettings.requireTwoFactor}
                  onChange={(e) => setSecuritySettings({...securitySettings, requireTwoFactor: e.target.checked})}
                  className="focus:ring-pink-500 h-4 w-4 text-pink-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="2fa" className="font-medium text-gray-700">Require Two-Factor Authentication (2FA)</label>
                <p className="text-gray-500">Force all users to set up 2FA for their accounts.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleSaveSecurity}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
              >
                Save Policies
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handleRevokeAllSessions}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Revoke All Sessions
            </button>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {sessions.map((session) => (
                <li key={session.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          {session.type === 'mobile' ? (
                            <Smartphone className="h-5 w-5 text-gray-500" />
                          ) : (
                            <Monitor className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{session.userName}</div>
                          <div className="text-sm text-gray-500">
                            {session.device} • {session.ip}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-sm text-gray-900">{session.location}</div>
                        <div className="text-sm text-gray-500">Active: {session.lastActive}</div>
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          className="mt-2 text-xs text-red-600 hover:text-red-900 font-medium"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {sessions.length === 0 && (
                <li className="px-4 py-8 text-center text-gray-500">
                  No active sessions found.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invite New User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                  placeholder="colleague@omd.com"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                >
                  <option value="staff">Staff (Limited Access)</option>
                  <option value="manager">Manager (Full Access, No Settings)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
