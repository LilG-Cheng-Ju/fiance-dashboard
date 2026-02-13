import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserMenuComponent } from './user-menu';
import { UserProfile } from '../../core/models/user.model';

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [CommonModule, UserMenuComponent],
  templateUrl: './mobile-nav.html',
  styleUrls: ['./mobile-nav.scss'],
})
export class MobileNavComponent {
  user = input<UserProfile | null>(null);

  logout = output<void>();
  // Event emitter for the FAB button
  readonly addAsset = output<void>();

  onAddClick() {
    this.addAsset.emit();
  }
}
