import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonText
} from '@ionic/angular/standalone';

import { ToastController } from '@ionic/angular';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonText
  ]
})
export class ForgotPasswordPage {
  email = '';
  loading = false;
  error = '';
  success = '';

  constructor(
    private auth: Auth,
    private toastCtrl: ToastController,
    private router: Router
  ) {}

  goToLogin() {
    this.router.navigate(['/login']);
  }

  async sendPasswordReset() {
    this.error = '';
    this.success = '';

    const trimmedEmail = this.email.trim();

    if (!trimmedEmail) {
      this.error = 'Please enter your email address';
      return this.showToast('Please enter your email', 'warning');
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      this.error = 'Please enter a valid email address';
      return this.showToast('Invalid email format', 'warning');
    }

    this.loading = true;

    try {
      await sendPasswordResetEmail(this.auth, trimmedEmail);
      
      this.success = 'Password reset link sent! Please check your email.';
      await this.showToast('Password reset link sent to your email', 'success');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);

    } catch (err: any) {
      console.error('Password reset error:', err);

      if (err.code === 'auth/user-not-found') {
        this.error = 'No account found with this email address';
        await this.showToast('Email not found', 'danger');
      } else if (err.code === 'auth/invalid-email') {
        this.error = 'Invalid email address';
        await this.showToast('Invalid email', 'danger');
      } else if (err.code === 'auth/too-many-requests') {
        this.error = 'Too many requests. Please try again later.';
        await this.showToast('Too many attempts', 'danger');
      } else {
        this.error = 'An error occurred. Please try again.';
        await this.showToast('Failed to send reset link', 'danger');
      }
    } finally {
      this.loading = false;
    }
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