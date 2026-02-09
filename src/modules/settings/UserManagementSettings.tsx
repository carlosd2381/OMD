import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Filter, Shield, LogOut, User as UserIcon, Clock, Smartphone, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { userService, type User, type Session, type UserRole, type UserStatus } from '../../services/userService';
import { settingsService, type Role } from '../../services/settingsService';

export default function UserManagementSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'security' | 'sessions'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  
  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRoles, setInviteRoles] = useState<UserRole[]>(['staff']); // Default to staff
  const [isManualAdd, setIsManualAdd] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoles, setEditRoles] = useState<UserRole[]>(['staff']);

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    passwordRotationDays: 90,
    requireSpecialChars: true,
    requireTwoFactor: false,
    sessionTimeoutMinutes: 60,
  });

  const loadData = async () => {
    try {
      const [usersData, sessionsData, rolesData] = await Promise.all([
        userService.getUsers(),
        userService.getSessions(),
        settingsService.getRoles()
      ]);
      setUsers(usersData);
      setSessions(sessionsData);
      setAvailableRoles(rolesData);
      
      // Set default invite role if available
      if (rolesData.length > 0) {
          const defaultRole = rolesData.find(r => r.id === 'staff') || rolesData[0];
          setInviteRoles([defaultRole.id as any]);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleInvite = async () => {
    if (!inviteEmail) return;
    try {
      if (isManualAdd) {
        await userService.createUser({
          name: inviteName || inviteEmail.split('@')[0],
          email: inviteEmail,
          role: inviteRoles,
          status: 'active'
        });
        toast.success(`User ${inviteEmail} added manually`);
      } else {
        await userService.inviteUser(inviteEmail, inviteRoles);
        toast.success(`Invitation sent to ${inviteEmail}`);
      }
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      setIsManualAdd(false);
      loadData();
    } catch (error) {
      console.error('Error inviting/adding user:', error);
      toast.error('Failed to invite/add user');
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRoles(user.role);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      await userService.updateUser(editingUser.id, {
        name: editName,
        role: editRoles
      });
      toast.success('User updated successfully');
      setIsEditModalOpen(false);
      setEditingUser(null);
      loadData();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await userService.revokeSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
      toast.success('Session revoked');
    } catch (error) {
      console.error('Error revoking session:', error);
      toast.error('Failed to revoke session');
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await userService.revokeAllSessions();
      setSessions([]);
      toast.success('All sessions revoked');
    } catch (error) {
      console.error('Error revoking all sessions:', error);
      toast.error('Failed to revoke all sessions');
    }
  };

  const handleSaveSecurity = () => {
    // In a real app, save to DB
    toast.success('Security policies updated');
  };

  const toggleUserStatus = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const newStatus: UserStatus = user.status === 'active' ? 'deactivated' : 'active';
    try {
      await userService.updateUserStatus(userId, newStatus);
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      toast.success('User status updated');
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">User Management</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Manage team access, security, and sessions.</p>
          </div>
        </div>
        {activeTab === 'users' && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Invite User
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`${
              activeTab === 'users'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <UserIcon className="h-4 w-4 mr-2" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`${
              activeTab === 'security'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Shield className="h-4 w-4 mr-2" />
            Security
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`${
              activeTab === 'sessions'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
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
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
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
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="deactivated">Deactivated</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 dark:bg-gray-800 divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="shrink-0 h-10 w-10">
                          <span className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 dark:text-gray-400 dark:text-gray-400 font-medium">
                            {user.name.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">{user.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {user.role.map((role) => (
                          <span key={role} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${user.status === 'active' ? 'bg-green-100 text-green-800' : 
                          user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                      {user.lastLogin && user.lastLogin !== '-' ? (
                        <span title={new Date(user.lastLogin).toLocaleString()}>
                          {formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
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
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg p-6 max-w-3xl">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-6">Password & Access Policies</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Password Rotation (Days)</label>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-2">How often users must change their password.</p>
              <input
                type="number"
                value={securitySettings.passwordRotationDays}
                onChange={(e) => setSecuritySettings({...securitySettings, passwordRotationDays: parseInt(e.target.value)})}
                className="block w-full max-w-xs border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Session Timeout (Minutes)</label>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-2">Automatically log out inactive users.</p>
              <input
                type="number"
                value={securitySettings.sessionTimeoutMinutes}
                onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeoutMinutes: parseInt(e.target.value)})}
                className="block w-full max-w-xs border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="special_chars"
                  type="checkbox"
                  checked={securitySettings.requireSpecialChars}
                  onChange={(e) => setSecuritySettings({...securitySettings, requireSpecialChars: e.target.checked})}
                  className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="special_chars" className="font-medium text-gray-700">Require Special Characters</label>
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Passwords must contain at least one symbol (!@#$%).</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="2fa"
                  type="checkbox"
                  checked={securitySettings.requireTwoFactor}
                  onChange={(e) => setSecuritySettings({...securitySettings, requireTwoFactor: e.target.checked})}
                  className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="2fa" className="font-medium text-gray-700">Require Two-Factor Authentication (2FA)</label>
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Force all users to set up 2FA for their accounts.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <button
                onClick={handleSaveSecurity}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
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
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Revoke All Sessions
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {sessions.map((session) => (
                <li key={session.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          {session.type === 'mobile' ? (
                            <Smartphone className="h-5 w-5 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
                          ) : (
                            <Monitor className="h-5 w-5 text-gray-500 dark:text-gray-400 dark:text-gray-400" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">{session.userName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                            {session.device} • {session.ip}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-sm text-gray-900 dark:text-white dark:text-white">{session.location}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                          Active: {session.lastActive ? formatDistanceToNow(new Date(session.lastActive), { addSuffix: true }) : '-'}
                        </div>
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
                <li className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">
                  No active sessions found.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Invite / Add Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-gray-50 dark:bg-gray-700 dark:bg-gray-7000 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-4">
              {isManualAdd ? 'Add User Manually' : 'Invite New User'}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center mb-4">
                <input
                  id="manual_add"
                  type="checkbox"
                  checked={isManualAdd}
                  onChange={(e) => setIsManualAdd(e.target.checked)}
                  className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                />
                <label htmlFor="manual_add" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                  Add manually (skip email invitation)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="colleague@omd.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {availableRoles.map(role => (
                    <div key={role.id} className="flex items-center">
                      <input
                        id={`invite-role-${role.id}`}
                        type="checkbox"
                        checked={inviteRoles.includes(role.id as any)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInviteRoles([...inviteRoles, role.id as any]);
                          } else {
                            setInviteRoles(inviteRoles.filter(r => r !== role.id));
                          }
                        }}
                        className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                      />
                      <label htmlFor={`invite-role-${role.id}`} className="ml-2 block text-sm text-gray-900 dark:text-white">
                        {role.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
              >
                {isManualAdd ? 'Add User' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-gray-50 dark:bg-gray-700 dark:bg-gray-7000 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white mb-4">Edit User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {availableRoles.map(role => (
                    <div key={role.id} className="flex items-center">
                      <input
                        id={`edit-role-${role.id}`}
                        type="checkbox"
                        checked={editRoles.includes(role.id as any)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditRoles([...editRoles, role.id as any]);
                          } else {
                            setEditRoles(editRoles.filter(r => r !== role.id));
                          }
                        }}
                        className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                      />
                      <label htmlFor={`edit-role-${role.id}`} className="ml-2 block text-sm text-gray-900 dark:text-white">
                        {role.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
