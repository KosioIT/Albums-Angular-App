import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ValidationService } from '../../../services/validation.service';
import { AuthService } from '../../../services/auth.service';
import { passwordStrengthValidator } from '../../../validators/passwordStrengthen';
import { emailExistsValidator } from '../../../validators/emailExists';
import { usernameExistsValidator } from '../../../validators/usernameExists';
import { usernameMinLengthValidator } from '../../../validators/usernameMinLength';
import { passwordMinLengthValidator } from '../../../validators/passwordMinLength';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css', '../../../styles/forms.css'],
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public validationService: ValidationService,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      username: [
        '',
        [Validators.required, usernameMinLengthValidator(3)],
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
          passwordMinLengthValidator(8),
          passwordStrengthValidator(),
        ], //sync validators
      ],
    });
  }

  ngOnInit(): void {
    this.validationService.init(this.registerForm);
  }

  submitRegisterForm(): void {
    const formData = this.validationService.submit();
    if (!formData) return;

    this.authService
      .register(formData.username, formData.email, formData.password)
      .subscribe({
        next: () => this.router.navigate(['/login']),
        error: (err) => alert(err.error?.message || 'Registration failed!'),
      });
  }
}
