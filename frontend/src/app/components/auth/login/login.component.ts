import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Router, RouterModule } from '@angular/router';

import { FormHelperService } from '../../../services/form-helper.service';
import { LoginDTO } from '../../../dto/login.dto';
import { CustomToastrService } from '../../../services/custom-toastr.service';


@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    imports: [ReactiveFormsModule, RouterModule],
    styleUrls: ['./login.component.css', '../../../styles/forms.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public formHelperService: FormHelperService,
    private authService: AuthService,
    private customToastr: CustomToastrService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  ngOnInit() {
    this.formHelperService.init(this.loginForm);
  }

  submitLoginForm() {
    const formData = this.formHelperService.submit<LoginDTO>();
    
    this.authService.login(formData).subscribe({
      next: () => {
        const username = this.authService.getUsername();
        this.customToastr.showToast(`Welcome, ${username}!`, 'success', 'Login successful');
        this.router.navigate(['/']);
      },
      error: (err) => {throw err},
    });
  }
}
