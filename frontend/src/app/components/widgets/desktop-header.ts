import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserMenuComponent } from './user-menu';
import { UserProfile } from '../../core/models/user.model';

@Component({
  selector: 'app-desktop-header',
  standalone: true,
  imports: [CommonModule, UserMenuComponent],
  templateUrl: './desktop-header.html',
  styleUrls: ['./desktop-header.scss'],
})
export class DesktopHeaderComponent {
  user = input<UserProfile | null>(null);

  readonly addAsset = output<void>();
  logout = output<void>();
  settings = output<void>();

  onAddClick() {
    this.addAsset.emit();
  }
}
