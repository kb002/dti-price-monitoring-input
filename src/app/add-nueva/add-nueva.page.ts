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
import { 
  Firestore, 
  collection, 
  addDoc, 
  doc, 
  getDoc,
  getDocs,
  setDoc,
  Timestamp 
} from '@angular/fire/firestore';
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

interface CommodityTemplate {
  id: string;
  name: string;
  displayName: string;
  categories: ProductCategory[];
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

  // Province identifier
  province: string = 'nueva_vizcaya';

  // Dynamic data from database
  stores: string[] = [];
  commodities: CommodityTemplate[] = [];
  categories: ProductCategory[] = [];

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

  async ngOnInit() {
    this.checkAuthStatus();
    await this.loadProvinceData();
  }

  checkAuthStatus() {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.showToast('Please log in to continue', 'warning');
      this.router.navigate(['/login']);
    }
  }

  // Load province data from nested structure
  async loadProvinceData() {
    const loading = await this.loadingController.create({
      message: 'Loading data...',
    });
    await loading.present();

    try {
      // Load stores from stores subcollection
      await this.loadStores();
      
      // Load commodities
      await this.loadCommodities();
      
      console.log('Loaded stores:', this.stores);
      console.log('Loaded commodities:', this.commodities);
      
    } catch (error) {
      console.error('Error loading province data:', error);
      this.showToast('Error loading data: ' + error, 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // Load stores from stores subcollection
  async loadStores() {
    try {
      const storesRef = collection(this.firestore, `provinces/${this.province}/stores`);
      const storesSnap = await getDocs(storesRef);
      
      this.stores = [];
      
      storesSnap.forEach((storeDoc) => {
        const storeData = storeDoc.data();
        this.stores.push(storeData['name'] || storeDoc.id);
      });
      
      // If no stores found, you might want to create default ones
      if (this.stores.length === 0) {
        console.warn('No stores found in database. Please add stores manually in Firestore.');
        this.showToast('No stores found. Please add stores in Firestore.', 'warning');
      }
      
      console.log('Stores loaded:', this.stores);
    } catch (error) {
      console.error('Error loading stores:', error);
      throw error;
    }
  }

  // Load commodities from subcollection
  async loadCommodities() {
    try {
      const commoditiesRef = collection(this.firestore, `provinces/${this.province}/commodities`);
      const commoditiesSnap = await getDocs(commoditiesRef);
      
      this.commodities = [];
      
      for (const commodityDoc of commoditiesSnap.docs) {
        const commodityData = commodityDoc.data();
        const commodityId = commodityDoc.id;
        
        // Load categories for this commodity
        const categories = await this.loadCategories(commodityId);
        
        this.commodities.push({
          id: commodityId,
          name: commodityData['name'] || commodityId,
          displayName: commodityData['displayName'] || commodityId,
          categories: categories
        });
      }
      
      // If no commodities found
      if (this.commodities.length === 0) {
        console.warn('No commodities found in database. Please add commodities manually in Firestore.');
        this.showToast('No commodities found. Please add commodities in Firestore.', 'warning');
      }
      
      console.log('Commodities loaded:', this.commodities);
    } catch (error) {
      console.error('Error loading commodities:', error);
      throw error;
    }
  }

  // Load categories for a commodity
  async loadCategories(commodityId: string): Promise<ProductCategory[]> {
    try {
      const categoriesRef = collection(this.firestore, `provinces/${this.province}/commodities/${commodityId}/categories`);
      const categoriesSnap = await getDocs(categoriesRef);
      
      const categories: ProductCategory[] = [];
      
      for (const categoryDoc of categoriesSnap.docs) {
        const categoryData = categoryDoc.data();
        const categoryId = categoryDoc.id;
        
        // Load products for this category
        const products = await this.loadProducts(commodityId, categoryId);
        
        categories.push({
          id: categoryId,
          name: categoryData['name'] || categoryId,
          products: products
        });
      }
      
      return categories;
    } catch (error) {
      console.error(`Error loading categories for commodity ${commodityId}:`, error);
      return [];
    }
  }

  // Load products for a category
  async loadProducts(commodityId: string, categoryId: string): Promise<Product[]> {
    try {
      const productsRef = collection(this.firestore, `provinces/${this.province}/commodities/${commodityId}/categories/${categoryId}/products`);
      const productsSnap = await getDocs(productsRef);
      
      const products: Product[] = [];
      
      productsSnap.forEach((productDoc) => {
        const productData = productDoc.data();
        products.push({
          id: productDoc.id,
          name: productData['name'] || productDoc.id,
          prices: {}
        });
      });
      
      return products;
    } catch (error) {
      console.error(`Error loading products for ${commodityId}/${categoryId}:`, error);
      return [];
    }
  }

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

    this.loadCommodityTemplate();
    this.currentStep = 2;
  }

  loadCommodityTemplate() {
    const selectedCommodity = this.commodities.find(c => c.id === this.commodity);
    
    if (selectedCommodity) {
      this.categories = JSON.parse(JSON.stringify(selectedCommodity.categories));
    } else {
      this.categories = [];
    }
  }

  async addStore() {
    const alert = await this.alertController.create({
      header: 'Add Store',
      inputs: [
        {
          name: 'storeName',
          type: 'text',
          placeholder: 'Enter store name',
          value: `Store ${this.stores.length + 1}`
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: async (data) => {
            if (data.storeName && data.storeName.trim()) {
              const newStore = data.storeName.trim();
              const storeId = newStore.toLowerCase().replace(/\s+/g, '-');
              
              this.stores.push(newStore);
              
              // Save to stores subcollection
              const storeRef = doc(this.firestore, `provinces/${this.province}/stores/${storeId}`);
              await setDoc(storeRef, { name: newStore });
              
              this.showToast('Store added', 'success');
              return true;
            } else {
              this.showToast('Please enter a store name', 'warning');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

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
          handler: async () => {
            const removedStore = this.stores[index];
            
            this.stores.splice(index, 1);
            
            // Remove prices for this store from all products
            this.categories.forEach(cat => {
              cat.products.forEach(prod => {
                delete prod.prices[index];
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
            
            this.showToast('Store removed from current session', 'success');
            // Note: Not deleting from Firestore to preserve data
          }
        }
      ]
    });

    await alert.present();
  }

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
          handler: async (data) => {
            if (data.productName && data.productName.trim()) {
              const productId = data.productName.trim().toLowerCase().replace(/\s+/g, '-');
              const newProduct = {
                id: productId,
                name: data.productName.trim(),
                prices: {}
              };
              
              this.categories[categoryIndex].products.push(newProduct);
              
              // Save to Firestore
              const category = this.categories[categoryIndex];
              const productRef = doc(
                this.firestore, 
                `provinces/${this.province}/commodities/${this.commodity}/categories/${category.id}/products/${productId}`
              );
              await setDoc(productRef, { name: data.productName.trim() });
              
              this.showToast('Product added', 'success');
              return true;
            } else {
              this.showToast('Please enter a product name', 'warning');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

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
            this.showToast('Product removed', 'success');
          }
        }
      ]
    });

    await alert.present();
  }

  async addCategory() {
    const alert = await this.alertController.create({
      header: 'Add Category',
      inputs: [
        {
          name: 'categoryName',
          type: 'text',
          placeholder: 'Enter category name'
        },
        {
          name: 'productName',
          type: 'text',
          placeholder: 'Enter first product name'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: async (data) => {
            if (!data.categoryName || !data.categoryName.trim()) {
              this.showToast('Please enter a category name', 'warning');
              return false;
            }
            
            if (!data.productName || !data.productName.trim()) {
              this.showToast('Please enter a product name', 'warning');
              return false;
            }
            
            const categoryId = data.categoryName.trim().toLowerCase().replace(/\s+/g, '-');
            const productId = data.productName.trim().toLowerCase().replace(/\s+/g, '-');
            
            const newCategory = {
              id: categoryId,
              name: data.categoryName.trim(),
              products: [
                { id: productId, name: data.productName.trim(), prices: {} }
              ]
            };
            
            this.categories.push(newCategory);
            
            // Save category to Firestore
            const categoryRef = doc(
              this.firestore, 
              `provinces/${this.province}/commodities/${this.commodity}/categories/${categoryId}`
            );
            await setDoc(categoryRef, { name: data.categoryName.trim() });
            
            // Save first product
            const productRef = doc(
              this.firestore, 
              `provinces/${this.province}/commodities/${this.commodity}/categories/${categoryId}/products/${productId}`
            );
            await setDoc(productRef, { name: data.productName.trim() });
            
            this.showToast('Category added', 'success');
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  updatePrice(product: Product, storeIndex: number, event: any) {
    const value = event.target.value;
    product.prices[storeIndex] = value ? parseFloat(value) : null;
  }

  backToFileInfo() {
    this.currentStep = 1;
  }

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

  async submitForm() {
    if (!this.validatePrices()) {
      this.showToast('Please enter at least one price before saving', 'warning');
      return;
    }

    const currentUser = this.auth.currentUser;
    
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
        province: this.province,
        lastModified: Timestamp.now()
      };

      const filesRef = collection(this.firestore, `provinces/${this.province}/files`);
      const docRef = await addDoc(filesRef, fileData);

      console.log('File saved successfully, document ID:', docRef.id);
      
      await loading.dismiss();
      this.showToast('File saved successfully!', 'success');
      
      await this.router.navigateByUrl('/nueva-vizcaya', { replaceUrl: true });
    } catch (error) {
      await loading.dismiss();
      console.error('Error saving file:', error);
      this.showToast('Error saving file. Please try again.', 'danger');
    }
  }

  getCommodityDisplayName(commodity: string): string {
    const selectedCommodity = this.commodities.find(c => c.id === commodity);
    return selectedCommodity ? selectedCommodity.displayName : commodity;
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