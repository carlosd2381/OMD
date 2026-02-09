import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Phone, Mail, User } from 'lucide-react';
import { staffService } from '../../services/staffService';
import type { StaffProfile } from '../../types/staff';
import toast from 'react-hot-toast';
import AddStaffModal from './AddStaffModal';
import { useAuth } from '../../contexts/AuthContext';

export default function StaffList() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { session, loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to initialize and session to be available so requests are made as the authenticated user
    if (!authLoading && session?.user) {
      loadStaff();
    }
  }, [authLoading, session?.user?.id]);

  const loadStaff = async () => {
    try {
      const data = await staffService.getStaffMembers();
      setStaff(data);
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error('Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter(member =>
    `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Staff Management</h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Staff Account
        </button>
      </div>

      <div className="flex items-center px-4 py-3 bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg shadow-sm">
        <Search className="h-5 w-5 text-gray-400 mr-3" />
        <input
          type="text"
          placeholder="Search staff..."
          className="flex-1 border-none focus:ring-0 text-gray-900 dark:text-white dark:text-white placeholder-gray-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredStaff.map((member) => (
            <li key={member.id}>
              <div
                onClick={() => navigate(`/staff/${member.user_id}`)}
                className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <div className="flex-shrink-0 bg-pink-100 rounded-full p-3">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="ml-4 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">
                      {member.first_name} {member.last_name}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      {member.is_driver ? 'Driver' : 'Staff'}
                    </p>
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="flex items-center">
                        <Mail className="h-4 w-4 mr-1 text-gray-400" />
                        <span className="truncate">{member.email}</span>
                      </span>
                      {member.phone && (
                        <span className="flex items-center">
                          <Phone className="h-4 w-4 mr-1 text-gray-400" />
                          {member.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  to={`/staff/${member.user_id}`}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-primary bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-primary/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Profile
                </Link>
              </div>
            </li>
          ))}
          {filteredStaff.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500">
              No staff members found.
            </li>
          )}
        </ul>
      </div>

      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadStaff}
      />
    </div>
  );
}
