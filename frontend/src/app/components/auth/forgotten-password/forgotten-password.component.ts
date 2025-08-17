import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { emailExistsValidator } from '../../../validators/emailExists';
import { Router } from '@angular/router';
import { CodeStatus } from '../../../models/codeStatus';
import { ValidationService } from '../../../services/validation.service';

@Component({
  selector: 'app-forgotten-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './forgotten-password.component.html',
  styleUrls: ['./forgotten-password.component.css', '../../../styles/forms.css'],
})
export class ForgottenPasswordComponent implements OnInit {
  forgotForm: FormGroup;
  fieldTouched: { [key: string]: boolean } = {};
  message = '';
  error = '';
  codeSent: boolean = false;
  codeStatus: CodeStatus = CodeStatus.sending;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    public validationService: ValidationService
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
    this.codeStatus = CodeStatus.initial;
    this.validationService.init(this.forgotForm);
  }

  onSendResetCode() {
    const formData = this.validationService.submit();
    if (!formData) return;

    this.codeStatus = CodeStatus.sending;
    this.message = '';
    this.error = '';

    this.authService
      .sendResetCodeViaEmail(this.forgotForm.value.email)
      .subscribe({
        next: () => {
          this.codeSent = true;
          this.codeStatus = CodeStatus.sent;
          this.router.navigate(['/reset-password'], {
            queryParams: { email: this.forgotForm.value.email },
          });
        },
        error: (err) => {
          alert(err.error?.message || 'Error sending reset code!');
          this.codeStatus = CodeStatus.failed;
        },
      });
  }
}
