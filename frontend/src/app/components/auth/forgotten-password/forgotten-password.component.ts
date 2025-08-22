
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { emailExistsValidator } from '../../../validators/auth/emailExists';
import { Router } from '@angular/router';
import { ValidationMessageDirective } from '../../../directives/validation-message.directive';
import { FormHelperService } from '../../../services/form-helper.service';

@Component({
    selector: 'app-forgotten-password',
    imports: [ReactiveFormsModule, ValidationMessageDirective],
    templateUrl: './forgotten-password.component.html',
    styleUrls: ['./forgotten-password.component.css', '../../../styles/forms.css']
})
export class ForgottenPasswordComponent implements OnInit {
  forgotForm: FormGroup;
  fieldTouched: { [key: string]: boolean } = {};
  message = '';
  error = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    public formHelperService: FormHelperService
  ) {
    this.forgotForm = this.fb.group({
      email: [
        '',
        [Validators.required, Validators.email],
        [emailExistsValidator(this.authService, 'reset')], // async validator
      ],
    });
  }

  ngOnInit(): void {
    this.formHelperService.init(this.forgotForm);
  }

  onSendResetCode() {
    const formData = this.formHelperService.submit<{ email: string }>();
    this.message = '';
    this.error = '';

    this.authService
      .sendResetCodeViaEmail(formData.email)
      .subscribe({
        next: () => {
          this.router.navigate(['/reset-password'], {
            queryParams: { email: formData.email },
          });
        },
        error: (err) => {
          alert(err.error?.message || 'Error sending reset code!');
        },
      });
  }
}
