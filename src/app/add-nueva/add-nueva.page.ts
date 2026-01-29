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
  IonSpinner,
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
  unit?: string;
  prices: { [storeIndex: number]: number | null };
  prevailingPrice?: number | null;
  createdAt?: Timestamp;
}

interface ProductCategory {
  id: string;
  name: string;
  products: Product[];
  createdAt?: Timestamp;
}

interface CommodityTemplate {
  id: string;
  name: string;
  categories: ProductCategory[];
  storeCategory?: string; // Maps to BNPC or CONSTRUCTION MATERIALS
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
    IonButtons,
    IonSpinner
  ]
})
export class AddNuevaPage implements OnInit {
  // Step 1: File Info
  fileName: string = '';
  commodity: string = '';
  customCommodity: string = '';
  customCommodityCategory: string = '';
  storeCategory: string = '';
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

  // Search functionality
  searchTerm: string = '';
  filteredCategories: ProductCategory[] = [];

  // For "Others" commodity option
  customCategories: ProductCategory[] = [];
  isCustomCommodity: boolean = false;
  customCommodityId: string = '';

  // Week visibility control
  showWeekDropdown: boolean = false;

  // File name validation
  fileNameExists: boolean = false;
  isCheckingFileName: boolean = false;

  // Store loading state
  loadingStores: boolean = false;

