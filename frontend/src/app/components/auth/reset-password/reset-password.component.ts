import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ValidationService } from '../../../services/validation.service';
import { passwordStrengthValidator } from '../../../validators/passwordStrengthen';
import { AuthService } from '../../../services/auth.service';
import { resetCodeExistsValidator } from '../../../validators/resetCodeExists';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css', '../../../styles/forms.css'],
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  resetToken!: string;
  email: string = '';
  static email: string;

  constructor(
    private fb: FormBuilder,
    public validationService: ValidationService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resetPasswordForm = this.fb.group({
      code: [
        '',
        {
          validators: [Validators.required, Validators.minLength(6)],
          asyncValidators: [],
          updateOn: 'blur',
        },
      ],
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          passwordStrengthValidator(),
        ],
      ],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['email']) {
        this.email = params['email'];
      }else{
        this.router.navigate(['/login']);
      }
    });
    
    this.validationService.init(this.resetPasswordForm);
    const codeControl = this.resetPasswordForm.get('code');
    codeControl?.setAsyncValidators(
      resetCodeExistsValidator(this.authService, this.email)
    );
  }

  onPasswordReset() {
    const formData = this.validationService.submit();
    if (!formData) return;

    this.authService
      .resetPassword(this.email, formData.code, formData.newPassword)
      .subscribe({
        next: () => {
          alert('Password reset successful');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          alert(err.error?.message || 'Error resetting password');
        },
      });
  }
}
