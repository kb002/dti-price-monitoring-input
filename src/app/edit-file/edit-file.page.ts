import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
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
  ToastController,
} from '@ionic/angular/standalone';
import { 
  Firestore, 
  collection, 
  doc, 
  getDoc,
  getDocs,
  setDoc,
  Timestamp
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { DataService, FileData, Product, ProductCategory } from '../services/data.service';

@Component({
  selector: 'app-edit-file',
  templateUrl: './edit-file.page.html',
  styleUrls: ['./edit-file.page.scss'],
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
    IonButtons,
    IonicModule,
  ]
})
export class EditFilePage implements OnInit {
  // Route params
  provinceName: string = '';
  fileId: string = '';
  
  // Original file data
  originalFileData: FileData | null = null;
  
  // File Info
  fileName: string = '';
  commodity: string = '';
  commodityDisplayName: string = '';
  month: string = '';
  week: string = '';

  // Dynamic data from database
  stores: string[] = [];
  categories: ProductCategory[] = [];

  // Search functionality
  searchTerm: string = '';
  filteredCategories: ProductCategory[] = [];

  // Week visibility control
  showWeekDropdown: boolean = false;

  // Authorization
  isOwner: boolean = false;
  loading: boolean = true;

  // Track if form has been modified
  hasUnsavedChanges: boolean = false;

  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firestore: Firestore,
    private auth: Auth,
    private dataService: DataService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    // Get route parameters
    this.provinceName = this.route.snapshot.paramMap.get('province') || '';
    this.fileId = this.route.snapshot.paramMap.get('fileId') || '';
    
    if (!this.provinceName || !this.fileId) {
      this.showToast('Invalid file or province', 'danger');
      this.navigateBack();
      return;
    }

