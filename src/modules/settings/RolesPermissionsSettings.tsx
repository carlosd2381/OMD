import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Shield, AlertTriangle, Lock, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsService } from '../../services/settingsService';

type PermissionType = 'create' | 'read' | 'update' | 'delete';

interface ModulePermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean; // Cannot be deleted if true
  permissions: {
    clients: ModulePermissions;
    leads: ModulePermissions;
    events: ModulePermissions;
    products: ModulePermissions;
    venues: ModulePermissions;
    planners: ModulePermissions;
    financials: ModulePermissions; // Invoices, Quotes, Contracts
    settings: ModulePermissions;
  };
  fieldSecurity: {
    viewFinancialTotals: boolean;
    viewClientContactInfo: boolean;
    exportData: boolean;
    approveContracts: boolean;
  };
}

const DEFAULT_PERMISSIONS: ModulePermissions = { create: false, read: false, update: false, delete: false };

export default function RolesPermissionsSettings() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getRoles();
      
      const mapped: Role[] = data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        isSystem: item.is_system || false,
        permissions: (item.permissions as any) || {
            clients: DEFAULT_PERMISSIONS,
            leads: DEFAULT_PERMISSIONS,
            events: DEFAULT_PERMISSIONS,
            products: DEFAULT_PERMISSIONS,
            venues: DEFAULT_PERMISSIONS,
            planners: DEFAULT_PERMISSIONS,
            financials: DEFAULT_PERMISSIONS,
            settings: DEFAULT_PERMISSIONS,
        },
        fieldSecurity: (item.field_security as any) || {
            viewFinancialTotals: false,
            viewClientContactInfo: false,
            exportData: false,
            approveContracts: false,
        }
      }));
      setRoles(mapped);
      if (!selectedRoleId || !mapped.find(r => r.id === selectedRoleId)) {
          setSelectedRoleId(mapped[0]?.id || '');
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  const handleAddRole = () => {
    const newRole: Role = {
      id: 'new_' + Date.now().toString(),
      name: 'New Role',
      description: 'Custom role with defined permissions.',
      isSystem: false,
      permissions: {
        clients: DEFAULT_PERMISSIONS,
        leads: DEFAULT_PERMISSIONS,
        events: DEFAULT_PERMISSIONS,
        products: DEFAULT_PERMISSIONS,
        venues: DEFAULT_PERMISSIONS,
        planners: DEFAULT_PERMISSIONS,
        financials: DEFAULT_PERMISSIONS,
        settings: DEFAULT_PERMISSIONS,
      },
      fieldSecurity: {
        viewFinancialTotals: false,
        viewClientContactInfo: false,
        exportData: false,
        approveContracts: false,
      }
    };
    setRoles([...roles, newRole]);
    setSelectedRoleId(newRole.id);
    setIsEditingName(true);
  };

  const handleDeleteRole = async (id: string) => {
    const role = roles.find(r => r.id === id);
    if (role?.isSystem) {
      toast.error('Cannot delete system roles');
      return;
    }
    if (confirm('Are you sure you want to delete this role? Users assigned to this role will lose access.')) {
        try {
            if (!id.startsWith('new_')) {
                await settingsService.deleteRole(id);
            }
            const remaining = roles.filter(r => r.id !== id);
            setRoles(remaining);
            if (selectedRoleId === id) setSelectedRoleId(remaining[0]?.id || '');
            toast.success('Role deleted');
        } catch (error) {
            console.error('Error deleting role:', error);
            toast.error('Failed to delete role');
        }
    }
  };

  const updatePermission = (module: keyof Role['permissions'], type: PermissionType, value: boolean) => {
    if (selectedRole?.name === 'Admin' || selectedRole?.isSystem) {
        if (selectedRole?.name === 'Admin') {
             toast.error('Admin permissions cannot be modified');
             return;
        }
    }
    setRoles(roles.map(r => {
      if (r.id === selectedRoleId) {
        return {
          ...r,
          permissions: {
            ...r.permissions,
            [module]: {
              ...r.permissions[module],
              [type]: value
            }
          }
        };
      }
      return r;
    }));
  };

  const updateFieldSecurity = (field: keyof Role['fieldSecurity'], value: boolean) => {
    if (selectedRole?.name === 'Admin') return;
    setRoles(roles.map(r => {
      if (r.id === selectedRoleId) {
        return {
          ...r,
          fieldSecurity: {
            ...r.fieldSecurity,
            [field]: value
          }
        };
      }
      return r;
    }));
  };

  const updateRoleDetails = (name: string, description: string) => {
    setRoles(roles.map(r => r.id === selectedRoleId ? { ...r, name, description } : r));
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setLoading(true);
    try {
        const payload = {
            name: selectedRole.name,
            description: selectedRole.description,
            is_system: selectedRole.isSystem,
            permissions: selectedRole.permissions as any,
            field_security: selectedRole.fieldSecurity as any
        };

        if (selectedRole.id.startsWith('new_')) {
            const newRole = await settingsService.createRole(payload);
            toast.success('Role created successfully');
            await loadRoles();
            setSelectedRoleId(newRole.id);
        } else {
            await settingsService.updateRole(selectedRole.id, payload);
            toast.success('Role updated successfully');
        }
        setIsEditingName(false);
    } catch (error) {
        console.error('Error saving role:', error);
        toast.error('Failed to save role');
    } finally {
        setLoading(false);
    }
  };

  if (loading && roles.length === 0) {
      return <div>Loading...</div>;
  }

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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Roles & Permissions</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Manage access levels for your team.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
        {/* Sidebar: Role List */}
        <div className="w-full lg:w-1/4 bg-white dark:bg-gray-800 dark:bg-gray-800 shadow rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white dark:text-white">Roles</h3>
            <button onClick={handleAddRole} className="text-primary hover:text-pink-800">
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            <ul className="divide-y divide-gray-200">
              {roles.map((role) => (
                <li 
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`cursor-pointer hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 transition-colors ${selectedRoleId === role.id ? 'bg-secondary border-l-4 border-primary' : 'border-l-4 border-transparent'}`}
                >
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <Shield className={`h-4 w-4 mr-3 ${selectedRoleId === role.id ? 'text-primary' : 'text-gray-400'}`} />
                      <div>
                        <p className={`text-sm font-medium ${selectedRoleId === role.id ? 'text-pink-900' : 'text-gray-900 dark:text-white dark:text-white'}`}>
                          {role.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 truncate max-w-[150px]">{role.description}</p>
                      </div>
                    </div>
                    {!role.isSystem && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Main Content: Permissions Matrix */}
        {selectedRole && (
        <div className="flex-1 bg-white dark:bg-gray-800 dark:bg-gray-800 shadow rounded-lg overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {isEditingName ? (
                  <div className="space-y-3 max-w-md">
                    <input
                      type="text"
                      value={selectedRole.name}
                      onChange={(e) => updateRoleDetails(e.target.value, selectedRole.description)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm font-bold text-lg"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={selectedRole.description}
                      onChange={(e) => updateRoleDetails(selectedRole.name, e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                    />
                  </div>
                ) : (
                  <div onClick={() => !selectedRole.isSystem && setIsEditingName(true)} className={!selectedRole.isSystem ? 'cursor-pointer group' : ''}>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white dark:text-white flex items-center">
                      {selectedRole.name}
                      {selectedRole.isSystem && <Lock className="h-4 w-4 ml-2 text-gray-400" />}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{selectedRole.description}</p>
                  </div>
                )}
              </div>
              {selectedRole.name === 'Admin' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Super Admin
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Module Permissions */}
            <h4 className="text-sm font-medium text-gray-900 dark:text-white dark:text-white uppercase tracking-wider mb-4">Module Access</h4>
            <div className="border rounded-lg overflow-hidden mb-8">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Module</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Create</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Read</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Update</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">Delete</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 dark:bg-gray-800 divide-y divide-gray-200">
                  {Object.entries(selectedRole.permissions).map(([module, perms]) => (
                    <tr key={module}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white dark:text-white capitalize">
                        {module}
                      </td>
                      {(['create', 'read', 'update', 'delete'] as PermissionType[]).map((type) => (
                        <td key={type} className="px-6 py-4 whitespace-nowrap text-center">
                          <input
                            type="checkbox"
                            checked={perms[type]}
                            onChange={(e) => updatePermission(module as keyof Role['permissions'], type, e.target.checked)}
                            disabled={selectedRole.name === 'Admin'}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded disabled:opacity-50"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Field Level Security */}
            <h4 className="text-sm font-medium text-gray-900 dark:text-white dark:text-white uppercase tracking-wider mb-4">Field Level Security & Actions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start p-4 border rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
                <div className="flex items-center h-5">
                  <input
                    id="viewFinancialTotals"
                    type="checkbox"
                    checked={selectedRole.fieldSecurity.viewFinancialTotals}
                    onChange={(e) => updateFieldSecurity('viewFinancialTotals', e.target.checked)}
                    disabled={selectedRole.name === 'Admin'}
                    className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded disabled:opacity-50"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="viewFinancialTotals" className="font-medium text-gray-700">View Financial Totals</label>
                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Can see total revenue, budget, and cost figures.</p>
                </div>
              </div>

              <div className="flex items-start p-4 border rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
                <div className="flex items-center h-5">
                  <input
                    id="viewClientContactInfo"
                    type="checkbox"
                    checked={selectedRole.fieldSecurity.viewClientContactInfo}
                    onChange={(e) => updateFieldSecurity('viewClientContactInfo', e.target.checked)}
                    disabled={selectedRole.name === 'Admin'}
                    className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded disabled:opacity-50"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="viewClientContactInfo" className="font-medium text-gray-700">View Client Contact Info</label>
                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Can see phone numbers and email addresses.</p>
                </div>
              </div>

              <div className="flex items-start p-4 border rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
                <div className="flex items-center h-5">
                  <input
                    id="exportData"
                    type="checkbox"
                    checked={selectedRole.fieldSecurity.exportData}
                    onChange={(e) => updateFieldSecurity('exportData', e.target.checked)}
                    disabled={selectedRole.name === 'Admin'}
                    className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded disabled:opacity-50"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="exportData" className="font-medium text-gray-700">Export Data</label>
                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Can download CSV/Excel reports.</p>
                </div>
              </div>

              <div className="flex items-start p-4 border rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
                <div className="flex items-center h-5">
                  <input
                    id="approveContracts"
                    type="checkbox"
                    checked={selectedRole.fieldSecurity.approveContracts}
                    onChange={(e) => updateFieldSecurity('approveContracts', e.target.checked)}
                    disabled={selectedRole.name === 'Admin'}
                    className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded disabled:opacity-50"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="approveContracts" className="font-medium text-gray-700">Approve Contracts</label>
                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400">Can countersign contracts on behalf of the company.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
