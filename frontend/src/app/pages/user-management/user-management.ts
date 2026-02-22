import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserManagementStore } from '../../core/store/user-management.store';
import { UserRole } from '../../core/models/user.model';
import { AuthStore } from '../../core/store/auth.store';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  providers: [UserManagementStore], // Provide local store
  templateUrl: './user-management.html',
  styleUrls: ['./user-management.scss']
})
export class UserManagementComponent implements OnInit {
  readonly store = inject(UserManagementStore);
  readonly authStore = inject(AuthStore);
  private router = inject(Router);

  // Expose Enum to template
  UserRole = UserRole;
  roles = Object.values(UserRole);

  // Track which user is being edited
  editingUid = signal<string | null>(null);

  ngOnInit() {
    this.store.loadUsers();
  }

  onRefresh() {
    this.store.refresh();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.store.setSearchQuery(input.value);
  }

  startEdit(uid: string) {
    this.editingUid.set(uid);
  }

  cancelEdit() {
    this.editingUid.set(null);
  }

  saveRole(uid: string, selectElem: HTMLSelectElement) {
    const newRole = selectElem.value as UserRole;
    
    if (confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      this.store.updateUserRole({ uid, role: newRole });
    }
    this.editingUid.set(null);
  }

  onDeleteUser(uid: string, email: string) {
    const confirmed = confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`);
    
    if (confirmed) {
      this.store.deleteUser(uid);
    }
  }

  // Helper to prevent editing self or higher roles
  canEdit(targetUserRole: UserRole): boolean {
    const myRole = this.authStore.role();
    
    if (myRole === UserRole.OWNER) return true;
    if (myRole === UserRole.ADMIN) {
      // Admin cannot edit Owner or other Admins
      return targetUserRole !== UserRole.OWNER && targetUserRole !== UserRole.ADMIN;
    }
    return false;
  }

  isMe(uid: string): boolean {
    return this.authStore.user()?.uid === uid;
  }

  // ✨ Helper: Calculate User Status
  getUserStatus(lastLoginStr?: string, createdStr?: string): 'Active' | 'Inactive' | 'New' {
    if (!lastLoginStr) return 'New';
    
    const lastLogin = new Date(lastLoginStr).getTime();
    const created = new Date(createdStr!).getTime();
    const now = Date.now();
    const daysSinceLogin = (now - lastLogin) / (1000 * 60 * 60 * 24);
    const daysSinceCreated = (now - created) / (1000 * 60 * 60 * 24);

    if (daysSinceCreated < 7 && daysSinceLogin < 7) return 'New';
    if (daysSinceLogin > 30) return 'Inactive';
    return 'Active';
  }
}