    await this.checkAuthAndLoadData();
  }

  async checkAuthAndLoadData() {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.showToast('Please log in to continue', 'warning');
      this.router.navigate(['/login']);
      return;
    }

    const loadingCtrl = await this.loadingController.create({
      message: 'Loading file data...',
    });
    await loadingCtrl.present();

    try {
      // Load the file data
      this.originalFileData = await this.dataService.getFileById(this.provinceName, this.fileId);
      
      if (!this.originalFileData) {
        await loadingCtrl.dismiss();
        this.showToast('File not found', 'danger');
        this.navigateBack();
        return;
      }

      // Check if current user is the owner
      this.isOwner = this.originalFileData.uploadedBy === currentUser.uid;
      
      if (!this.isOwner) {
        await loadingCtrl.dismiss();
        this.showToast('You do not have permission to edit this file', 'danger');
        this.navigateBack();
        return;
      }

      // Populate form with existing data
      this.fileName = this.originalFileData.fileName;
      this.commodity = this.originalFileData.commodity;
      this.commodityDisplayName = this.originalFileData.commodityDisplay || this.originalFileData.commodity;
      this.month = this.originalFileData.month;
      this.week = this.originalFileData.week || '';

      // Load province data
      await this.checkUserProvince();
      
      // Load existing categories and products with prices
      this.categories = JSON.parse(JSON.stringify(this.originalFileData.categories));
      this.filteredCategories = JSON.parse(JSON.stringify(this.categories));
      
      // Load stores from file data
      this.stores = [...this.originalFileData.stores];

      this.loading = false;
    } catch (error) {
      console.error('Error loading file:', error);
      this.showToast('Error loading file data', 'danger');
      this.navigateBack();
    } finally {
      await loadingCtrl.dismiss();
    }
  }

  async checkUserProvince() {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return;

    try {
      const userDocRef = doc(this.firestore, `provinces/${this.provinceName}/users/${currentUser.uid}`);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userProvince = userData['province'];
        
        if (userProvince === 'nueva_vizcaya' || userProvince === 'quirino') {
          this.showWeekDropdown = false;
        } else {
          this.showWeekDropdown = true;
        }
      } else {
        this.showWeekDropdown = true;
      }
    } catch (error) {
      console.error('Error checking user province:', error);
      this.showWeekDropdown = true;
    }
  }

  markAsModified() {
    this.hasUnsavedChanges = true;
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
              this.markAsModified();
              
              const storeRef = doc(this.firestore, `provinces/${this.provinceName}/stores/${storeId}`);
              await setDoc(storeRef, { 
                name: newStore,
                createdAt: Timestamp.now()
              });
              
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

  async addProduct(categoryIndex: number) {
    const alert = await this.alertController.create({
      header: 'Add Product',
      inputs: [
        {
          name: 'productName',
          type: 'text',
          placeholder: 'Enter product name'
        },
        {
          name: 'unit',
          type: 'text',
          placeholder: 'Enter unit (e.g., kg, pc, liter)'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: async (data) => {
            if (data.productName && data.productName.trim()) {
              const productId = data.productName.trim().toLowerCase().replace(/\s+/g, '-');
              const newProduct: Product = {
                id: productId,
                name: data.productName.trim(),
                unit: data.unit ? data.unit.trim() : '',
                prices: {},
                prevailingPrice: null,
                createdAt: Timestamp.now()
              };
              
              this.categories[categoryIndex].products.push(newProduct);
              this.markAsModified();
              
              const category = this.categories[categoryIndex];
              
              const productRef = doc(
                this.firestore, 
                `provinces/${this.provinceName}/commodities/${this.commodity}/categories/${category.id}/products/${productId}`
              );
              await setDoc(productRef, { 
                name: data.productName.trim(),
                unit: data.unit ? data.unit.trim() : '',
                createdAt: Timestamp.now()
              });
              
              this.onSearch();
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
        },
        {
          name: 'unit',
          type: 'text',
          placeholder: 'Enter unit (e.g., kg, pc, liter)'
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
            const now = Timestamp.now();
            
            const newCategory: ProductCategory = {
              id: categoryId,
              name: data.categoryName.trim(),
              products: [
                { 
                  id: productId, 
                  name: data.productName.trim(), 
                  unit: data.unit ? data.unit.trim() : '',
                  prices: {},
                  prevailingPrice: null,
                  createdAt: now
                }
              ],
              createdAt: now
            };
            
            this.categories.push(newCategory);
            this.markAsModified();
            
            const categoryRef = doc(
              this.firestore, 
              `provinces/${this.provinceName}/commodities/${this.commodity}/categories/${categoryId}`
            );
            await setDoc(categoryRef, { 
              name: data.categoryName.trim(),
              createdAt: now
            });
            
            const productRef = doc(
              this.firestore, 
              `provinces/${this.provinceName}/commodities/${this.commodity}/categories/${categoryId}/products/${productId}`
            );
            await setDoc(productRef, { 
              name: data.productName.trim(),
              unit: data.unit ? data.unit.trim() : '',
              createdAt: now
            });
            
            this.onSearch();
            this.showToast('Category added', 'success');
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  onSearch() {
    const term = this.searchTerm.toLowerCase().trim();
    
    if (!term) {
      this.filteredCategories = JSON.parse(JSON.stringify(this.categories));
      return;
    }
    
    this.filteredCategories = this.categories
      .map(category => {
        const categoryMatches = category.name.toLowerCase().includes(term);
        const filteredProducts = category.products.filter(product =>
          product.name.toLowerCase().includes(term)
        );
        
        if (categoryMatches || filteredProducts.length > 0) {
          return {
            ...category,
            products: categoryMatches ? category.products : filteredProducts
          };
        }
        
        return null;
      })
      .filter(category => category !== null) as ProductCategory[];
  }

  clearSearch() {
    this.searchTerm = '';
    this.onSearch();
  }

  getOriginalCategoryIndex(categoryId: string): number {
    return this.categories.findIndex(cat => cat.id === categoryId);
  }

  // Update unit for a product
  updateUnit(product: Product, event: any) {
    const value = event.target.value;
    
    // Find the actual product in the categories array (not filtered copy)
    for (const category of this.categories) {
      const actualProduct = category.products.find(p => p.id === product.id);
      if (actualProduct) {
        actualProduct.unit = value ? value.trim() : '';
        
        // Also update the filtered copy so UI shows the value
        product.unit = actualProduct.unit;
        
        this.markAsModified();
        console.log('Unit updated for product:', product.name, 'Unit:', actualProduct.unit);
        break;
      }
    }
  }

  calculatePrevailingPrice(prices: { [storeIndex: number]: number | null }): number | null {
    const validPrices = Object.values(prices)
      .filter(price => price !== null && price !== undefined && price > 0) as number[];
    
    if (validPrices.length === 0) {
      return null;
    }
    
    const frequencyMap: { [price: number]: number } = {};
    validPrices.forEach(price => {
      frequencyMap[price] = (frequencyMap[price] || 0) + 1;
    });
    
    const maxFrequency = Math.max(...Object.values(frequencyMap));
    
    if (maxFrequency === 1) {
      return Math.max(...validPrices);
    }
    
    const modes = Object.keys(frequencyMap)
      .filter(price => frequencyMap[Number(price)] === maxFrequency)
      .map(Number);
    
    return Math.max(...modes);
  }

  updatePrice(product: Product, storeIndex: number, event: any) {
    const value = event.target.value;
    const numValue = value ? parseFloat(value) : null;
    
    for (const category of this.categories) {
      const actualProduct = category.products.find(p => p.id === product.id);
      if (actualProduct) {
        if (!actualProduct.prices) {
          actualProduct.prices = {};
        }
        actualProduct.prices[storeIndex] = numValue;
        actualProduct.prevailingPrice = this.calculatePrevailingPrice(actualProduct.prices);
        
        if (!product.prices) {
          product.prices = {};
        }
        product.prices[storeIndex] = numValue;
        product.prevailingPrice = actualProduct.prevailingPrice;
        this.markAsModified();
        break;
      }
    }
  }

  validateForm(): boolean {
    if (!this.fileName.trim()) {
      this.showToast('Please enter a file name', 'warning');
      return false;
    }

    if (!this.month) {
      this.showToast('Please select a month', 'warning');
      return false;
    }

    if (this.showWeekDropdown && !this.week) {
      this.showToast('Please select a week', 'warning');
      return false;
    }

    if (this.categories.length === 0) {
      this.showToast('Please add at least one category and product before saving', 'warning');
      return false;
    }

    let hasAtLeastOnePrice = false;
    for (const category of this.categories) {
      for (const product of category.products) {
        if (product.prices && Object.keys(product.prices).length > 0) {
          const prices = Object.values(product.prices);
          if (prices.some(price => price !== null && price !== undefined && price > 0)) {
            hasAtLeastOnePrice = true;
            break;
          }
        }
      }
      if (hasAtLeastOnePrice) break;
    }
    
    if (!hasAtLeastOnePrice) {
      this.showToast('Please enter at least one price before saving', 'warning');
      return false;
    }

    return true;
  }

  async submitForm() {
    if (!this.validateForm()) {
      return;
    }

    const currentUser = this.auth.currentUser;
    
    if (!currentUser) {
      this.showToast('Session expired. Please log in again.', 'warning');
      this.router.navigate(['/login']);
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Updating file...',
    });
    await loading.present();

    try {
      const now = Timestamp.now();

      // Ensure prevailing prices are calculated for all products
      this.categories.forEach(category => {
        category.products.forEach(product => {
          if (!product.prevailingPrice) {
            product.prevailingPrice = this.calculatePrevailingPrice(product.prices);
          }
        });
      });

      const fileData = {
        fileName: this.fileName.trim(),
        commodity: this.commodity,
        commodityDisplay: this.commodityDisplayName,
        month: this.month,
        week: this.showWeekDropdown ? this.week : null,
        stores: this.stores,
        categories: this.categories,
        uploadedBy: this.originalFileData!.uploadedBy,
        uploadedByEmail: this.originalFileData!.uploadedByEmail,
        uploadedAt: this.originalFileData!.uploadedAt,
        province: this.provinceName,
        lastModified: now,
        isCustomCommodity: this.originalFileData!.isCustomCommodity || false,
        timePeriod: {
          month: this.month,
          week: this.showWeekDropdown ? this.week : null,
          year: new Date().getFullYear(),
          timestamp: now
        }
      };

      await this.dataService.updateFile(this.provinceName, this.fileId, fileData);

      await loading.dismiss();
      this.hasUnsavedChanges = false;
      this.showToast('File updated successfully!', 'success');
      this.navigateBack();
    } catch (error) {
      await loading.dismiss();
      console.error('Error updating file:', error);
      this.showToast('Error updating file. Please try again.', 'danger');
    }
  }

  async goBack() {
    if (this.hasUnsavedChanges) {
      const alert = await this.alertController.create({
        header: 'Unsaved Changes',
        message: 'Are you sure you want to go back? Your changes will not be saved.',
        buttons: [
          {
            text: 'Keep Editing',
            role: 'cancel'
          },
          {
            text: 'Discard Changes',
            role: 'destructive',
            handler: () => {
              this.navigateBack();
            }
          }
        ]
      });

      await alert.present();
    } else {
      this.navigateBack();
    }
  }

  navigateBack() {
    const routeName = this.provinceName.replace(/_/g, '-');
    this.router.navigate([`/${routeName}`]);
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