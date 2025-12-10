import type { ClientFile } from '../types/clientFile';

let MOCK_FILES: ClientFile[] = [
  {
    id: '1',
    client_id: '1',
    name: 'Venue Floor Plan.pdf',
    description: 'Main ballroom layout with dimensions',
    url: '#', // Mock URL
    type: 'application/pdf',
    size: 1024 * 1024 * 2.5, // 2.5MB
    uploaded_at: '2024-01-15T10:30:00Z',
    uploaded_by: 'Admin User',
  },
  {
    id: '2',
    client_id: '1',
    name: 'Inspiration Board.jpg',
    description: 'Color palette and floral ideas',
    url: '#',
    type: 'image/jpeg',
    size: 1024 * 500, // 500KB
    uploaded_at: '2024-01-12T14:20:00Z',
    uploaded_by: 'Maria Gonzalez',
  }
];

export const fileService = {
  getFilesByClient: async (clientId: string): Promise<ClientFile[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_FILES.filter(f => f.client_id === clientId);
  },

  uploadFile: async (clientId: string, file: File, description: string): Promise<ClientFile> => {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload
    const newFile: ClientFile = {
      id: Math.random().toString(36).substr(2, 9),
      client_id: clientId,
      name: file.name,
      description: description,
      url: URL.createObjectURL(file), // Local preview URL for mock
      type: file.type,
      size: file.size,
      uploaded_at: new Date().toISOString(),
      uploaded_by: 'Admin User',
    };
    MOCK_FILES.push(newFile);
    return newFile;
  },

  deleteFile: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    MOCK_FILES = MOCK_FILES.filter(f => f.id !== id);
  }
};
