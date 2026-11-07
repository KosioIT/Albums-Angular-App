import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { passwordStrengthValidator } from '../../../validators/auth/passwordStrengthen';
import { ValidationMessageDirective } from '../../../directives/validation-message.directive';
import { FormHelperService } from '../../../services/form-helper.service';
import { RegisterDTO } from '../../../dto/register.dto';
import { CustomToastrService } from '../../../services/custom-toastr.service';
import { ApiError } from '../../../errors/api-errors/normalizeApiError';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterModule, ValidationMessageDirective],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css', '../../../styles/forms.css'],
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    public formHelperService: FormHelperService,
    private authService: AuthService,
    private router: Router,
    private customToastr: CustomToastrService,
  ) {}

  /*
    Limits match the backend validators. Whether the username or email is taken is checked by the
    server on submit (409), because the lookup endpoints are admin-only.
  */
  ngOnInit(): void {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.maxLength(72), passwordStrengthValidator()]],
    });

    this.formHelperService.init(this.registerForm);
  }

  submitRegisterForm(): void {
    if (this.submitting) return;
    const formData = this.formHelperService.submit<RegisterDTO>();
    this.submitting = true;

    const dto: RegisterDTO = {
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password,
    };

    this.authService.register(dto).subscribe({
      next: (user) => {
        this.customToastr.showToast(`Welcome, ${user.username}!`, 'success', 'Account created');
        this.router.navigate(['/']);
      },
      error: (err: Error) => {
        this.submitting = false;

        // "Username/Email already exists" goes under the field itself
        if (err instanceof ApiError && err.status === 409 && err.field) {
          const control = this.registerForm.get(err.field);
          control?.setErrors({ [`${err.field}Exists`]: true });
          control?.markAsTouched();
          return;
        }
        this.customToastr.showToast(err.message, 'error', 'Registration failed');
      },
    });
  }
}
