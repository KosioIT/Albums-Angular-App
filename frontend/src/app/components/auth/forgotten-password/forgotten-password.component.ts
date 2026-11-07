import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ValidationMessageDirective } from '../../../directives/validation-message.directive';
import { FormHelperService } from '../../../services/form-helper.service';
import { CustomToastrService } from '../../../services/custom-toastr.service';

@Component({
  selector: 'app-forgotten-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, ValidationMessageDirective],
  templateUrl: './forgotten-password.component.html',
  styleUrls: ['./forgotten-password.component.css', '../../../styles/forms.css'],
})
export class ForgottenPasswordComponent implements OnInit {
  forgotForm!: FormGroup;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastr: CustomToastrService,
    private router: Router,
    public formHelperService: FormHelperService,
  ) {}

  // No "email not found" check: the backend answers the same either way, so nobody can probe which emails are registered
  ngOnInit(): void {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    this.formHelperService.init(this.forgotForm);
  }

  onSendResetCode(): void {
    if (this.submitting) return;
    const email = this.formHelperService.submit<{ email: string }>().email.trim();
    this.submitting = true;

    this.authService.requestResetCode(email).subscribe({
      next: () => {
        this.toastr.showToast(
          'If this email is registered, a 6-digit code is on its way. It is valid for 15 minutes.',
          'success',
          'Check your inbox',
        );
        this.router.navigate(['/reset-password'], { queryParams: { email } });
      },
      error: (err: Error) => {
        this.submitting = false;
        this.toastr.showToast(err.message, 'error', 'Could not send the code');
      },
    });
  }
}
