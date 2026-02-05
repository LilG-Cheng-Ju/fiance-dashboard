import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mobile-nav.html',
  styleUrls: ['./mobile-nav.scss'],
})
export class MobileNavComponent {
  // Event emitter for the FAB button
  readonly addAsset = output<void>();

  onAddClick() {
    this.addAsset.emit();
  }
}
