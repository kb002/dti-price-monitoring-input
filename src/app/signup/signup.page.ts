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

interface Establishment {
  name: string;
  category: string;
  categoryId: string;
}

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
  userRole: string = '';
  establishmentName: string = '';
  customEstablishmentName: string = '';
  storeCategory: string = '';
  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  loading: boolean = false;
  loadingStores: boolean = false;

  error: string = '';
  success: string = '';
  
  availableEstablishments: Establishment[] = [];

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {}

  ionViewWillEnter() {
    // Clear form fields when entering the page
    this.province = '';
    this.userRole = '';
    this.establishmentName = '';
    this.customEstablishmentName = '';
    this.storeCategory = '';
    this.email = '';
    this.password = '';
    this.error = '';
    this.success = '';
    this.showPassword = false;
    this.availableEstablishments = [];
    this.loadingStores = false;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  async onProvinceChange() {
    // Reset role-dependent fields when province changes
    this.userRole = '';
    this.establishmentName = '';
    this.customEstablishmentName = '';
    this.storeCategory = '';
    this.availableEstablishments = [];
    this.error = '';

    if (this.province) {
      await this.loadEstablishments();
    }
  }

  async onRoleChange() {
    // Reset establishment fields when role changes
    this.establishmentName = '';
    this.customEstablishmentName = '';
    this.storeCategory = '';
    this.error = '';

    // Don't reload if already loaded
    if (this.userRole === 'business_owner' && this.province && this.availableEstablishments.length === 0) {
      await this.loadEstablishments();
    }
  }

  onEstablishmentChange() {
    // Reset custom establishment name and category if not "others"
    if (this.establishmentName !== 'others') {
      this.customEstablishmentName = '';
      this.storeCategory = '';
    }
  }

  async loadEstablishments() {
    if (!this.province || this.loadingStores) return;

    this.loadingStores = true;
    
    try {
      const normalizedProvince = this.province.toLowerCase().trim();
      this.availableEstablishments = [];
      
      console.log('=== STARTING LOAD ESTABLISHMENTS ===');
      console.log('Province:', normalizedProvince);
      
      // Get all store categories (documents under stores collection)
      const storesRef = collection(this.firestore, `provinces/${normalizedProvince}/stores`);
      const categoriesSnap = await getDocs(storesRef);
      
      console.log('Number of category documents found:', categoriesSnap.size);
      
      if (categoriesSnap.empty) {
        console.log('No categories found!');
        this.error = 'No store categories found for this province';
        return;
      }
      
      // Loop through each category document
      for (const categoryDoc of categoriesSnap.docs) {
        const categoryData = categoryDoc.data();
        const categoryName = categoryData['name'] || categoryDoc.id;
        const categoryId = categoryDoc.id;
        
        console.log('Processing category:', categoryName);
        
        // Get store names subcollection
        const storeNamesRef = collection(
          this.firestore, 
          `provinces/${normalizedProvince}/stores/${categoryId}/store names`
        );
        const storeNamesSnap = await getDocs(storeNamesRef);
        
        console.log(`Found ${storeNamesSnap.size} stores in ${categoryName}`);
        
        storeNamesSnap.forEach((storeDoc) => {
          const storeName = storeDoc.id;
          
          // Check if store already exists before adding (prevent duplicates)
          const exists = this.availableEstablishments.some(est => est.name === storeName);
          
          if (!exists) {
            this.availableEstablishments.push({
              name: storeName,
              category: categoryName,
              categoryId: categoryId
            });
            console.log('Added store:', storeName);
          } else {
            console.log('Skipped duplicate store:', storeName);
          }
        });
      }

      // Sort alphabetically by name
      this.availableEstablishments.sort((a, b) => a.name.localeCompare(b.name));

      console.log('=== FINAL RESULTS ===');
      console.log('Total establishments loaded:', this.availableEstablishments.length);
      
      if (this.availableEstablishments.length === 0) {
        this.error = 'No stores found. Please contact admin.';
      }
      
    } catch (err) {
      console.error('=== ERROR LOADING STORES ===');
      console.error('Error details:', err);
      this.error = 'Error loading stores. Please try again.';
    } finally {
      this.loadingStores = false;
    }
  }

  async signup() {
    this.error = '';
    this.success = '';

    // Validation
    if (!this.province || !this.userRole || !this.email || !this.password) {
      this.error = 'Please fill all required fields';
      return;
    }

    if (!this.province.trim()) {
      this.error = 'Please select a province';
      return;
    }

    if (!this.userRole.trim()) {
      this.error = 'Please select a role';
      return;
    }

    // Additional validation for business owners
    if (this.userRole === 'business_owner') {
      if (!this.establishmentName) {
        this.error = 'Please select an establishment';
        return;
      }
      
      if (this.establishmentName === 'others') {
        if (!this.customEstablishmentName.trim()) {
          this.error = 'Please enter your establishment name';
          return;
        }
        if (!this.storeCategory) {
          this.error = 'Please select a store category';
          return;
        }
      }
    }

    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return;
    }

    this.loading = true;

    try {
      // Normalize province value for consistency
      const normalizedProvince = this.province.toLowerCase().trim();

      // Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        this.email,
        this.password
      );

      // Send email verification
      await sendEmailVerification(userCredential.user);

      // Check if province document exists, create if not
      const provinceRef = doc(this.firestore, 'provinces', normalizedProvince);
      const provinceSnap = await getDoc(provinceRef);

      if (!provinceSnap.exists()) {
        // Initialize province document
        await setDoc(provinceRef, {
          name: normalizedProvince,
          createdAt: serverTimestamp(),
          userCount: 1
        });
      } else {
        // Get current user count from users subcollection
        const usersRef = collection(this.firestore, `provinces/${normalizedProvince}/users`);
        const usersSnap = await getDocs(usersRef);
        const userCount = usersSnap.size + 1;

        // Update user count
        await setDoc(provinceRef, {
          userCount: userCount
        }, { merge: true });
      }

      // Determine the final establishment name, category, and categoryId
      let finalEstablishmentName = '';
      let finalCategory = '';
      let finalCategoryId = '';
      
      if (this.userRole === 'business_owner') {
        if (this.establishmentName === 'others') {
          finalEstablishmentName = this.customEstablishmentName.trim();
          finalCategory = this.storeCategory;
          
          // Find the category document ID that matches the selected category name
          const storesRef = collection(this.firestore, `provinces/${normalizedProvince}/stores`);
          const categoriesSnap = await getDocs(storesRef);
          
          for (const categoryDoc of categoriesSnap.docs) {
            const categoryData = categoryDoc.data();
            const categoryName = categoryData['name'] || categoryDoc.id;
            
            if (categoryName === this.storeCategory) {
              finalCategoryId = categoryDoc.id;
              break;
            }
          }
          
          // If category doesn't exist, create it
          if (!finalCategoryId) {
            const newCategoryRef = doc(collection(this.firestore, `provinces/${normalizedProvince}/stores`));
            await setDoc(newCategoryRef, {
              name: this.storeCategory,
              createdAt: serverTimestamp()
            });
            finalCategoryId = newCategoryRef.id;
          }

          // Add the custom establishment to the store names subcollection
          const storeRef = doc(
            this.firestore, 
            `provinces/${normalizedProvince}/stores/${finalCategoryId}/store names/${this.customEstablishmentName.trim()}`
          );
          await setDoc(storeRef, {
            createdAt: serverTimestamp(),
            createdBy: userCredential.user.uid
          });
          
        } else {
          finalEstablishmentName = this.establishmentName;
          // Find the category and categoryId of the selected establishment
          const selectedEstablishment = this.availableEstablishments.find(
            est => est.name === this.establishmentName
          );
          finalCategory = selectedEstablishment?.category || '';
          finalCategoryId = selectedEstablishment?.categoryId || '';
        }
      }

      // Create user document under the province subcollection
      const userRef = doc(
        this.firestore, 
        `provinces/${normalizedProvince}/users/${userCredential.user.uid}`
      );
      
      const userData: any = {
        uid: userCredential.user.uid,
        email: this.email,
        province: normalizedProvince,
        userRole: this.userRole,
        emailVerified: false,
        createdAt: serverTimestamp()
      };

      // Add establishment information for business owners
      if (this.userRole === 'business_owner') {
        userData.establishmentName = finalEstablishmentName;
        userData.storeCategory = finalCategory;
        userData.storeCategoryId = finalCategoryId;
      }

      await setDoc(userRef, userData);

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