import { jest } from '@jest/globals';

jest.mock('lucide-react-native', () => ({
  Plus: () => null,
  Settings2: () => null,
}));
