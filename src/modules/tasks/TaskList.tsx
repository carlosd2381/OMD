import { useState, useEffect } from 'react';
import { Plus, Search, CheckCircle, Circle, Calendar, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { taskService } from '../../services/taskService';
import { userService, type User } from '../../services/userService';
import { supabase } from '../../lib/supabase';
import { useConfirm } from '../../contexts/ConfirmContext';
import type { Task } from '../../types/task';
import TaskModal from './TaskModal';
import toast from 'react-hot-toast';

export default function TaskList() {
  const { confirm } = useConfirm();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'me' | 'unassigned'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, usersData] = await Promise.all([
        taskService.getAllTasks(),
        userService.getUsers()
      ]);
      
      setTasks(tasksData);
      
      const usersMap = usersData.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<string, User>);
      setUsers(usersMap);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Find the user in our users list to get the full profile if needed, 
        // or just create a minimal User object with the ID
        const foundUser = usersData.find(u => u.id === user.id);
        if (foundUser) {
          setCurrentUser(foundUser);
        } else {
          // Fallback if user not in public.users table yet (though they should be)
          // We mainly need the ID for filtering
          setCurrentUser({ id: user.id } as User);
        }
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = () => {
    setSelectedTask(undefined);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await taskService.updateTask(task.id, { status: newStatus });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      toast.success(`Task marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const confirmed = await confirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      confirmLabel: 'Delete',
      type: 'danger'
    });
    
    if (!confirmed) return;
    
    try {
      await taskService.deleteTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    
    let matchesAssignment = true;
    if (assignmentFilter === 'me' && currentUser) {
      matchesAssignment = task.assigned_to === currentUser.id;
    } else if (assignmentFilter === 'unassigned') {
      matchesAssignment = !task.assigned_to;
    }

    return matchesSearch && matchesStatus && matchesAssignment;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Tasks</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage all tasks across clients, venues, and planners.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleAddTask}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 dark:border-gray-700">
        <div className="flex-1 relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-gray-300 pl-10 focus:border-primary focus:ring-primary sm:text-sm"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <select
            className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value as any)}
          >
            <option value="all">All Assignments</option>
            <option value="me">Assigned to Me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {filteredTasks.length === 0 ? (
            <li className="px-4 py-12 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white dark:text-white">No tasks found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Get started by creating a new task.</p>
            </li>
          ) : (
            filteredTasks.map((task) => (
              <li key={task.id}>
                <div 
                  className="block hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 cursor-pointer"
                  onClick={() => handleEditTask(task)}
                >
                  <div className="flex items-center px-4 py-4 sm:px-6">
                    <div className="min-w-0 flex-1 flex items-center">
                      <div className="flex-shrink-0 mr-4">
                        <button
                          onClick={(e) => handleToggleStatus(task, e)}
                          className={`flex-shrink-0 ${
                            task.status === 'completed' ? 'text-green-500' : 'text-gray-400 hover:text-gray-500 dark:text-gray-400 dark:text-gray-400'
                          }`}
                        >
                          {task.status === 'completed' ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <Circle className="h-6 w-6" />
                          )}
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium truncate ${
                            task.status === 'completed' ? 'text-gray-500 dark:text-gray-400 dark:text-gray-400 line-through' : 'text-primary'
                          }`}>
                            {task.title}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              task.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {task.status}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex justify-between">
                          <div className="sm:flex">
                            {task.due_date && (
                              <p className="flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mr-6">
                                <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                {format(new Date(task.due_date), 'MMM d, yyyy')}
                              </p>
                            )}
                            {task.assigned_to && users[task.assigned_to] && (
                              <p className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 sm:mt-0">
                                <UserIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                {users[task.assigned_to].name}
                              </p>
                            )}
                          </div>
                          <div className="ml-2 flex-shrink-0 flex">
                            <button
                              onClick={(e) => handleDeleteTask(task.id, e)}
                              className="text-red-600 hover:text-red-900 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={loadData}
        task={selectedTask}
      />
    </div>
  );
}
