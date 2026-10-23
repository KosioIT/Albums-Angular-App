import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { emailExistsValidator } from '../../../validators/auth/emailExists';
import { Router, RouterModule } from '@angular/router';
import { ValidationMessageDirective } from '../../../directives/validation-message.directive';
import { FormHelperService } from '../../../services/form-helper.service';
import { CustomToastrService } from '../../../services/custom-toastr.service';

@Component({
  selector: 'app-forgotten-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, ValidationMessageDirective],
  templateUrl: './forgotten-password.component.html',
  styleUrls: [
    './forgotten-password.component.css',
    '../../../styles/forms.css',
  ],
})
export class ForgottenPasswordComponent implements OnInit {
  forgotForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastr: CustomToastrService,
    private router: Router,
    public formHelperService: FormHelperService,
  ) {}

  ngOnInit(): void {
    this.forgotForm = this.fb.group({
      email: [
        '',
        [Validators.required, Validators.email],
        [emailExistsValidator(this.authService, 'reset')],
      ],
    });

    this.formHelperService.init(this.forgotForm);
  }

  onSendResetCode(): void {
    const { email } = this.formHelperService.submit<{ email: string }>();

    this.authService.sendResetCodeViaEmail(email).subscribe({
      next: () => {
        this.toastr.showToast(
          'A reset code has been sent to your email!',
          'success',
          'Reset Code Sent!',
        );

        this.router.navigate(['/reset-password'], {
          queryParams: { email },
        });
      },
    });
  }
}
