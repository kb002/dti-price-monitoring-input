import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonText
} from '@ionic/angular/standalone';

import { ToastController } from '@ionic/angular';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, getDoc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonText
  ]
})
export class LoginPage {
  email = '';
  password = '';
  loading = false;
  showPassword = false;
  error = '';

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private toastCtrl: ToastController,
    private router: Router
  ) {}

  ionViewWillEnter() {
    // Clear form fields when entering the page
    this.email = '';
    this.password = '';
    this.error = '';
    this.showPassword = false;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  goToSignup() {
    this.router.navigate(['/signup']);
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }

  async login() {
    this.error = '';
    this.loading = true;

    const trimmedEmail = this.email.trim();
    const trimmedPassword = this.password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      this.loading = false;
      this.error = 'Please enter email and password';
      await this.showToast('Please enter email and password', 'warning');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        trimmedEmail,
        trimmedPassword
      );

      if (!userCredential.user.emailVerified) {
        this.loading = false;
        this.error = 'Please verify your email before logging in.';
        await this.showToast('Email not verified. Please check your inbox.', 'warning');
        await this.auth.signOut();
        return;
      }

      // Province lookup
      const provinces = ['cagayan', 'isabela', 'nueva_vizcaya', 'quirino'];
      let userProvince = '';
      let userDoc: any = null;

      for (const province of provinces) {
        const userRef = doc(
          this.firestore,
          `provinces/${province}/users/${userCredential.user.uid}`
        );
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          userProvince = province;
          userDoc = snap.data();
          break;
        }
      }

      if (!userProvince) {
        this.loading = false;
        this.error = 'Province information not found.';
        await this.showToast('Province not found', 'danger');
        await this.auth.signOut();
        return;
      }

      // Save login info
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', trimmedEmail);
      localStorage.setItem('userProvince', userProvince);
      localStorage.setItem('userId', userCredential.user.uid);

      // Navigate
      const routeMap: any = {
        cagayan: '/cagayan',
        isabela: '/isabela',
        nueva_vizcaya: '/nueva-vizcaya',
        quirino: '/quirino',
      };

      this.loading = false;
      await this.router.navigate([routeMap[userProvince]]);
      await this.showToast(`Welcome to ${this.formatProvinceName(userProvince)}!`, 'success');

    } catch (err: any) {
      this.loading = false;

      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        this.error = 'Invalid email or password';
        await this.showToast('Invalid credentials', 'danger');
      } else if (err.code === 'auth/too-many-requests') {
        this.error = 'Too many failed login attempts.';
        await this.showToast('Too many attempts. Try again later.', 'danger');
      } else {
        this.error = 'Login failed. Please try again.';
        await this.showToast('Login failed', 'danger');
      }
    }
  }


  private formatProvinceName(province: string): string {
    return province
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    toast.present();
  }
}