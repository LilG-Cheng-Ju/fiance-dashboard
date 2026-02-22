export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  FRIEND = 'FRIEND',
  PAID = 'PAID',
  USER = 'USER',
}

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  created_at: string;
  last_login_at?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isAnonymous: boolean;
}

export interface SubscriptionStatus {
  plan: 'free' | 'pro' | 'friend';
  expiryDate?: Date;
  isActive: boolean;
}
