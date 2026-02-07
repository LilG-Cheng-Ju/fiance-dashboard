import { inject, Injectable } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
  authState,
  User,
} from '@angular/fire/auth';
import { map, Observable } from 'rxjs';
import { UserProfile } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);

  // 1. Listen to authentication state (this is an Observable)
  // When Firebase detects sign-in/sign-out, it automatically emits signals here
  readonly user$: Observable<UserProfile | null> = authState(this.auth).pipe(
    map((user) => this._mapFirebaseUser(user)),
  );

  // 2. Google login logic
  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    try {
      // Use popup window to sign in (better for Desktop/Web)
      await signInWithPopup(this.auth, provider);
    } catch (error) {
      console.error('Google login failed', error);
      throw error;
    }
  }

  // 3. Email/password registration
  async registerWithEmail(email: string, pass: string, name: string): Promise<void> {
    try {
      // A. create user with email & password in Firebase Auth
      const credential = await createUserWithEmailAndPassword(this.auth, email, pass);

      // B. set display name (Firebase doesn't do this by default, so we need to call updateProfile)
      if (credential.user) {
        await updateProfile(credential.user, { displayName: name });
      }
    } catch (error) {
      console.error('Email registration failed', error);
      throw error;
    }
  }

  // 4. Email/password login
  async loginWithEmail(email: string, pass: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.auth, email, pass);
    } catch (error) {
      console.error('Email login failed', error);
      throw error;
    }
  }

  // 5. Sign out
  async logout(): Promise<void> {
    await signOut(this.auth);
  }

  // 6. Get ID Token (to send to backend)
  async getIdToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (user) {
      return user.getIdToken();
    }
    return null;
  }

  // Helper: Map Firebase's complex User object to our clean UserProfile
  private _mapFirebaseUser(user: User | null): UserProfile | null {
    if (!user) return null;
    return {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'User',
      photoURL: user.photoURL || '',
      isAnonymous: user.isAnonymous,
    };
  }
}
