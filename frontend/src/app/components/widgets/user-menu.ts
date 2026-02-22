import { Component, computed, input, output, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserProfile } from '../../core/models/user.model';
import { ModalService } from '../../core/services/modal.service';
import { SettingsModalComponent } from '../modals/settings-modal';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/store/auth.store';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-menu.html',
  styleUrls: ['./user-menu.scss'],
})
export class UserMenuComponent {
  private modalService = inject(ModalService);
  private router = inject(Router);
  public authStore = inject(AuthStore); // Inject Store to check permissions

  user = input<UserProfile | null>(null);

  logout = output<void>();

  isOpen = signal(false);

  appVersion = environment.appVersion;

  displayVersion = computed(() => {
    return this.appVersion.split('-')[0];
  });

  versionLabel = computed(() => {
    const parts = this.appVersion.split('-');
    return parts.length > 1 ? parts[1] : null;
  });

  userInitial = computed(() => {
    const u = this.user();
    return u?.email?.charAt(0)?.toUpperCase() || 'U';
  });

  // Actions
  toggleMenu() {
    this.isOpen.update((v) => !v);
  }

  closeMenu() {
    this.isOpen.set(false);
  }

  onLogout() {
    this.logout.emit();
    this.closeMenu();
  }

  onSettings() {
    this.modalService.open(SettingsModalComponent);
    this.closeMenu();
  }

  onAdminPanel() {
    this.router.navigate(['/admin/users']);
    this.closeMenu();
  }
}