  // Store category ID for database operations
  storeCategoryId: string = '';

  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

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
    await this.checkUserProvince();
    await this.loadCommodities();
  }

  checkAuthStatus() {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      this.showToast('Please log in to continue', 'warning');
      this.router.navigate(['/login']);
    }
  }

  async checkUserProvince() {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return;

    try {
      const userDocRef = doc(this.firestore, `provinces/${this.province}/users/${currentUser.uid}`);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userProvince = userData['province'];
        
        if (userProvince === 'nueva_vizcaya' || userProvince === 'quirino' || userProvince === 'batanes') {
          this.showWeekDropdown = false;
          this.week = '';
        } else {
          this.showWeekDropdown = true;
        }
        
        console.log('User province:', userProvince, '| Show week dropdown:', this.showWeekDropdown);
      } else {
        this.showWeekDropdown = true;
      }
    } catch (error) {
      console.error('Error checking user province:', error);
      this.showWeekDropdown = true;
    }
  }

  async loadCommodities() {
    const loading = await this.loadingController.create({
      message: 'Loading commodities...',
    });
    await loading.present();

    try {
      const commoditiesRef = collection(this.firestore, `provinces/${this.province}/commodities`);
      const commoditiesSnap = await getDocs(commoditiesRef);
      
      this.commodities = [];
      
      // Load commodity names and determine their store category
      commoditiesSnap.forEach((commodityDoc) => {
        const commodityData = commodityDoc.data();
        const commodityName = commodityData['name'] || commodityDoc.id;
        
        // Determine store category based on commodity name
        let storeCategory = '';
        const nameLower = commodityName.toLowerCase();
        
        if (nameLower.includes('construction') || nameLower.includes('material')) {
          storeCategory = 'CONSTRUCTION MATERIALS';
        } else {
          storeCategory = 'BNPC';
        }
        
        this.commodities.push({
          id: commodityDoc.id,
          name: commodityName,
          categories: [], // Empty - will load when user selects this commodity
          storeCategory: storeCategory
        });
      });
      
      if (this.commodities.length === 0) {
        console.warn('No commodities found in database. Please add commodities manually in Firestore.');
        this.showToast('No commodities found. Please add commodities in Firestore.', 'warning');
      }
      
      console.log('Commodities loaded:', this.commodities);
    } catch (error) {
      console.error('Error loading commodities:', error);
      this.showToast('Error loading commodities: ' + error, 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async onCommodityChange() {
    this.isCustomCommodity = this.commodity === 'others';
    
    // Reset dependent fields
    this.customCommodityCategory = '';
    this.stores = [];
    this.storeCategoryId = '';
    this.storeCategory = '';
    
    if (this.isCustomCommodity) {
      this.customCommodity = '';
      this.customCategories = [];
      this.customCommodityId = '';
    } else {
      // Load stores for the selected commodity
      const selectedCommodity = this.commodities.find(c => c.id === this.commodity);
      if (selectedCommodity && selectedCommodity.storeCategory) {
        this.storeCategory = selectedCommodity.storeCategory;
        await this.loadStoresByCategory(selectedCommodity.storeCategory);
      }
    }
  }

  async loadStoresByCategory(categoryName: string) {
    this.loadingStores = true;
    this.stores = [];

    try {
      console.log('Loading stores for category:', categoryName);
      
      // First, get all store category documents to find the one matching the category name
      const storesRef = collection(this.firestore, `provinces/${this.province}/stores`);
      const categoriesSnap = await getDocs(storesRef);
      
      let categoryId = '';
      
      // Find the category ID that matches the selected category name
      for (const categoryDoc of categoriesSnap.docs) {
        const categoryData = categoryDoc.data();
        const docCategoryName = categoryData['name'] || categoryDoc.id;
        
        console.log('Checking category:', docCategoryName, 'against:', categoryName);
        
        if (docCategoryName.toUpperCase() === categoryName.toUpperCase()) {
          categoryId = categoryDoc.id;
          this.storeCategoryId = categoryId;
          console.log('Found matching category ID:', categoryId);
          break;
        }
      }
      
      if (!categoryId) {
        console.log('No matching category found for:', categoryName);
        this.showToast(`No store category found for ${categoryName}`, 'warning');
        return;
      }
      
      // Now load stores from the "store names" subcollection
      const storeNamesRef = collection(
        this.firestore, 
        `provinces/${this.province}/stores/${categoryId}/store names`
      );
      const storeNamesSnap = await getDocs(storeNamesRef);
      
      console.log('Found stores:', storeNamesSnap.size);
      
      storeNamesSnap.forEach((storeDoc) => {
        const storeName = storeDoc.id; // Document ID is the store name
        this.stores.push(storeName);
        console.log('Added store:', storeName);
      });
      
      // Sort stores alphabetically
      this.stores.sort((a, b) => a.localeCompare(b));
      
      if (this.stores.length === 0) {
        this.showToast(`No stores found for ${categoryName}. You can add stores manually.`, 'info');
      } else {
        console.log('Total stores loaded:', this.stores.length);
      }
      
    } catch (error) {
      console.error('Error loading stores:', error);
      this.showToast('Error loading stores: ' + error, 'danger');
    } finally {
      this.loadingStores = false;
    }
  }

  async loadCategories(commodityId: string): Promise<ProductCategory[]> {
    try {
      const categoriesRef = collection(this.firestore, `provinces/${this.province}/commodities/${commodityId}/categories`);
      const categoriesSnap = await getDocs(categoriesRef);
      
      // Load all categories and their products IN PARALLEL (major speed boost)
      const categoryPromises = categoriesSnap.docs.map(async (categoryDoc) => {
        const categoryData = categoryDoc.data();
        const categoryId = categoryDoc.id;
        
        const products = await this.loadProducts(commodityId, categoryId);
        
        return {
          id: categoryId,
          name: categoryData['name'] || categoryId,
          products: products,
          createdAt: categoryData['createdAt']
        };
      });
      
      // Wait for all categories to load simultaneously
      const categories = await Promise.all(categoryPromises);
      
      // Sort categories by createdAt (oldest first)
      categories.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return a.createdAt.toMillis() - b.createdAt.toMillis();
      });
      
      return categories;
    } catch (error) {
      console.error(`Error loading categories for commodity ${commodityId}:`, error);
      return [];
    }
  }

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
          unit: productData['unit'] || '',
          prices: {},
          prevailingPrice: null,
          createdAt: productData['createdAt']
        });
      });
      
      // Sort products by createdAt (oldest first)
      products.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return a.createdAt.toMillis() - b.createdAt.toMillis();
      });
      
      return products;
    } catch (error) {
      console.error(`Error loading products for ${commodityId}/${categoryId}:`, error);
      return [];
    }
  }

  // Helper method to sanitize file name for use as document ID
  sanitizeFileName(fileName: string): string {
    return fileName.trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')  // Replace invalid chars with hyphens
      .replace(/-+/g, '-')             // Remove duplicate hyphens
      .replace(/^-|-$/g, '');          // Remove leading/trailing hyphens
  }

  // New method to check if file name exists
  async checkFileNameExists() {
    if (!this.fileName || !this.fileName.trim()) {
      this.fileNameExists = false;
      return;
    }

    this.isCheckingFileName = true;
    
    try {
      const fileId = this.sanitizeFileName(this.fileName);
      const fileRef = doc(this.firestore, `provinces/${this.province}/files/${fileId}`);
      const fileDoc = await getDoc(fileRef);
      
      this.fileNameExists = fileDoc.exists();
      
      if (this.fileNameExists) {
        console.log('File name already exists:', this.fileName);
      }
    } catch (error) {
      console.error('Error checking file name:', error);
      this.fileNameExists = false;
    } finally {
      this.isCheckingFileName = false;
    }
  }

  // Method to handle file name input change with debouncing
  private fileNameCheckTimeout: any;
  onFileNameChange() {
    // Clear previous timeout
    if (this.fileNameCheckTimeout) {
      clearTimeout(this.fileNameCheckTimeout);
    }

    // Set new timeout to check after user stops typing
    this.fileNameCheckTimeout = setTimeout(() => {
      this.checkFileNameExists();
    }, 500); // 500ms debounce
  }

  async submitFileInfo() {
    // Validate file name
    if (!this.fileName.trim()) {
      this.showToast('Please enter a file name', 'warning');
      return;
    }

    // Validate commodity selection
    if (!this.commodity) {
      this.showToast('Please select a commodity', 'warning');
      return;
    }

    // Validate custom commodity name if "others" is selected
    if (this.commodity === 'others' && !this.customCommodity.trim()) {
      this.showToast('Please enter the commodity name', 'warning');
      return;
    }

    // Validate custom commodity category if "others" is selected
    if (this.commodity === 'others' && !this.customCommodityCategory) {
      this.showToast('Please select a store category', 'warning');
      return;
    }

    // For custom commodity, load stores based on selected category
    if (this.commodity === 'others' && this.customCommodityCategory) {
      this.storeCategory = this.customCommodityCategory;
      await this.loadStoresByCategory(this.customCommodityCategory);
    }

    // Validate that stores have been loaded
    if (this.stores.length === 0) {
      const proceed = await this.confirmNoStores();
      if (!proceed) {
        return;
      }
    }

    // Validate month
    if (!this.month) {
      this.showToast('Please select a month', 'warning');
      return;
    }

    // Validate week if dropdown is visible
    if (this.showWeekDropdown && !this.week) {
      this.showToast('Please select a week', 'warning');
      return;
    }

    // Check if file name exists and warn user
    await this.checkFileNameExists();
    
    if (this.fileNameExists) {
      const shouldContinue = await this.confirmFileNameExists();
      if (!shouldContinue) {
        return;
      }
    }

    // If "others" is selected, create the commodity in database first
    if (this.commodity === 'others') {
      await this.createCustomCommodity();
    }

    // Load commodity template
    await this.loadCommodityTemplate();
    
    this.currentStep = 2;
  }

  // Helper method to confirm proceeding with no stores
  async confirmNoStores(): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: 'No Stores Found',
        message: 'No stores are available for this commodity category. You can add stores manually in the next step. Do you want to continue?',
        buttons: [
          {
            text: 'Go Back',
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: 'Continue',
            handler: () => resolve(true)
          }
        ]
      });
      
      await alert.present();
    });
  }

  // Helper method to confirm proceeding with existing file name
  async confirmFileNameExists(): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: 'File Name Already Exists',
        message: `A file named "${this.fileName.trim()}" already exists. If you continue and save, it will be overwritten. Do you want to proceed?`,
        buttons: [
          {
            text: 'Change Name',
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: 'Continue Anyway',
            handler: () => resolve(true)
          }
        ]
      });
      
      await alert.present();
    });
  }

  async createCustomCommodity() {
    const loading = await this.loadingController.create({
      message: 'Creating custom commodity...',
    });
    await loading.present();

    try {
      const now = Timestamp.now();
      this.customCommodityId = this.customCommodity.trim().toLowerCase().replace(/\s+/g, '-');

      // Save only the custom commodity (no categories or products yet)
      const commodityRef = doc(this.firestore, `provinces/${this.province}/commodities/${this.customCommodityId}`);
      await setDoc(commodityRef, {
        name: this.customCommodity.trim(),
        createdAt: now
      });

      console.log('Custom commodity created in database');
      
      await loading.dismiss();
      this.showToast('Custom commodity created!', 'success');
    } catch (error) {
      await loading.dismiss();
      console.error('Error creating custom commodity:', error);
      this.showToast('Error creating custom commodity. Please try again.', 'danger');
      throw error;
    }
  }

  async loadCommodityTemplate() {
    const loading = await this.loadingController.create({
      message: 'Loading commodity data...',
    });
    await loading.present();

    try {
      if (this.commodity === 'others') {
        // For custom commodity, load from database (it will be empty initially)
        const categories = await this.loadCategories(this.customCommodityId);
        this.categories = categories.length > 0 ? JSON.parse(JSON.stringify(categories)) : [];
        
        // Initialize prices object for each product
        this.categories.forEach(category => {
          category.products.forEach(product => {
            if (!product.prices) {
              product.prices = {};
            }
            if (!product.hasOwnProperty('prevailingPrice')) {
              product.prevailingPrice = null;
            }
            if (!product.unit) {
              product.unit = '';
            }
          });
        });
        
        this.filteredCategories = this.categories.length > 0 ? JSON.parse(JSON.stringify(this.categories)) : [];
      } else {
        // Load categories for the selected commodity (with parallel loading for speed)
        const categories = await this.loadCategories(this.commodity);
        this.categories = JSON.parse(JSON.stringify(categories));
        
        // Initialize prices object for each product
        this.categories.forEach(category => {
          category.products.forEach(product => {
            if (!product.prices) {
              product.prices = {};
            }
            if (!product.hasOwnProperty('prevailingPrice')) {
              product.prevailingPrice = null;
            }
            if (!product.unit) {
              product.unit = '';
            }
          });
        });
        
        this.filteredCategories = JSON.parse(JSON.stringify(this.categories));
      }
    } catch (error) {
      console.error('Error loading commodity template:', error);
      this.showToast('Error loading commodity data', 'danger');
    } finally {
      await loading.dismiss();
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
              
              // Check if we have a valid category ID
              if (!this.storeCategoryId) {
                this.showToast('Error: Store category not properly initialized', 'danger');
                return false;
              }
              
              this.stores.push(newStore);
              
              // Save to the "store names" subcollection
              const storeRef = doc(
                this.firestore, 
                `provinces/${this.province}/stores/${this.storeCategoryId}/store names/${newStore}`
              );
              await setDoc(storeRef, { 
                createdAt: Timestamp.now(),
                createdBy: this.auth.currentUser?.uid || 'unknown'
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
              const newProduct = {
                id: productId,
                name: data.productName.trim(),
                unit: data.unit ? data.unit.trim() : '',
                prices: {},
                prevailingPrice: null,
                createdAt: Timestamp.now()
              };
              
              this.categories[categoryIndex].products.push(newProduct);
              
              // Save to database
              const category = this.categories[categoryIndex];
              const commodityIdToUse = this.commodity === 'others' ? this.customCommodityId : this.commodity;
              
              const productRef = doc(
                this.firestore, 
                `provinces/${this.province}/commodities/${commodityIdToUse}/categories/${category.id}/products/${productId}`
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
            
            const newCategory = {
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
            
            // Save to database
            const commodityIdToUse = this.commodity === 'others' ? this.customCommodityId : this.commodity;
            
            const categoryRef = doc(
              this.firestore, 
              `provinces/${this.province}/commodities/${commodityIdToUse}/categories/${categoryId}`
            );
            await setDoc(categoryRef, { 
              name: data.categoryName.trim(),
              createdAt: now
            });
            
            const productRef = doc(
              this.firestore, 
              `provinces/${this.province}/commodities/${commodityIdToUse}/categories/${categoryId}/products/${productId}`
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
        
        console.log('Unit updated for product:', product.name, 'Unit:', actualProduct.unit);
        break;
      }
    }
  }

  // Calculate prevailing price (mode or highest if no mode)
  calculatePrevailingPrice(prices: { [storeIndex: number]: number | null }): number | null {
    // Get all valid prices (non-null and > 0)
    const validPrices = Object.values(prices)
      .filter(price => price !== null && price !== undefined && price > 0) as number[];
    
    if (validPrices.length === 0) {
      return null;
    }
    
    // Count frequency of each price
    const frequencyMap: { [price: number]: number } = {};
    validPrices.forEach(price => {
      frequencyMap[price] = (frequencyMap[price] || 0) + 1;
    });
    
    // Find the maximum frequency
    const maxFrequency = Math.max(...Object.values(frequencyMap));
    
    // If max frequency is 1, no mode exists, return highest price
    if (maxFrequency === 1) {
      return Math.max(...validPrices);
    }
    
    // Get all prices with max frequency (modes)
    const modes = Object.keys(frequencyMap)
      .filter(price => frequencyMap[Number(price)] === maxFrequency)
      .map(Number);
    
    // Return the highest mode if multiple modes exist
    return Math.max(...modes);
  }

  updatePrice(product: Product, storeIndex: number, event: any) {
    const value = event.target.value;
    const numValue = value ? parseFloat(value) : null;
    
    // Find the actual product in the categories array (not filtered copy)
    for (const category of this.categories) {
      const actualProduct = category.products.find(p => p.id === product.id);
      if (actualProduct) {
        // Ensure prices object exists
        if (!actualProduct.prices) {
          actualProduct.prices = {};
        }
        actualProduct.prices[storeIndex] = numValue;
        
        // Calculate and update prevailing price
        actualProduct.prevailingPrice = this.calculatePrevailingPrice(actualProduct.prices);
        
        // Also update the filtered copy so UI shows the value
        if (!product.prices) {
          product.prices = {};
        }
        product.prices[storeIndex] = numValue;
        product.prevailingPrice = actualProduct.prevailingPrice;
        
        console.log('Price updated for product:', product.name, 'Store index:', storeIndex, 'Value:', numValue);
        console.log('All prices for this product:', actualProduct.prices);
        console.log('Prevailing price:', actualProduct.prevailingPrice);
        break;
      }
    }
  }

  backToFileInfo() {
    this.currentStep = 1;
  }

  validatePrices(): boolean {
    if (this.categories.length === 0) {
      console.log('Validation failed: No categories');
      return false;
    }

    let hasAtLeastOnePrice = false;
    
    for (const category of this.categories) {
      for (const product of category.products) {
        console.log('Checking product:', product.name, 'Prices:', product.prices);
        
        // Check if prices object exists and has any entries
        if (product.prices && Object.keys(product.prices).length > 0) {
          const prices = Object.values(product.prices);
          if (prices.some(price => price !== null && price !== undefined && price > 0)) {
            hasAtLeastOnePrice = true;
            console.log('Found valid price in product:', product.name);
            break;
          }
        }
      }
      if (hasAtLeastOnePrice) break;
    }
    
    console.log('Validation result:', hasAtLeastOnePrice);
    return hasAtLeastOnePrice;
  }

  async submitForm() {
    if (this.categories.length === 0) {
      this.showToast('Please add at least one category and product before saving', 'warning');
      return;
    }

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
      const now = Timestamp.now();

      // Determine commodity ID and display name
      let commodityIdToSave = this.commodity;
      let commodityDisplayName = '';

      if (this.commodity === 'others') {
        commodityIdToSave = this.customCommodityId;
        commodityDisplayName = this.customCommodity.trim();
      } else {
        commodityDisplayName = this.getCommodityDisplayName(this.commodity);
      }

      // Create custom file ID from fileName
      const fileId = this.sanitizeFileName(this.fileName);
      
      // Ensure all products have prevailing prices calculated
      this.categories.forEach(category => {
        category.products.forEach(product => {
          if (!product.prevailingPrice) {
            product.prevailingPrice = this.calculatePrevailingPrice(product.prices);
          }
        });
      });

      // Save the file data with prevailing prices and time period
      const fileData = {
        fileName: this.fileName.trim(),
        commodity: commodityIdToSave,
        commodityDisplay: commodityDisplayName,
        storeCategory: this.storeCategory,
        storeCategoryId: this.storeCategoryId,
        month: this.month,
        week: this.showWeekDropdown ? this.week : null,
        stores: this.stores,
        categories: this.categories,
        uploadedBy: userId,
        uploadedByEmail: userEmail,
        uploadedAt: now,
        province: this.province,
        lastModified: now,
        isCustomCommodity: this.commodity === 'others',
        // Store time period for comparative analysis
        timePeriod: {
          month: this.month,
          week: this.showWeekDropdown ? this.week : null,
          year: new Date().getFullYear(),
          timestamp: now
        }
      };

      // Use setDoc with custom ID - will overwrite if exists
      const fileRef = doc(this.firestore, `provinces/${this.province}/files/${fileId}`);
      await setDoc(fileRef, fileData);

      console.log('File saved successfully with ID:', fileId);
      
      await loading.dismiss();
      
      if (this.fileNameExists) {
        this.showToast('File updated successfully!', 'success');
      } else {
        this.showToast('File saved successfully!', 'success');
      }
      
      await this.router.navigateByUrl('/nueva', { replaceUrl: true });
    } catch (error) {
      await loading.dismiss();
      console.error('Error saving file:', error);
      this.showToast('Error saving file. Please try again.', 'danger');
    }
  }

  getCommodityDisplayName(commodity: string): string {
    const selectedCommodity = this.commodities.find(c => c.id === commodity);
    return selectedCommodity ? selectedCommodity.name : commodity;
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