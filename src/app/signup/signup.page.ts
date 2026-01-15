import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Import standalone Ionic components
import { 
  IonContent, 
  IonItem, 
  IonInput, 
  IonSelect, 
  IonSelectOption, 
  IonButton, 
  IonIcon, 
  IonText 
} from '@ionic/angular/standalone';

import { Auth, createUserWithEmailAndPassword, sendEmailVerification } from '@angular/fire/auth';
import { Firestore, doc, setDoc, serverTimestamp, getDoc, collection, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonText
  ]
})
export class SignupPage {

  province: string = '';
  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  loading: boolean = false;

  error: string = '';
  success: string = '';

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {}

  ionViewWillEnter() {
    // Clear form fields when entering the page
    this.province = '';
    this.email = '';
    this.password = '';
    this.error = '';
    this.success = '';
    this.showPassword = false;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  async signup() {
    this.error = '';
    this.success = '';

    if (!this.province || !this.email || !this.password) {
      this.error = 'Please fill all fields';
      return;
    }

    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return;
    }

    this.loading = true;

    try {
      // Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        this.email,
        this.password
      );

      // Send email verification
      await sendEmailVerification(userCredential.user);

      // Check if province document exists, create if not
      const provinceRef = doc(this.firestore, 'provinces', this.province);
      const provinceSnap = await getDoc(provinceRef);

      if (!provinceSnap.exists()) {
        // Initialize province document
        await setDoc(provinceRef, {
          name: this.province,
          createdAt: serverTimestamp(),
          userCount: 1
        });
      } else {
        // Get current user count from users subcollection
        const usersRef = collection(this.firestore, `provinces/${this.province}/users`);
        const usersSnap = await getDocs(usersRef);
        const userCount = usersSnap.size + 1;

        // Update user count
        await setDoc(provinceRef, {
          userCount: userCount
        }, { merge: true });
      }

      // Create user document under the province subcollection
      const userRef = doc(
        this.firestore, 
        `provinces/${this.province}/users/${userCredential.user.uid}`
      );
      
      await setDoc(userRef, {
        uid: userCredential.user.uid,
        email: this.email,
        province: this.province,
        emailVerified: false,
        createdAt: serverTimestamp()
      });

      this.success = 'Account created! Please check your email to verify your account before logging in.';

      // Redirect to login after 3 seconds
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);

    } catch (err: any) {
      console.error('Signup error:', err);
      
      // Handle specific error codes
      if (err.code === 'auth/email-already-in-use') {
        this.error = 'This email is already registered';
      } else if (err.code === 'auth/invalid-email') {
        this.error = 'Invalid email format';
      } else if (err.code === 'auth/weak-password') {
        this.error = 'Password is too weak';
      } else {
        this.error = err.message || 'An error occurred during signup';
      }
    } finally {
      this.loading = false;
    }
  }
}