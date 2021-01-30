import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

export interface ILogin {
  email: string;
}

export interface IProfile {
  email?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = false;
  private email: string | undefined = '';
  public getProfile(): IProfile {
    return {
      email: this.email
    }
  }
  constructor(
    private router: Router
  ) {
    const existedAuth = localStorage.getItem('auth');
    if (existedAuth && existedAuth !== null) {
      console.log('Existed Auth ', existedAuth);
      try {
        this.login(JSON.parse(existedAuth));
      } catch (error) {
        this.logout();
      }
    }
  }

  isAuthenticated() {
    return this.auth;
  }

  login({ email }: ILogin) {
    if (email === null || email === undefined || email === '') {
      console.log('Invalid email, can not login.');
      return;
    }
    console.log('%cLogin successfully!', 'color: green; font-size: 20px;');
    this.auth = true;
    this.email = email;
    localStorage.setItem('auth', JSON.stringify(this.getProfile()));
    this.router.navigate(['']);
  }
  logout() {
    this.auth = false;
    this.email = undefined;
    localStorage.removeItem('auth');
    location.reload();
  }
}
