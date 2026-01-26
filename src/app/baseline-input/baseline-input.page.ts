import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSpinner,
  LoadingController,
  ToastController,
  AlertController
} from '@ionic/angular/standalone';
import { DataService, ProductCategory, BaselineData, BaselineProductPrice } from '../services/data.service';
import { Timestamp } from '@angular/fire/firestore';
import { addIcons } from 'ionicons';
import { 
  informationCircleOutline, 
  bulbOutline, 
  saveOutline, 
  refreshOutline 
} from 'ionicons/icons';

interface WeeklyHeader {
  month: string;
  weeks: string[];
}

@Component({
  selector: 'app-baseline-input',
  templateUrl: './baseline-input.page.html',
  styleUrls: ['./baseline-input.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class BaselineInputPage implements OnInit {
  provinceName: string = '';
  provinceDisplay: string = '';
  
  selectedCommodity: string = '';
  
  templateCategories: ProductCategory[] = [];
  templateLoaded: boolean = false;
  loadingTemplate: boolean = false;
  
  // Data structure: { productId: { October: 45.50, November: 46.00, ... } }
  // For weekly: { productId: { October: { 'Week 1': 45, 'Week 2': 46, ... }, ... } }
  baselineData: { [productId: string]: any } = {};
  
  needsWeekly: boolean = false;
  weeklyHeaders: WeeklyHeader[] = [
    { month: 'October', weeks: ['Week 1', 'Week 2', 'Week 3', 'Week 4'] },
    { month: 'November', weeks: ['Week 1', 'Week 2', 'Week 3', 'Week 4'] },
    { month: 'December', weeks: ['Week 1', 'Week 2', 'Week 3', 'Week 4'] }
  ];
  
  saving: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    addIcons({ 
      informationCircleOutline, 
      bulbOutline, 
      saveOutline, 
      refreshOutline 
    });
  }

  async ngOnInit() {
    // Get province from query params or route
    this.provinceName = this.route.snapshot.queryParamMap.get('province') || 
                        this.route.snapshot.paramMap.get('province') || '';
    
    if (!this.provinceName) {
      this.showToast('Province not specified', 'danger');
      this.router.navigate(['/']);
      return;
    }

    // Get commodity from query params (required)
    this.selectedCommodity = this.route.snapshot.queryParamMap.get('commodity') || '';
    
    if (!this.selectedCommodity) {
      this.showToast('Commodity not specified', 'danger');
      this.router.navigate([this.getBackRoute()]);
      return;
    }

    // Set province display name
    this.provinceDisplay = this.getProvinceDisplayName(this.provinceName);
    
    // Determine if weekly is needed
    this.needsWeekly = this.provinceName === 'isabela' || this.provinceName === 'cagayan';
    
    // Load the template and data
    await this.loadTemplate();
  }

  async loadTemplate() {
    this.loadingTemplate = true;
    
    try {
      // Get template from existing files
      this.templateCategories = await this.dataService.getBaselineTemplate(
        this.provinceName,
        this.selectedCommodity
      );
      
      // Initialize baseline data structure
      this.initializeBaselineData();
      
      // Try to load existing baseline data if any
      await this.loadExistingBaselineData();
      
      this.templateLoaded = true;
      
    } catch (error) {
      console.error('Error loading template:', error);
      this.showToast('Error loading template', 'danger');
      this.templateLoaded = false;
    } finally {
      this.loadingTemplate = false;
    }
  }

  initializeBaselineData() {
    this.baselineData = {};
    
    for (const category of this.templateCategories) {
      for (const product of category.products) {
        if (this.needsWeekly) {
          // Weekly structure
          this.baselineData[product.id] = {
            October: { 'Week 1': null, 'Week 2': null, 'Week 3': null, 'Week 4': null },
            November: { 'Week 1': null, 'Week 2': null, 'Week 3': null, 'Week 4': null },
            December: { 'Week 1': null, 'Week 2': null, 'Week 3': null, 'Week 4': null }
          };
        } else {
          // Monthly structure
          this.baselineData[product.id] = {
            October: null,
            November: null,
            December: null
          };
        }
      }
    }
  }

  async loadExistingBaselineData() {
    try {
      const existingData = await this.dataService.getBaselineData(
        this.provinceName,
        this.selectedCommodity
      );
      
      if (existingData && existingData.products) {
        // Populate existing data
        for (const productData of existingData.products) {
          if (this.baselineData[productData.productId]) {
            this.baselineData[productData.productId] = { ...productData.prices };
          }
        }
        
        this.showToast('Loaded existing baseline data', 'success');
      }
    } catch (error) {
      console.error('Error loading existing baseline:', error);
      // It's okay if no existing data - user is creating new
    }
  }

  async saveBaselineData() {
    // Validate that at least some data is entered
    if (!this.hasAnyData()) {
      this.showToast('Please enter at least some price data', 'warning');
      return;
    }

    // Confirm save
    const alert = await this.alertController.create({
      header: 'Save Baseline Data',
      message: 'Are you sure you want to save this baseline data? This will be used for year-over-year price comparison.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: async () => {
            await this.performSave();
          }
        }
      ]
    });

    await alert.present();
  }

  async performSave() {
    this.saving = true;
    const loading = await this.loadingController.create({
      message: 'Saving baseline data...'
    });
    await loading.present();

    try {
      // Build baseline data structure
      const products: BaselineProductPrice[] = [];
      
      for (const category of this.templateCategories) {
        for (const product of category.products) {
          const productPrices = this.baselineData[product.id];
          
          products.push({
            productId: product.id,
            productName: product.name,
            unit: product.unit || '',
            prices: productPrices
          });
        }
      }

      const baselineData: BaselineData = {
        commodity: this.selectedCommodity.toLowerCase().replace(/\s+/g, '_'),
        commodityDisplay: this.selectedCommodity,
        province: this.provinceName,
        year: 2025,
        products: products,
        createdAt: Timestamp.now(),
        lastModified: Timestamp.now()
      };

      // Save to Firestore
      await this.dataService.saveBaselineData(
        this.provinceName,
        this.selectedCommodity,
        baselineData
      );

      await loading.dismiss();
      this.showToast('Baseline data saved successfully!', 'success');
      
      // Navigate back after a short delay
      setTimeout(() => {
        this.goBack();
      }, 1500);
      
    } catch (error) {
      console.error('Error saving baseline data:', error);
      await loading.dismiss();
      this.showToast('Error saving baseline data', 'danger');
    } finally {
      this.saving = false;
    }
  }

  async clearAllData() {
    const alert = await this.alertController.create({
      header: 'Clear All Data',
      message: 'Are you sure you want to clear all entered prices? This cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Clear',
          role: 'destructive',
          handler: () => {
            this.initializeBaselineData();
            this.showToast('All data cleared', 'medium');
          }
        }
      ]
    });

    await alert.present();
  }

  hasAnyData(): boolean {
    for (const productId in this.baselineData) {
      const productPrices = this.baselineData[productId];
      
      if (this.needsWeekly) {
        // Check weekly data
        for (const month in productPrices) {
          for (const week in productPrices[month]) {
            if (productPrices[month][week] !== null && productPrices[month][week] !== undefined) {
              return true;
            }
          }
        }
      } else {
        // Check monthly data
        for (const month in productPrices) {
          if (productPrices[month] !== null && productPrices[month] !== undefined) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  getColumnSpan(): number {
    if (this.needsWeekly) {
      return 2 + 12; // Product + Unit + 12 weeks
    } else {
      return 2 + 3; // Product + Unit + 3 months
    }
  }

  getProvinceDisplayName(provinceName: string): string {
    const displayNames: { [key: string]: string } = {
      'nueva': 'Nueva Vizcaya',
      'nueva_vizcaya': 'Nueva Vizcaya',
      'quirino': 'Quirino',
      'isabela': 'Isabela',
      'cagayan': 'Cagayan'
    };
    
    return displayNames[provinceName] || provinceName;
  }

  getBackRoute(): string {
    const routeName = this.provinceName.replace(/_/g, '-');
    return `/${routeName}`;
  }

  goBack() {
    const routeName = this.provinceName.replace(/_/g, '-');
    this.router.navigate([`/${routeName}`]);
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    await toast.present();
  }
}