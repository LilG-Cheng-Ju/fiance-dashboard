import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../core/services/modal.service';

@Component({
  selector: 'app-modal-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-container.html',
  styleUrls: ['./modal-container.scss'],
})
export class ModalContainerComponent {
  modalService = inject(ModalService);

  close() {
    this.modalService.close();
  }
}
