import { Component, computed, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserProfile } from '../../core/models/user.model';
import { ModalService } from '../../core/services/modal.service';
import { SettingsModalComponent } from '../modals/settings-modal';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-menu.html',
  styleUrls: ['./user-menu.scss'],
})
export class UserMenuComponent {
  private modalService = inject(ModalService);

  user = input<UserProfile | null>(null);

  logout = output<void>();

  isOpen = signal(false);

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
}
