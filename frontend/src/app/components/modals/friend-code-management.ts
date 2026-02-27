import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ModalService } from '../../core/services/modal.service';
import { FriendCodeAdminStore } from '../../core/store/friend-code-admin.store';

@Component({
  selector: 'app-friend-code-management-modal',
  standalone: true,
  imports: [CommonModule, DatePipe],
  providers: [FriendCodeAdminStore], // Provide a local instance of the store
  templateUrl: './friend-code-management.html',
  styleUrls: ['./friend-code-management.scss']
})
export class FriendCodeManagementModalComponent implements OnInit {
  readonly store = inject(FriendCodeAdminStore);
  private modalService = inject(ModalService);

  copiedCode = signal<string | null>(null);

  ngOnInit() {
    this.store.loadCodes();
  }

  createCodes() {
    this.store.addCodes(1);
  }

  copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.copiedCode.set(code);
      setTimeout(() => this.copiedCode.set(null), 2000);
    });
  }

  close() {
    this.modalService.close();
  }
}