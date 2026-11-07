import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { passwordStrengthValidator } from '../../../validators/auth/passwordStrengthen';
import { AuthService } from '../../../services/auth.service';
import { ValidationMessageDirective } from '../../../directives/validation-message.directive';
import { FormHelperService } from '../../../services/form-helper.service';
import { CustomToastrService } from '../../../services/custom-toastr.service';

const RESEND_COOLDOWN_S = 60; // the backend ignores a new request for the same account within a minute

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterModule, ValidationMessageDirective],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css', '../../../styles/forms.css'],
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  resetPasswordForm: FormGroup;
  email = '';
  submitting = false;
  resendIn = RESEND_COOLDOWN_S; // a code was just sent from the previous page
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private fb: FormBuilder,
    public formHelperService: FormHelperService,
    private authService: AuthService,
    private customToastr: CustomToastrService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    /*
      The code is checked only on submit. Every check counts as one of the 5 attempts the backend
      allows per code, so validating it while typing would burn them.
    */
    this.resetPasswordForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      newPassword: ['', [Validators.required, Validators.maxLength(72), passwordStrengthValidator()]],
    });
  }

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email')?.trim() ?? '';
    if (!this.email) {
      this.router.navigate(['/forgot-password']);
      return;
    }

    this.formHelperService.init(this.resetPasswordForm);
    this.startCooldown();
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  // Keeps only digits, so pasting "123 456" from the email works
  onCodeInput(): void {
    const control = this.resetPasswordForm.get('code');
    const digits = String(control?.value ?? '').replace(/\D/g, '').slice(0, 6);
    if (control && control.value !== digits) control.setValue(digits);
  }

  resendCode(): void {
    if (this.resendIn > 0) return;

    this.authService.requestResetCode(this.email).subscribe({
      next: () => {
        this.customToastr.showToast('A new code has been sent if the email is registered.', 'info', 'Code sent');
        this.resetPasswordForm.get('code')?.reset('');
        this.startCooldown();
      },
      error: (err: Error) => this.customToastr.showToast(err.message, 'error', 'Could not send the code'),
    });
  }

  onPasswordReset(): void {
    if (this.submitting) return;
    const { code, newPassword } = this.formHelperService.submit<{ code: string; newPassword: string }>();
    this.submitting = true;

    this.authService.resetPassword(this.email, code, newPassword).subscribe({
      next: (user) => {
        this.customToastr.showToast(
          `Your password has been changed and you are signed in, ${user.username}. Other devices were signed out.`,
          'success',
          'Password reset',
        );
        this.router.navigate(['/']);
      },
      error: (err: Error) => {
        this.submitting = false;
        this.resetPasswordForm.get('code')?.reset('');
        this.customToastr.showToast(err.message, 'error', 'Reset failed');
      },
    });
  }

  private startCooldown(): void {
    clearInterval(this.timer);
    this.resendIn = RESEND_COOLDOWN_S;
    this.timer = setInterval(() => {
      this.resendIn--;
      if (this.resendIn <= 0) clearInterval(this.timer);
    }, 1000);
  }
}
