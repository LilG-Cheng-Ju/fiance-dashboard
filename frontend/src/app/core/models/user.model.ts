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
