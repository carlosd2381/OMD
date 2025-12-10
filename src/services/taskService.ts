import type { Task, TaskTemplate } from '../types/task';

// Mock Templates
const MOCK_TEMPLATES: TaskTemplate[] = [
  { id: 't1', title: 'Send Welcome Packet', category: 'Onboarding' },
  { id: 't2', title: 'Schedule Initial Consultation', category: 'Onboarding' },
  { id: 't3', title: 'Create Mood Board', category: 'Design' },
  { id: 't4', title: 'Finalize Guest Count', category: 'Planning' },
  { id: 't5', title: 'Confirm Vendor Meals', category: 'Planning' },
];

// Mock Tasks
let MOCK_TASKS: Task[] = [
  {
    id: '1',
    client_id: '1',
    title: 'Send Welcome Packet',
    status: 'completed',
    completed_at: '2024-01-15T10:30:00Z',
    completed_by: 'Admin User',
    created_at: '2024-01-10T09:00:00Z',
  },
  {
    id: '2',
    client_id: '1',
    title: 'Schedule Initial Consultation',
    status: 'pending',
    due_date: '2024-02-01',
    created_at: '2024-01-10T09:00:00Z',
  }
];

export const taskService = {
  getTasksByClient: async (clientId: string): Promise<Task[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_TASKS.filter(t => t.client_id === clientId);
  },

  addTask: async (task: Omit<Task, 'id' | 'created_at'>): Promise<Task> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newTask: Task = {
      ...task,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
    };
    MOCK_TASKS.push(newTask);
    return newTask;
  },

  updateTask: async (id: string, updates: Partial<Task>): Promise<Task | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = MOCK_TASKS.findIndex(t => t.id === id);
    if (index !== -1) {
      MOCK_TASKS[index] = { ...MOCK_TASKS[index], ...updates };
      return MOCK_TASKS[index];
    }
    return undefined;
  },

  deleteTask: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    MOCK_TASKS = MOCK_TASKS.filter(t => t.id !== id);
  },

  getTemplates: async (): Promise<TaskTemplate[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_TEMPLATES;
  }
};
