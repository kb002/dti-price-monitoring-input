import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonItem,
  IonLabel,
  IonBackButton,
  IonButtons,
  AlertController,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { Firestore, collection, addDoc, Timestamp } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

interface Product {
  id: string;
  name: string;
  prices: { [storeIndex: number]: number | null };
}

interface ProductCategory {
  id: string;
  name: string;
  products: Product[];
}

@Component({
  selector: 'app-add-nueva',
  templateUrl: './add-nueva.page.html',
  styleUrls: ['./add-nueva.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonItem,
    IonLabel,
    IonBackButton,
    IonButtons
  ]
})
export class AddNuevaPage implements OnInit {
  // Step 1: File Info
  fileName: string = '';
  commodity: string = '';
  customCommodity: string = '';
  month: string = '';
  week: string = '';

  // Step tracking
  currentStep: number = 1;

  // Store columns
  stores: string[] = ['Store 1', 'Store 2', 'Store 3'];

  // Product data based on commodity
  categories: ProductCategory[] = [];

  // Predefined products for each commodity type
  commodityTemplates: { [key: string]: ProductCategory[] } = {
    'bnpc': [
      {
        id: 'bottled-water',
        name: 'Bottled Water',
        products: [
          { id: 'wilkins', name: 'Wilkins', prices: {} }
        ]
      },
      {
        id: 'canned-goods',
        name: 'Canned Goods',
        products: [
          { id: 'sardines', name: 'Sardines', prices: {} }
        ]
      }
    ],
    'construction_materials': [
      {
        id: 'cement',
        name: 'Cement',
        products: [
          { id: 'portland', name: 'Portland Cement', prices: {} }
        ]
      },
      {
        id: 'steel',
        name: 'Steel',
        products: [
          { id: 'rebar', name: 'Rebar', prices: {} }
        ]
      }
    ],
    'flour': [
      {
        id: 'wheat-flour',
        name: 'Wheat Flour',
        products: [
          { id: 'all-purpose', name: 'All Purpose Flour', prices: {} }
        ]
      }
    ]
  };

  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];

  constructor(
    private router: Router,
    private firestore: Firestore,
    private auth: Auth,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Check authentication status on page load
    this.checkAuthStatus();
  }

  // Check if user is authenticated
  checkAuthStatus() {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.showToast('Please log in to continue', 'warning');
      this.router.navigate(['/login']);
    }
  }

  // Step 1: Submit file info
  async submitFileInfo() {
    if (!this.fileName.trim()) {
      this.showToast('Please enter a file name', 'warning');
      return;
    }

    if (!this.commodity) {
      this.showToast('Please select a commodity', 'warning');
      return;
    }

    if (this.commodity === 'others' && !this.customCommodity.trim()) {
      this.showToast('Please enter the commodity type', 'warning');
      return;
    }

    if (!this.month) {
      this.showToast('Please select a month', 'warning');
      return;
    }

    if (!this.week) {
      this.showToast('Please select a week', 'warning');
      return;
    }

    // Load template for selected commodity
    this.loadCommodityTemplate();
    this.currentStep = 2;
  }

  loadCommodityTemplate() {
    if (this.commodity === 'others') {
      // Create empty template for custom commodity
      this.categories = [
        {
          id: 'custom-category',
          name: 'Products',
          products: [
            { id: 'product-1', name: 'Product 1', prices: {} }
          ]
        }
      ];
    } else {
      // Load predefined template
      this.categories = JSON.parse(JSON.stringify(this.commodityTemplates[this.commodity]));
    }
  }

  // Add new store column
  addStore() {
    const storeNumber = this.stores.length + 1;
    this.stores.push(`Store ${storeNumber}`);
  }

  // Remove store column
  async removeStore(index: number) {
    if (this.stores.length <= 1) {
      this.showToast('You must have at least one store', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Remove Store',
      message: `Remove ${this.stores[index]}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: () => {
            this.stores.splice(index, 1);
            // Remove prices for this store from all products
            this.categories.forEach(cat => {
              cat.products.forEach(prod => {
                delete prod.prices[index];
                // Reindex remaining prices
                const newPrices: { [key: number]: number | null } = {};
                Object.keys(prod.prices).forEach(key => {
                  const numKey = parseInt(key);
                  if (numKey > index) {
                    newPrices[numKey - 1] = prod.prices[numKey];
                  } else {
                    newPrices[numKey] = prod.prices[numKey];
                  }
                });
                prod.prices = newPrices;
              });
            });
          }
        }
      ]
    });

    await alert.present();
  }

  // Add new product to category
  async addProduct(categoryIndex: number) {
    const alert = await this.alertController.create({
      header: 'Add Product',
      inputs: [
        {
          name: 'productName',
          type: 'text',
          placeholder: 'Enter product name'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (data) => {
            if (data.productName && data.productName.trim()) {
              const productId = `product-${Date.now()}`;
              this.categories[categoryIndex].products.push({
                id: productId,
                name: data.productName.trim(),
                prices: {}
              });
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Remove product from category
  async removeProduct(categoryIndex: number, productIndex: number) {
    const category = this.categories[categoryIndex];
    const product = category.products[productIndex];

    const alert = await this.alertController.create({
      header: 'Remove Product',
      message: `Remove "${product.name}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: () => {
            category.products.splice(productIndex, 1);
          }
        }
      ]
    });

    await alert.present();
  }

  // Add new category
  async addCategory() {
    const alert = await this.alertController.create({
      header: 'Add Category',
      inputs: [
        {
          name: 'categoryName',
          type: 'text',
          placeholder: 'Enter category name'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (data) => {
            if (data.categoryName && data.categoryName.trim()) {
              const categoryId = `category-${Date.now()}`;
              this.categories.push({
                id: categoryId,
                name: data.categoryName.trim(),
                products: [
                  { id: `product-${Date.now()}`, name: 'Product 1', prices: {} }
                ]
              });
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Update price
  updatePrice(product: Product, storeIndex: number, event: any) {
    const value = event.target.value;
    product.prices[storeIndex] = value ? parseFloat(value) : null;
  }

  // Go back to step 1
  backToFileInfo() {
    this.currentStep = 1;
  }

  // Validate that at least some prices are filled
  validatePrices(): boolean {
    let hasAtLeastOnePrice = false;
    
    for (const category of this.categories) {
      for (const product of category.products) {
        const prices = Object.values(product.prices);
        if (prices.some(price => price !== null && price !== undefined && price > 0)) {
          hasAtLeastOnePrice = true;
          break;
        }
      }
      if (hasAtLeastOnePrice) break;
    }
    
    return hasAtLeastOnePrice;
  }

  // Submit the entire form
  async submitForm() {
    // Validate that at least some prices are entered
    if (!this.validatePrices()) {
      this.showToast('Please enter at least one price before saving', 'warning');
      return;
    }

    // Check if user is still authenticated before saving
    const currentUser = this.auth.currentUser;
    console.log('Current user before save:', currentUser);
    console.log('LocalStorage userId:', localStorage.getItem('userId'));
    
    if (!currentUser) {
      this.showToast('Session expired. Please log in again.', 'warning');
      this.router.navigate(['/login']);
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Saving data...',
    });
    await loading.present();

    try {
      // Use Firebase Auth user data instead of localStorage
      const userId = currentUser.uid;
      const userEmail = currentUser.email || '';

      const fileData = {
        fileName: this.fileName.trim(),
        commodity: this.commodity === 'others' ? this.customCommodity.trim() : this.commodity,
        commodityDisplay: this.commodity === 'others' ? this.customCommodity.trim() : this.getCommodityDisplayName(this.commodity),
        month: this.month,
        week: this.week,
        stores: this.stores,
        categories: this.categories,
        uploadedBy: userId,
        uploadedByEmail: userEmail,
        uploadedAt: Timestamp.now(),
        province: 'nueva_vizcaya',
        lastModified: Timestamp.now()
      };

      // Save to Firestore - same path as nueva.page.ts reads from
      const filesRef = collection(this.firestore, 'provinces/nueva_vizcaya/files');
      const docRef = await addDoc(filesRef, fileData);

      console.log('File saved successfully, document ID:', docRef.id);
      
      await loading.dismiss();
      this.showToast('File saved successfully!', 'success');
      
      console.log('About to navigate to /nueva-vizcaya');
      
      // Navigate to Nueva Vizcaya page
      // Use navigateByUrl for a clean navigation
      await this.router.navigateByUrl('/nueva-vizcaya', { replaceUrl: true });
      
      console.log('Navigation completed');
    } catch (error) {
      await loading.dismiss();
      console.error('Error saving file:', error);
      this.showToast('Error saving file. Please try again.', 'danger');
    }
  }

  // Get display name for commodity
  getCommodityDisplayName(commodity: string): string {
    const displayNames: { [key: string]: string } = {
      'bnpc': 'BNPC (Basic Necessities and Prime Commodities)',
      'construction_materials': 'Construction Materials',
      'flour': 'Flour'
    };
    return displayNames[commodity] || commodity;
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}