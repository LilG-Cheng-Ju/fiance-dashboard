import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalService } from '../../core/services/modal.service';
import { UserService } from '../../core/services/user.service';
import { AuthStore } from '../../core/store/auth.store';

@Component({
  selector: 'app-friend-code-prompt',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './friend-code-prompt.html',
  styleUrls: ['./friend-code-prompt.scss']
})
export class FriendCodePromptComponent {
  private modalService = inject(ModalService);
  private userService = inject(UserService);
  private authStore = inject(AuthStore);

  codeControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(8)]
  });

  isLoading = signal(false);
  errorMsg = signal<string | null>(null);
  isSuccess = signal(false);

  redeem() {
    if (this.codeControl.invalid) return;

    this.isLoading.set(true);
    this.errorMsg.set(null);

    this.userService.redeemFriendCode(this.codeControl.value).subscribe({
      next: (updatedUser) => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
        this.authStore.updateBackendUser(updatedUser);
        setTimeout(() => this.close(), 2000);
      },
      error: (err) => {
        this.errorMsg.set(err.error?.detail || '發生未知錯誤');
        this.isLoading.set(false);
      }
    });
  }

  skip() {
    // Mark that the user has seen the prompt so it won't show again
    this.userService.markPromptSeen().subscribe({
      next: (updatedUser) => {
        this.authStore.updateBackendUser(updatedUser);
        this.close();
      },
      error: (err) => {
        console.error('Failed to mark prompt as seen', err);
        this.close(); // Still close the modal even if API fails
      }
    });
  }

  private close() {
    this.modalService.close();
  }
}
