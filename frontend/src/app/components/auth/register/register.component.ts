
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { passwordStrengthValidator } from '../../../validators/auth/passwordStrengthen';
import { emailExistsValidator } from '../../../validators/auth/emailExists';
import { usernameExistsValidator } from '../../../validators/auth/usernameExists';
import { usernameMinLengthValidator } from '../../../validators/auth/usernameMinLength';
import { multiFieldMinLengthValidator } from '../../../validators/multiFieldLength';
import { ValidationMessageDirective } from '../../../directives/validation-message.directive';
import { FormHelperService } from '../../../services/form-helper.service';

@Component({
    selector: 'app-register',
    imports: [ReactiveFormsModule, RouterModule, ValidationMessageDirective],
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css', '../../../styles/forms.css']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public formHelperService: FormHelperService,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group(
      {
        username: [
          '',
          [Validators.required],
          [usernameExistsValidator(this.authService)], // async validator
        ],
        email: [
          '',
          [Validators.required, Validators.email],
          [emailExistsValidator(this.authService, 'register')], // async validator
        ],
        password: [
          '',
          [
            Validators.required,
            passwordStrengthValidator(),
          ], //sync validators
        ],
      },
      {
        validators: multiFieldMinLengthValidator({
          username: 3,
          password: 8,
        }),
      }
    );
  }

  ngOnInit(): void {
    this.formHelperService.init(this.registerForm);
  }

  submitRegisterForm(): void {
    const formData = this.formHelperService.submit<{ username: string; email: string; password: string }>();

    this.authService
      .register(formData.username, formData.email, formData.password)
      .subscribe({
        next: () => this.router.navigate(['/login']),
        error: (err) => alert(err.error?.message || 'Registration failed!'),
      });
  }
}
