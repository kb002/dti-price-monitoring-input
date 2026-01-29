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
      console.log('🔐 Attempting login for:', trimmedEmail);
      
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        trimmedEmail,
        trimmedPassword
      );

      console.log('✅ Firebase auth successful, UID:', userCredential.user.uid);
      console.log('📧 Email verified:', userCredential.user.emailVerified);

      // Check if user is admin first
      const adminRef = doc(this.firestore, `admin/${userCredential.user.uid}`);
      console.log('Checking admin collection...');
      const adminSnap = await getDoc(adminRef);
      
      let isAdmin = false;
      let userProvince = '';
      let userDoc: any = null;
      let userRole = '';
      let establishmentName = '';

      if (adminSnap.exists()) {
        // User is an admin
        console.log('User found in admin collection!');
        isAdmin = true;
        userDoc = adminSnap.data();
        userProvince = 'admin';
        userRole = 'admin';
        console.log('Admin data:', userDoc);
      } else {
        console.log('❌ Not in admin collection, checking provinces...');
        // Province lookup for regular users
        const provinces = ['cagayan', 'isabela', 'nueva_vizcaya', 'quirino', 'batanes'];

        for (const province of provinces) {
          const userRef = doc(
            this.firestore,
            `provinces/${province}/users/${userCredential.user.uid}`
          );
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            userProvince = province;
            userDoc = snap.data();
            userRole = userDoc?.userRole || userDoc?.role || '';
            establishmentName = userDoc?.establishmentName || '';
            isAdmin = userDoc?.role === 'admin';
            console.log(`User found in ${province}`);
            console.log('User role:', userRole);
            console.log('Establishment:', establishmentName);
            break;
          }
        }

        if (!userProvince) {
          console.log('User not found in any province');
          this.loading = false;
          this.error = 'User information not found.';
          await this.showToast('User not found', 'danger');
          await this.auth.signOut();
          return;
        }
      }

      console.log('Final check - isAdmin:', isAdmin, 'emailVerified:', userCredential.user.emailVerified);

      // Email verification check - skip for admins
      if (!isAdmin && !userCredential.user.emailVerified) {
        console.log('Non-admin user with unverified email, blocking login');
        this.loading = false;
        this.error = 'Please verify your email before logging in.';
        await this.showToast('Email not verified. Please check your inbox.', 'warning');
        await this.auth.signOut();
        return;
      }

      console.log('Verification check passed!');

      // Save login info
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', trimmedEmail);
      localStorage.setItem('userProvince', userProvince);
      localStorage.setItem('userId', userCredential.user.uid);
      localStorage.setItem('userRole', userRole);
      
      // Save establishment name if business owner
      if (userRole === 'business_owner' && establishmentName) {
        localStorage.setItem('establishmentName', establishmentName);
      }

      // Navigate based on role and province
      let targetRoute = '';

      if (userProvince === 'admin') {
        targetRoute = '/admin';
      } else {
        // Route map for monitoring personnel
        const monitoringRoutes: any = {
          cagayan: '/cagayan',
          isabela: '/isabela',
          nueva_vizcaya: '/nueva',
          quirino: '/quirino',
          batanes: '/batanes',
        };

        // Route map for business owners
        const businessRoutes: any = {
          cagayan: '/cagayan-business',
          isabela: '/isabela-business',
          nueva_vizcaya: '/nueva-business',
          quirino: '/quirino-business',
          batanes: '/batanes-business',
        };

        if (userRole === 'business_owner') {
          targetRoute = businessRoutes[userProvince];
        } else if (userRole === 'price_monitoring') {
          targetRoute = monitoringRoutes[userProvince];
        } else {
          // Fallback for old accounts without userRole
          targetRoute = monitoringRoutes[userProvince];
        }
      }

      this.loading = false;
      console.log('Navigating to:', targetRoute);
      
      if (targetRoute) {
        await this.router.navigate([targetRoute]);
        
        let welcomeMessage = '';
        if (userProvince === 'admin') {
          welcomeMessage = 'Welcome Admin!';
        } else if (userRole === 'business_owner') {
          welcomeMessage = `Welcome ${establishmentName}!`;
        } else {
          welcomeMessage = `Welcome to ${this.formatProvinceName(userProvince)}!`;
        }
        
        await this.showToast(welcomeMessage, 'success');
      } else {
        console.error('No route found for province:', userProvince, 'role:', userRole);
        this.error = 'Navigation error. Please contact support.';
        await this.showToast('Navigation error', 'danger');
        await this.auth.signOut();
      }

    } catch (err: any) {
      console.error('Login error:', err);
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
        console.error('Full error:', err);
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