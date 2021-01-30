import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  form: FormGroup;
  constructor(
    fb: FormBuilder,
    private authService: AuthService
  ) {
    this.form = fb.group({
      email: fb.control('', [Validators.required, Validators.email])
    });
  }

  ngOnInit(): void {
  }

  submit() {
    console.log(this.form.value);
    if (this.form.valid) {
      this.authService.login(this.form.value);
    }
  }

  hasEmailError() {
    return this.form.controls.email.invalid;
  }

  getEmailErrorMsg() {
    const errors = this.form.controls.email.errors;
    console.log(errors);
    if (errors === null) {
      return '';
    }
    if (errors['required']) {
      return 'This field is required.';
    }
    if (errors['email']) {
      return 'Invalid Email.';
    }
    return Object.keys(errors).map(msg => msg.toUpperCase()).join(' - ');
  }

  isDisabled() {
    return !this.form.valid;
  }

}
