import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  Form,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ValidationService } from '../../../services/validation.service';
import { passwordStrengthValidator } from '../../../validators/auth/passwordStrengthen';
import { AuthService } from '../../../services/auth.service';
import { resetCodeExistsValidator } from '../../../validators/auth/resetCodeExists';
import { ActivatedRoute, Router } from '@angular/router';
import { ValidationMessageDirective } from '../../../directives/validation-message.directive';
import { FormHelperService } from '../../../services/form-helper.service';

@Component({
    selector: 'app-reset-password',
    imports: [ReactiveFormsModule, CommonModule, ValidationMessageDirective],
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.css', '../../../styles/forms.css']
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  resetToken!: string;
  email: string = '';
  static email: string;

  constructor(
    private fb: FormBuilder,
    public formHelperService: FormHelperService,
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
    
    this.formHelperService.init(this.resetPasswordForm);
    const codeControl = this.resetPasswordForm.get('code');
    codeControl?.setAsyncValidators(
      resetCodeExistsValidator(this.authService, this.email)
    );
  }

  onPasswordReset() {
    const formData = this.formHelperService.submit<{ code: string; newPassword: string }>();
    
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
