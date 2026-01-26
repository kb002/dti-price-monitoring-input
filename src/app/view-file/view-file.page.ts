import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonBackButton,
  IonButtons,
  IonSpinner,
  IonToggle,
  IonButton,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { DataService, FileData, BaselineData } from '../services/data.service';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { warningOutline, addCircleOutline } from 'ionicons/icons';

interface ComparisonData {
  weekAgo?: FileData | BaselineData | null;
  monthAgo?: FileData | BaselineData | null;
  threeMonthsAgo?: FileData | BaselineData | null;
}

@Component({
  selector: 'app-view-file',
  templateUrl: './view-file.page.html',
  styleUrls: ['./view-file.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonBackButton,
    IonButtons,
    IonSpinner,
    IonToggle,
    IonButton
  ]
})
export class ViewFilePage implements OnInit {
  fileData: FileData | null = null;
  loading: boolean = true;
  error: string = '';
  
  // Comparison feature
  showComparison: boolean = false;
  comparisonData: ComparisonData = {};
  loadingComparison: boolean = false;
  
  // Baseline data check
  needsBaseline: boolean = false;
  baselineExists: boolean = false;
  
  // Route params
  provinceName: string = '';
  fileId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    // Register icons
    addIcons({ warningOutline, addCircleOutline });
  }

  async ngOnInit() {
    this.provinceName = this.route.snapshot.paramMap.get('province') || '';
    this.fileId = this.route.snapshot.paramMap.get('fileId') || '';
    
    if (!this.provinceName || !this.fileId) {
      this.error = 'Invalid file or province';
      this.loading = false;
      return;
    }
    
    await this.loadFileData();
  }

  async loadFileData() {
    const loading = await this.loadingController.create({
      message: 'Loading file...',
    });
    await loading.present();

    try {
      this.fileData = await this.dataService.getFileById(this.provinceName, this.fileId);
      
      if (!this.fileData) {
        this.error = 'File not found';
      } else {
        // Check if this file needs baseline data (Jan-Mar 2026)
        this.checkIfNeedsBaseline();
      }
      
      this.loading = false;
    } catch (error) {
      console.error('Error loading file:', error);
      this.error = 'Error loading file data';
      this.loading = false;
      this.showToast('Error loading file', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  checkIfNeedsBaseline() {
    if (!this.fileData) return;

    // Check if the file is from Jan, Feb, or Mar 2026
    const month = this.fileData.month;
    const needsBaselineMonths = ['January', 'February', 'March'];
    
    this.needsBaseline = needsBaselineMonths.includes(month);
  }

  async onToggleChange(event: any) {
    const isChecked = event.detail.checked;
    this.showComparison = isChecked;
    
    if (isChecked) {
      // Check if baseline exists when toggling on
      if (this.needsBaseline) {
        await this.checkBaselineExists();
      }
      
      // Only load comparison if baseline check passed (or not needed)
      if (!this.needsBaseline || this.baselineExists) {
        if (!this.comparisonData.threeMonthsAgo) {
          await this.loadComparisonData();
        }
      }
    }
  }

  async checkBaselineExists() {
    if (!this.fileData) return;

    try {
      // Smart check: looks for Oct-Dec files from previous year FIRST,
      // then falls back to baseline data if not found
      this.baselineExists = await this.dataService.checkYearOverYearDataExists(
        this.provinceName,
        this.fileData.commodityDisplay,
        this.fileData.month,
        this.fileData.week,
        this.needsWeekComparison()
      );

      if (!this.baselineExists) {
        console.log('No year-over-year comparison data found for', this.fileData.commodityDisplay);
        console.log('   Please setup 2025 baseline or upload Oct-Dec files');
      } else {
        console.log('Year-over-year comparison data available');
      }
    } catch (error) {
      console.error('Error checking baseline:', error);
      this.baselineExists = false;
    }
  }

  async loadComparisonData() {
    if (!this.fileData) return;

    this.loadingComparison = true;
    
    try {
      // Determine which comparisons we need based on province
      const needsWeekAgo = this.needsWeekComparison();
      
      // Load comparison files based on exact month/week
      if (needsWeekAgo) {
        this.comparisonData.weekAgo = await this.findComparisonFile('week');
      }
      
      // For month ago comparison - check if it needs year-over-year
      if (this.needsBaseline && this.fileData.month === 'January') {
        // January needs December from previous year
        this.comparisonData.monthAgo = await this.findYearOverYearComparison('month');
      } else {
        this.comparisonData.monthAgo = await this.findComparisonFile('month');
      }
      
      // For 3 months ago, check if we need year-over-year comparison
      if (this.needsBaseline) {
        this.comparisonData.threeMonthsAgo = await this.findYearOverYearComparison('threeMonths');
      } else {
        this.comparisonData.threeMonthsAgo = await this.findComparisonFile('threeMonths');
      }
      
    } catch (error) {
      console.error('Error loading comparison data:', error);
      this.showToast('Error loading comparison data', 'danger');
    } finally {
      this.loadingComparison = false;
    }
  }

  async findYearOverYearComparison(period: 'month' | 'threeMonths'): Promise<FileData | BaselineData | null> {
    if (!this.fileData) return null;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const currentMonthIndex = monthNames.indexOf(this.fileData.month);
    const currentWeek = this.fileData.week ? parseInt(this.fileData.week.replace('Week ', '')) : null;
    
    // Calculate target month based on period
    let monthsBack = period === 'month' ? 1 : 3;
    const prevMonthIndex = (currentMonthIndex - monthsBack + 12) % 12;
    const targetMonth = monthNames[prevMonthIndex];
    let targetWeek: string | null = null;
    
    if (currentWeek !== null) {
      targetWeek = `Week ${currentWeek}`;
    }

    console.log(`Looking for ${period} comparison: ${targetMonth}`, targetWeek || '(monthly)');

    // First, try to find an uploaded file from previous year
    const allFiles = await this.dataService.getFilesByProvince(this.provinceName);
    
    const matchingFile = allFiles.find(f => {
      const commodityMatch = f.commodityDisplay === this.fileData!.commodityDisplay;
      const monthMatch = f.month === targetMonth;
      const weekMatch = targetWeek === null ? 
        (!f.week || f.week === '') : 
        f.week === targetWeek;
      
      return commodityMatch && monthMatch && weekMatch;
    });

    if (matchingFile) {
      console.log('Found uploaded file for year-over-year comparison:', matchingFile);
      return matchingFile;
    }

    // If no uploaded file, try to get baseline data
    console.log('No uploaded file found, checking baseline data for:', targetMonth, targetWeek);
    
    try {
      const baselineData = await this.dataService.getBaselineData(
        this.provinceName,
        this.fileData.commodityDisplay
      );

      if (baselineData) {
        console.log('Found baseline data for year-over-year comparison');
        // Store the target month and week for later retrieval
        (baselineData as any).targetMonth = targetMonth;
        (baselineData as any).targetWeek = targetWeek;
        return baselineData;
      }
    } catch (error) {
      console.error('Error loading baseline data:', error);
    }

    console.log('No year-over-year comparison data available');
    return null;
  }

  async findComparisonFile(period: 'week' | 'month' | 'threeMonths'): Promise<FileData | null> {
    if (!this.fileData) return null;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const currentMonthIndex = monthNames.indexOf(this.fileData.month);
    const currentWeek = this.fileData.week ? parseInt(this.fileData.week.replace('Week ', '')) : null;
    
    let targetMonth: string;
    let targetWeek: string | null = null;

    if (period === 'week') {
      // Go back 1 week
      if (currentWeek === null) return null;
      
      if (currentWeek === 1) {
        // Go to previous month, week 4
        const prevMonthIndex = (currentMonthIndex - 1 + 12) % 12;
        targetMonth = monthNames[prevMonthIndex];
        targetWeek = 'Week 4';
      } else {
        // Same month, previous week
        targetMonth = this.fileData.month;
        targetWeek = `Week ${currentWeek - 1}`;
      }
    } else if (period === 'month') {
      // Go back 1 month
      const prevMonthIndex = (currentMonthIndex - 1 + 12) % 12;
      targetMonth = monthNames[prevMonthIndex];
      
      if (currentWeek !== null) {
        // Same week in previous month
        targetWeek = `Week ${currentWeek}`;
      }
    } else {
      // Go back 3 months
      const prevMonthIndex = (currentMonthIndex - 3 + 12) % 12;
      targetMonth = monthNames[prevMonthIndex];
      
      if (currentWeek !== null) {
        // Same week in 3 months ago
        targetWeek = `Week ${currentWeek}`;
      }
    }

    // Get all files for this province and commodity
    const allFiles = await this.dataService.getFilesByProvince(this.provinceName);
    
    // Find exact match
    const matchingFile = allFiles.find(f => {
      const commodityMatch = f.commodityDisplay === this.fileData!.commodityDisplay;
      const monthMatch = f.month === targetMonth;
      const weekMatch = targetWeek === null ? 
        (!f.week || f.week === '') : 
        f.week === targetWeek;
      
      return commodityMatch && monthMatch && weekMatch;
    });

    return matchingFile || null;
  }

  needsWeekComparison(): boolean {
    // Isabela and Cagayan need week comparison
    return this.provinceName === 'isabela' || this.provinceName === 'cagayan';
  }

  getPriceFromComparison(productName: string, productUnit: string, categoryName: string, comparisonFile: FileData | BaselineData | null | undefined): number | null {
    if (!comparisonFile) return null;

    // Check if this is baseline data
    if ('year' in comparisonFile && comparisonFile.year === 2025) {
      return this.getPriceFromBaseline(productName, productUnit, comparisonFile as BaselineData);
    }

    // Regular file data
    const fileData = comparisonFile as FileData;
    const category = fileData.categories.find(c => c.name === categoryName);
    if (!category) return null;

    const product = category.products.find(p => 
      p.name === productName && p.unit === productUnit
    );
    return product?.prevailingPrice ?? null;
  }

  getPriceFromBaseline(productName: string, productUnit: string, baselineData: BaselineData): number | null {
    if (!this.fileData) return null;

    // Find the product in baseline data
    const baselineProduct = baselineData.products.find(p => 
      p.productName === productName && p.unit === productUnit
    );

    if (!baselineProduct) return null;

    // Get the target month from the baseline data (stored during findYearOverYearComparison)
    const targetMonth = (baselineData as any).targetMonth;
    const targetWeek = (baselineData as any).targetWeek;

    if (!targetMonth) {
      console.error('Target month not found in baseline data');
      return null;
    }

    const needsWeekly = this.needsWeekComparison();

    if (needsWeekly && targetWeek) {
      // Get price for specific week
      const monthPrices = baselineProduct.prices[targetMonth];
      
      if (monthPrices && typeof monthPrices === 'object' && targetWeek in monthPrices) {
        return monthPrices[targetWeek] ?? null;
      }
    } else {
      // Get monthly price
      const price = baselineProduct.prices[targetMonth];
      
      if (typeof price === 'number') {
        return price;
      }
    }

    return null;
  }

  calculatePriceDifference(current: number | null | undefined, previous: number | null | undefined): { peso: number, percent: number } | null {
    // Handle undefined by treating as null
    const currentPrice = current ?? null;
    const previousPrice = previous ?? null;
    
    if (currentPrice === null || previousPrice === null) return null;
    
    const peso = currentPrice - previousPrice;
    const percent = previousPrice !== 0 ? (peso / previousPrice) * 100 : 0;
    
    return { peso, percent };
  }

  formatDifference(diff: { peso: number, percent: number } | null): string {
    if (!diff) return '—';
    
    const pesoSign = diff.peso >= 0 ? '+' : '';
    const percentSign = diff.percent >= 0 ? '+' : '';
    
    return `${pesoSign}${diff.peso.toFixed(2)} (${percentSign}${diff.percent.toFixed(2)}%)`;
  }

  getDifferenceClass(diff: { peso: number, percent: number } | null): string {
    if (!diff) return '';
    if (diff.peso > 0) return 'price-increase';
    if (diff.peso < 0) return 'price-decrease';
    return 'price-same';
  }

  navigateToBaselineSetup() {
    // Navigate to baseline setup page with province and commodity info
    this.router.navigate(['/baseline-input'], {
      queryParams: {
        province: this.provinceName,
        commodity: this.fileData?.commodityDisplay
      }
    });
  }

  goBack() {
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

  formatDate(timestamp: any): string {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getPrevailingPriceLabel(): string {
    if (!this.fileData) return 'Prevailing Price';
    
    const month = this.fileData.month;
    const week = this.fileData.week;
    
    if (week && week.trim() !== '') {
      return `Prevailing Price (for ${month} - ${week})`;
    } else {
      return `Prevailing Price (for ${month})`;
    }
  }

  getComparisonColumnCount(): number {
    const needsWeek = this.needsWeekComparison();
    return needsWeek ? 3 : 2; // week, month, 3months OR month, 3months
  }
}