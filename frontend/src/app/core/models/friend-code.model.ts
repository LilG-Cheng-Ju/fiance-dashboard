import { User } from './user.model';

/**
 * Matches schemas.FriendCodeRead in backend.
 */
export interface FriendCode {
  id: number;
  code: string;
  is_used: boolean;
  used_at?: string;
  created_at: string;
  used_by_user?: User;
}