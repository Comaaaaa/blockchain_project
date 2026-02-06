import { User } from '@/types';

export const users: User[] = [
  {
    id: 'user-001',
    email: 'jean.dupont@email.com',
    name: 'Jean Dupont',
    passwordHash: '$2b$10$mockhashedpassword1',
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
    createdAt: '2024-01-01T10:00:00Z',
  },
  {
    id: 'user-002',
    email: 'marie.martin@email.com',
    name: 'Marie Martin',
    passwordHash: '$2b$10$mockhashedpassword2',
    walletAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    createdAt: '2024-01-05T14:00:00Z',
  },
  {
    id: 'user-003',
    email: 'pierre.bernard@email.com',
    name: 'Pierre Bernard',
    passwordHash: '$2b$10$mockhashedpassword3',
    walletAddress: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
    createdAt: '2024-01-10T09:00:00Z',
  },
  {
    id: 'demo-user',
    email: 'demo@tokenimmo.fr',
    name: 'Utilisateur Demo',
    passwordHash: '$2b$10$K8GpQxVhJLvBFGMiK4fHzOqaYvNTqxEXwY5NwF0H3Gf1hI2jK3lM4',
    walletAddress: '0x1234567890AbcdEF1234567890aBcDeF12345678',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

export const demoUser = users.find((u) => u.id === 'demo-user')!;
