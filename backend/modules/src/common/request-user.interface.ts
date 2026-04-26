import type { UserRole } from '@matflow/shared-types';

export interface RequestUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  siteId: string;
  authMode?: 'user' | 'driver-pass';
  transportId?: string;
  truckId?: string;
  licensePlate?: string;
}
