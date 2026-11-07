import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { FormHelperService } from '../../../services/form-helper.service';
import { LoginDTO } from '../../../dto/login.dto';
import { CustomToastrService } from '../../../services/custom-toastr.service';
import { ValidationMessageDirective } from '../../../directives/validation-message.directive';
import { safeReturnUrl } from '../../../core/guards/auth.guards';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  imports: [ReactiveFormsModule, RouterModule, ValidationMessageDirective],
  styleUrls: ['./login.component.css', '../../../styles/forms.css'],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    public formHelperService: FormHelperService,
    private authService: AuthService,
    private customToastr: CustomToastrService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  ngOnInit() {
    this.formHelperService.init(this.loginForm);

    // Prefilled after a password reset request or a redirect from register
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) this.loginForm.patchValue({ email });
  }

  submitLoginForm() {
    if (this.submitting) return;
    const formData = this.formHelperService.submit<LoginDTO>();
    this.submitting = true;

    this.authService.login({ ...formData, email: formData.email.trim() }).subscribe({
      next: (user) => {
        this.customToastr.showToast(`Welcome back, ${user.username}!`, 'success', 'Signed in');
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(safeReturnUrl(returnUrl));
      },
      error: (err: Error) => {
        this.submitting = false;
        this.loginForm.get('password')?.reset('');
        this.customToastr.showToast(err.message, 'error', 'Sign in failed');
      },
    });
  }
}
