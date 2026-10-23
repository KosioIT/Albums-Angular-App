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
import { RegisterDTO } from '../../../dto/register.dto';
import { CustomToastrService } from '../../../services/custom-toastr.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterModule, ValidationMessageDirective],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css', '../../../styles/forms.css'],
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public formHelperService: FormHelperService,
    private authService: AuthService,
    private router: Router,
    private customToastr: CustomToastrService,
  ) {
  }

  ngOnInit(): void {
    this.registerForm = this.fb.group(
      {
        username: [
          '',
          [Validators.required],
          [usernameExistsValidator(this.authService)],
        ],
        email: [
          '',
          [Validators.required, Validators.email],
          [emailExistsValidator(this.authService, 'register')],
        ],
        password: ['', [Validators.required, passwordStrengthValidator()]],
      },
      {
        validators: multiFieldMinLengthValidator({
          username: 3,
          password: 8,
        }),
      },
    );

    this.formHelperService.init(this.registerForm);
  }

  submitRegisterForm(): void {
    const formData = this.formHelperService.submit<RegisterDTO>();

    this.authService.register(formData).subscribe({
      next: () => {
        this.customToastr.showToast(
          'Registration successful! Logging you in...',
          'success',
          'Registration Complete',
        );
        this.router.navigate(['/']);
      },
    });
  }
}
