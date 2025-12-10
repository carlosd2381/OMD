import type { Planner, CreatePlannerDTO, UpdatePlannerDTO } from '../types/planner';

// Mock data
const MOCK_PLANNERS: Planner[] = [
  {
    id: '1',
    first_name: 'Ana',
    last_name: 'Lopez',
    email: 'ana@weddings.com',
    phone: '+52 55 9876 5432',
    company: 'Dream Weddings',
    website: 'www.dreamweddings.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    first_name: 'Roberto',
    last_name: 'Martinez',
    email: 'roberto@events.com',
    company: 'Elite Events',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const plannerService = {
  async getPlanners(): Promise<Planner[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_PLANNERS), 500);
    });
  },

  async getPlanner(id: string): Promise<Planner | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_PLANNERS.find(p => p.id === id)), 500);
    });
  },

  async createPlanner(planner: CreatePlannerDTO): Promise<Planner> {
    return new Promise((resolve) => {
      const newPlanner = {
        ...planner,
        id: Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      MOCK_PLANNERS.push(newPlanner);
      setTimeout(() => resolve(newPlanner), 500);
    });
  },

  async updatePlanner(id: string, planner: UpdatePlannerDTO): Promise<Planner> {
    return new Promise((resolve) => {
      const index = MOCK_PLANNERS.findIndex(p => p.id === id);
      if (index !== -1) {
        MOCK_PLANNERS[index] = { ...MOCK_PLANNERS[index], ...planner, updated_at: new Date().toISOString() };
        setTimeout(() => resolve(MOCK_PLANNERS[index]), 500);
      } else {
        throw new Error('Planner not found');
      }
    });
  },

  async deletePlanner(id: string): Promise<void> {
    return new Promise((resolve) => {
      const index = MOCK_PLANNERS.findIndex(p => p.id === id);
      if (index !== -1) {
        MOCK_PLANNERS.splice(index, 1);
      }
      setTimeout(() => resolve(), 500);
    });
  }
};
