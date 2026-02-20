import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore } from '../../core/store/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginComponent {
  readonly authStore = inject(AuthStore);
  private fb = inject(FormBuilder);

  // Toggle between Login and Register mode
  isLoginMode = true;

  // Form definition
  authForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    // Only used for registration
    displayName: [''],
  });

  // Getter for easy access in template
  get f() {
    return this.authForm.controls;
  }

  async onSubmit() {
    if (this.authForm.invalid) return;

    const { email, password, displayName } = this.authForm.value;

    if (this.isLoginMode) {
      await this.authStore.loginWithEmail(email!, password!);
    } else {
      // Basic validation for name
      if (!displayName) return;
      await this.authStore.register(email!, password!, displayName);
    }
  }

  onGoogleLogin() {
    this.authStore.loginWithGoogle();
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    // Reset form when switching modes to avoid validation errors
    this.authForm.reset();
  }
}
