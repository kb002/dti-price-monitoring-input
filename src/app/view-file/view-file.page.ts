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
  IonButton,
  IonSpinner,
  IonToggle,
  IonSearchbar,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { DataService, FileData, BaselineData } from '../services/data.service';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { warningOutline, addCircleOutline, downloadOutline, documentTextOutline, eyeOffOutline } from 'ionicons/icons';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType } from 'docx';
import { saveAs } from 'file-saver';

interface ComparisonData {
  weekAgo?: FileData | BaselineData | null;
  monthAgo?: FileData | BaselineData | null;
  threeMonthsAgo?: FileData | BaselineData | null;
}

interface MonthSummary {
  increaseCount: number;
  decreaseCount: number;
  highestIncrease: string[];
  lowestIncrease: string[];
  highestDecrease: string[];
  lowestDecrease: string[];
  totalProducts: number;
}

interface ComparisonItem {
  name: string;
  unit: string;
  peso: number;
  percent: number;
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
    IonButton,
    IonSpinner,
    IonToggle,
    IonSearchbar
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
  
  // Search
  searchText: string = '';
  filteredCategories: any[] = [];

  // Summary Report
  showSummary: boolean = false;
  generatingSummary: boolean = false;
  summary = {
    month1: {
      increaseCount: 0,
      decreaseCount: 0,
      highestIncrease: [] as string[],
      lowestIncrease: [] as string[],
      highestDecrease: [] as string[],
      lowestDecrease: [] as string[],
      totalProducts: 0
    },
    month3: {
      increaseCount: 0,
      decreaseCount: 0,
      highestIncrease: [] as string[],
      lowestIncrease: [] as string[],
      highestDecrease: [] as string[],
      lowestDecrease: [] as string[],
      totalProducts: 0
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    // Register icons
    addIcons({ warningOutline, addCircleOutline, downloadOutline, documentTextOutline, eyeOffOutline });
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
    console.log('Toggle change event:', event);
    const isChecked = event.detail.checked;
    console.log('Toggle isChecked:', isChecked);
    this.showComparison = isChecked;
    
    if (isChecked) {
      console.log('Toggle ON - Starting comparison load');
      console.log('needsBaseline:', this.needsBaseline);
      
      // Check if baseline exists when toggling on
      if (this.needsBaseline) {
        console.log('Checking baseline...');
        await this.checkBaselineExists();
        console.log('baselineExists:', this.baselineExists);
      }
      
      // Only load comparison if baseline check passed (or not needed)
      if (!this.needsBaseline || this.baselineExists) {
        console.log('Loading comparison data...');
        if (!this.comparisonData.threeMonthsAgo) {
          await this.loadComparisonData();
          console.log('Comparison data loaded:', this.comparisonData);
        } else {
          console.log('Comparison data already exists');
        }
      } else {
        console.log('Cannot load comparison - baseline check failed');
      }
    } else {
      console.log('Toggle OFF - Hiding comparison and summary');
      // When turning off comparison, also hide summary
      this.showSummary = false;
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
    if (!this.fileData) {
      console.error('No fileData available');
      return;
    }

    console.log('=== LOADING COMPARISON DATA ===');
    console.log('Current file:', this.fileData.month, this.fileData.week);
    console.log('Province:', this.provinceName);
    console.log('Commodity:', this.fileData.commodityDisplay);

    this.loadingComparison = true;
    
    try {
      // Determine which comparisons we need based on province
      const needsWeekAgo = this.needsWeekComparison();
      console.log('Needs week comparison:', needsWeekAgo);
      
      // Load comparison files based on exact month/week
      if (needsWeekAgo) {
        console.log('Loading week ago data...');
        this.comparisonData.weekAgo = await this.findComparisonFile('week');
        console.log('Week ago data:', this.comparisonData.weekAgo ? 'FOUND' : 'NOT FOUND');
      }
      
      // For month ago comparison - check if it needs year-over-year
      if (this.needsBaseline && this.fileData.month === 'January') {
        console.log('Loading month ago (year-over-year)...');
        // January needs December from previous year
        this.comparisonData.monthAgo = await this.findYearOverYearComparison('month');
      } else {
        console.log('Loading month ago data...');
        this.comparisonData.monthAgo = await this.findComparisonFile('month');
      }
      console.log('Month ago data:', this.comparisonData.monthAgo ? 'FOUND' : 'NOT FOUND');
      
      // For 3 months ago, check if we need year-over-year comparison
      if (this.needsBaseline) {
        console.log('Loading 3 months ago (year-over-year)...');
        this.comparisonData.threeMonthsAgo = await this.findYearOverYearComparison('threeMonths');
      } else {
        console.log('Loading 3 months ago data...');
        this.comparisonData.threeMonthsAgo = await this.findComparisonFile('threeMonths');
      }
      console.log('3 months ago data:', this.comparisonData.threeMonthsAgo ? 'FOUND' : 'NOT FOUND');
      
      console.log('=== COMPARISON DATA COMPLETE ===');
      console.log('Final comparisonData:', this.comparisonData);
      
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
    if (!comparisonFile) {
      console.log('No comparison file for:', productName);
      return null;
    }

    console.log('Getting price for:', productName, '(', productUnit, ') in category:', categoryName);

    // Check if this is baseline data
    if ('year' in comparisonFile && comparisonFile.year === 2025) {
      console.log('Using baseline data');
      return this.getPriceFromBaseline(productName, productUnit, comparisonFile as BaselineData);
    }

    // Regular file data
    console.log('Using regular file data');
    const fileData = comparisonFile as FileData;
    console.log('Available categories:', fileData.categories?.map(c => c.name));
    
    const category = fileData.categories.find(c => c.name === categoryName);
    if (!category) {
      console.warn('Category not found:', categoryName, 'Available:', fileData.categories?.map(c => c.name));
      return null;
    }

    console.log('Found category, looking for product...');
    console.log('Available products in category:', category.products?.map(p => p.name + ' (' + p.unit + ')'));
    
    const product = category.products.find(p => 
      p.name === productName && p.unit === productUnit
    );
    
    if (!product) {
      console.warn('Product not found:', productName, productUnit);
      return null;
    }
    
    console.log('Found product! Prevailing price:', product.prevailingPrice);
    return product?.prevailingPrice ?? null;
  }

  getPriceFromBaseline(productName: string, productUnit: string, baselineData: BaselineData): number | null {
    if (!this.fileData) {
      console.log('No fileData available');
      return null;
    }

    console.log('=== Getting price from BASELINE ===');
    console.log('Looking for product:', productName, '(', productUnit, ')');
    console.log('Baseline products available:', baselineData.products?.length);

    // Find the product in baseline data
    const baselineProduct = baselineData.products.find(p => 
      p.productName === productName && p.unit === productUnit
    );

    if (!baselineProduct) {
      console.warn('Product not found in baseline. Looking for:', productName, productUnit);
      console.log('Available products:', baselineData.products?.map(p => p.productName + ' (' + p.unit + ')'));
      return null;
    }

    console.log('Found product in baseline:', baselineProduct.productName);

    // Get the target month from the baseline data (stored during findYearOverYearComparison)
    const targetMonth = (baselineData as any).targetMonth;
    const targetWeek = (baselineData as any).targetWeek;

    console.log('Target month:', targetMonth, 'Target week:', targetWeek);

    if (!targetMonth) {
      console.error('Target month not found in baseline data');
      return null;
    }

    const needsWeekly = this.needsWeekComparison();
    console.log('Needs weekly pricing:', needsWeekly);
    console.log('Product prices structure:', baselineProduct.prices);

    if (needsWeekly && targetWeek) {
      // Get price for specific week
      const monthPrices = baselineProduct.prices[targetMonth];
      console.log('Month prices for', targetMonth, ':', monthPrices);
      
      if (monthPrices && typeof monthPrices === 'object' && targetWeek in monthPrices) {
        const price = monthPrices[targetWeek];
        console.log('Found weekly price:', price);
        return price ?? null;
      } else {
        console.warn('Week not found in baseline. Looking for:', targetWeek, 'in', monthPrices);
      }
    } else {
      // Get monthly price
      const price = baselineProduct.prices[targetMonth];
      console.log('Monthly price for', targetMonth, ':', price);
      
      if (typeof price === 'number') {
        return price;
      } else {
        console.warn('Price is not a number:', price, 'Type:', typeof price);
      }
    }

    console.log('No price found, returning null');
    return null;
  }

  calculatePriceDifference(current: number | null | undefined, previous: number | null | undefined): { peso: number, percent: number } | null {
    // Handle undefined by treating as null
    const currentPrice = current ?? null;
    const previousPrice = previous ?? null;
    
    // Return null only if either price is actually null (missing data)
    // Allow calculation even if one price is zero, but we'll handle highlighting separately
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

  getDifferenceClass(diff: { peso: number, percent: number } | null, currentPrice?: number | null, previousPrice?: number | null): string {
    if (!diff) return '';
    
    // Don't apply highlighting if either price is zero (treat zero as "no valid data for comparison")
    if (currentPrice === 0 || previousPrice === 0) return '';
    
    if (diff.peso > 0) return 'price-increase';
    if (diff.peso < 0) return 'price-decrease';
    return 'price-same';
  }

  async toggleSummaryReport() {
    if (this.showSummary) {
      this.showSummary = false;
      return;
    }

    // Generate the summary
    this.generatingSummary = true;
    
    const loading = await this.loadingController.create({
      message: 'Generating summary report...',
    });
    await loading.present();

    try {
      await this.generateSummaryData();
      this.showSummary = true;
      this.showToast('Summary report generated successfully', 'success');
    } catch (error) {
      console.error('Error generating summary:', error);
      this.showToast('Error generating summary report', 'danger');
    } finally {
      this.generatingSummary = false;
      await loading.dismiss();
    }
  }

  async generateSummaryData() {
    if (!this.fileData || !this.showComparison) return;

    // Reset summary data
    this.summary = {
      month1: {
        increaseCount: 0,
        decreaseCount: 0,
        highestIncrease: [],
        lowestIncrease: [],
        highestDecrease: [],
        lowestDecrease: [],
        totalProducts: 0
      },
      month3: {
        increaseCount: 0,
        decreaseCount: 0,
        highestIncrease: [],
        lowestIncrease: [],
        highestDecrease: [],
        lowestDecrease: [],
        totalProducts: 0
      }
    };

    const month1Increases: ComparisonItem[] = [];
    const month1Decreases: ComparisonItem[] = [];
    const month3Increases: ComparisonItem[] = [];
    const month3Decreases: ComparisonItem[] = [];

    // Process all products
    for (const category of this.fileData.categories) {
      for (const product of category.products) {
        const currentPrice = product.prevailingPrice;
        
        // Skip if current price is null, undefined, or zero
        if (currentPrice === null || currentPrice === undefined || currentPrice === 0) continue;

        this.summary.month1.totalProducts++;
        this.summary.month3.totalProducts++;

        // 1 Month comparison
        if (this.comparisonData.monthAgo) {
          const month1Price = this.getPriceFromComparison(
            product.name,
            product.unit || '',
            category.name,
            this.comparisonData.monthAgo
          );

          // Skip if comparison price is zero
          if (month1Price === 0) continue;

          const month1Diff = this.calculatePriceDifference(currentPrice, month1Price);
          
          if (month1Diff) {
            if (month1Diff.peso > 0) {
              this.summary.month1.increaseCount++;
              month1Increases.push({
                name: product.name,
                unit: product.unit || '',
                peso: month1Diff.peso,
                percent: month1Diff.percent
              });
            } else if (month1Diff.peso < 0) {
              this.summary.month1.decreaseCount++;
              month1Decreases.push({
                name: product.name,
                unit: product.unit || '',
                peso: Math.abs(month1Diff.peso),
                percent: Math.abs(month1Diff.percent)
              });
            }
          }
        }

        // 3 Months comparison
        if (this.comparisonData.threeMonthsAgo) {
          const month3Price = this.getPriceFromComparison(
            product.name,
            product.unit || '',
            category.name,
            this.comparisonData.threeMonthsAgo
          );

          // Skip if comparison price is zero
          if (month3Price === 0) continue;

          const month3Diff = this.calculatePriceDifference(currentPrice, month3Price);
          
          if (month3Diff) {
            if (month3Diff.peso > 0) {
              this.summary.month3.increaseCount++;
              month3Increases.push({
                name: product.name,
                unit: product.unit || '',
                peso: month3Diff.peso,
                percent: month3Diff.percent
              });
            } else if (month3Diff.peso < 0) {
              this.summary.month3.decreaseCount++;
              month3Decreases.push({
                name: product.name,
                unit: product.unit || '',
                peso: Math.abs(month3Diff.peso),
                percent: Math.abs(month3Diff.percent)
              });
            }
          }
        }
      }
    }

    // Helper function to get items with ties
    const getItemsWithTies = (items: ComparisonItem[], highest: boolean, limit: number = 5): string[] => {
      if (items.length === 0) return [];
      
      // If only 1 item, return it only in lowest
      if (items.length === 1) {
        return highest ? [] : items.map(item =>
          `${item.name} (${item.unit}) - ₱${item.peso.toFixed(2)} (${item.percent.toFixed(2)}%)`
        );
      }

      const sorted = [...items].sort((a, b) => highest ? b.peso - a.peso : a.peso - b.peso);
      const result: ComparisonItem[] = [];
      
      // Get the target value (highest or lowest)
      const targetValue = sorted[Math.min(limit - 1, sorted.length - 1)].peso;
      
      // Find all items with the same value as the limit position
      for (const item of sorted) {
        if (highest) {
          // For highest: include all items >= targetValue and within reasonable range
          if (result.length < limit) {
            result.push(item);
          } else if (item.peso === sorted[limit - 1]?.peso) {
            // Include ties
            result.push(item);
          } else {
            break;
          }
        } else {
          // For lowest: include all items <= targetValue
          if (result.length < limit) {
            result.push(item);
          } else if (item.peso === sorted[limit - 1]?.peso) {
            // Include ties
            result.push(item);
          } else {
            break;
          }
        }
      }
      
      return result.map(item =>
        `${item.name} (${item.unit}) - ₱${item.peso.toFixed(2)} (${item.percent.toFixed(2)}%)`
      );
    };

    // Process 1 Month summary with tie handling
    if (month1Increases.length > 0) {
      month1Increases.sort((a, b) => b.peso - a.peso);
      this.summary.month1.highestIncrease = getItemsWithTies(month1Increases, true, 5);
      this.summary.month1.lowestIncrease = getItemsWithTies(month1Increases, false, 5);
    }

    if (month1Decreases.length > 0) {
      month1Decreases.sort((a, b) => b.peso - a.peso);
      this.summary.month1.highestDecrease = getItemsWithTies(month1Decreases, true, 5);
      this.summary.month1.lowestDecrease = getItemsWithTies(month1Decreases, false, 5);
    }

    // Process 3 Months summary with tie handling
    if (month3Increases.length > 0) {
      month3Increases.sort((a, b) => b.peso - a.peso);
      this.summary.month3.highestIncrease = getItemsWithTies(month3Increases, true, 5);
      this.summary.month3.lowestIncrease = getItemsWithTies(month3Increases, false, 5);
    }

    if (month3Decreases.length > 0) {
      month3Decreases.sort((a, b) => b.peso - a.peso);
      this.summary.month3.highestDecrease = getItemsWithTies(month3Decreases, true, 5);
      this.summary.month3.lowestDecrease = getItemsWithTies(month3Decreases, false, 5);
    }
  }

  async exportSummaryReport() {
    if (!this.showSummary || !this.fileData) {
      this.showToast('Please generate the summary report first', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Exporting summary report...',
    });
    await loading.present();

    try {
      const fileName = this.fileData.fileName.replace(/\.[^/.]+$/, '') || 'Summary_Report';
      const commodity = this.fileData.commodityDisplay;
      const month = this.fileData.month;
      const week = this.fileData.week || '';
      const fullFileName = `${fileName}_${commodity}_${month}${week ? '_' + week : ''}_Summary.docx`;

      // Helper function to create summary items
      const createSummaryItems = (items: string[]): Paragraph[] => {
        return items.map(item => 
          new Paragraph({
            text: `  • ${item}`,
            spacing: { before: 100, after: 100 }
          })
        );
      };

      // Create document sections
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Title
            new Paragraph({
              text: 'CPD PRICE TRACKER',
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: `${this.provinceName.toUpperCase()} - ${commodity}`,
              heading: HeadingLevel.HEADING_2,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            new Paragraph({
              text: `File: ${this.fileData.fileName}`,
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 }
            }),
            new Paragraph({
              text: `Month: ${month}${week ? ' - ' + week : ''}`,
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 }
            }),

            // 1 MONTH COMPARISON SUMMARY
            new Paragraph({
              children: [
              new TextRun({
                text: '1 MONTH COMPARISON SUMMARY',
                bold: true,
                underline: { type: UnderlineType.SINGLE }
              })
            ],
            spacing: { before: 400, after: 300 }
            }),

            // A. Increase (1 Month)
            new Paragraph({
              children: [
                new TextRun({
                  text: 'A. Increase',
                  bold: true,
                  size: 24
                })
              ],
              spacing: { before: 200, after: 200 }
            }),
            new Paragraph({
              text: `Total Increase: ${this.summary.month1.increaseCount}`,
              spacing: { before: 100, after: 100 }
            }),
            new Paragraph({
              text: 'Highest Increase:',
              spacing: { before: 100, after: 100 }
            }),
            ...createSummaryItems(this.summary.month1.highestIncrease.length > 0 ? this.summary.month1.highestIncrease : ['No data']),
            new Paragraph({
              text: 'Lowest Increase:',
              spacing: { before: 200, after: 100 }
            }),
            ...createSummaryItems(this.summary.month1.lowestIncrease.length > 0 ? this.summary.month1.lowestIncrease : ['No data']),

            // B. Decrease (1 Month)
            new Paragraph({
              children: [
                new TextRun({
                  text: 'B. Decrease',
                  bold: true,
                  size: 24
                })
              ],
              spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
              text: `Total Decrease: ${this.summary.month1.decreaseCount}`,
              spacing: { before: 100, after: 100 }
            }),
            new Paragraph({
              text: 'Highest Decrease:',
              spacing: { before: 100, after: 100 }
            }),
            ...createSummaryItems(this.summary.month1.highestDecrease.length > 0 ? this.summary.month1.highestDecrease : ['No data']),
            new Paragraph({
              text: 'Lowest Decrease:',
              spacing: { before: 200, after: 100 }
            }),
            ...createSummaryItems(this.summary.month1.lowestDecrease.length > 0 ? this.summary.month1.lowestDecrease : ['No data']),

            // Total Number of Products (1 Month)
            new Paragraph({
              children: [
                new TextRun({
                  text: `Total Number of Products: ${this.summary.month1.totalProducts}`,
                  bold: true,
                  size: 24
                })
              ],
              spacing: { before: 400, after: 200 }
            }),

            // 3 MONTHS COMPARISON SUMMARY
            new Paragraph({
              children: [
              new TextRun({
                text: '3 MONTHS COMPARISON SUMMARY',
                bold: true,
                underline: { type: UnderlineType.SINGLE }
              })
            ],
            spacing: { before: 800, after: 300 }
            }),

            // A. Increase (3 Months)
            new Paragraph({
              children: [
                new TextRun({
                  text: 'A. Increase',
                  bold: true,
                  size: 24
                })
              ],
              spacing: { before: 200, after: 200 }
            }),
            new Paragraph({
              text: `Total Increase: ${this.summary.month3.increaseCount}`,
              spacing: { before: 100, after: 100 }
            }),
            new Paragraph({
              text: 'Highest Increase:',
              spacing: { before: 100, after: 100 }
            }),
            ...createSummaryItems(this.summary.month3.highestIncrease.length > 0 ? this.summary.month3.highestIncrease : ['No data']),
            new Paragraph({
              text: 'Lowest Increase:',
              spacing: { before: 200, after: 100 }
            }),
            ...createSummaryItems(this.summary.month3.lowestIncrease.length > 0 ? this.summary.month3.lowestIncrease : ['No data']),

            // B. Decrease (3 Months)
            new Paragraph({
              children: [
                new TextRun({
                  text: 'B. Decrease',
                  bold: true,
                  size: 24
                })
              ],
              spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
              text: `Total Decrease: ${this.summary.month3.decreaseCount}`,
              spacing: { before: 100, after: 100 }
            }),
            new Paragraph({
              text: 'Highest Decrease:',
              spacing: { before: 100, after: 100 }
            }),
            ...createSummaryItems(this.summary.month3.highestDecrease.length > 0 ? this.summary.month3.highestDecrease : ['No data']),
            new Paragraph({
              text: 'Lowest Decrease:',
              spacing: { before: 200, after: 100 }
            }),
            ...createSummaryItems(this.summary.month3.lowestDecrease.length > 0 ? this.summary.month3.lowestDecrease : ['No data']),

            // Total Number of Products (3 Months)
            new Paragraph({
              children: [
                new TextRun({
                  text: `Total Number of Products: ${this.summary.month3.totalProducts}`,
                  bold: true,
                  size: 24
                })
              ],
              spacing: { before: 400, after: 200 }
            })
          ]
        }]
      });

      // Generate and save the document
      const blob = await Packer.toBlob(doc);
      // Give browser time to release file handle
      setTimeout(() => {
        saveAs(blob, fullFileName);
      }, 300);
      
      await loading.dismiss();
      this.showToast('Summary report exported successfully', 'success');

    } catch (error) {
      console.error('Error exporting summary report:', error);
      await loading.dismiss();
      this.showToast('Failed to export summary report', 'danger');
    }
  }

  async exportToExcel() {
    if (!this.fileData) return;

    const loading = await this.loadingController.create({
      message: 'Exporting to Excel...',
    });
    await loading.present();

    try {
      // Prepare data for Excel export
      const exportData: any[] = [];
      
      // Add file information
      exportData.push(['FILE INFORMATION']);
      exportData.push(['File Name', this.fileData.fileName]);
      exportData.push(['Commodity', this.fileData.commodityDisplay]);
      exportData.push(['Month', this.fileData.month]);
      exportData.push(['Week', this.fileData.week || '']);
      exportData.push(['Uploaded By', this.fileData.uploadedByEmail]);
      exportData.push(['Uploaded At', this.formatDate(this.fileData.uploadedAt)]);
      exportData.push([]);
      
      // Get stores array
      const stores = this.fileData.stores || [];
      
      // Build header row
      const headerRow = ['Product Name', 'Unit'];
      stores.forEach((store: string) => headerRow.push(store));
      headerRow.push('Prevailing Price');
      
      if (this.showComparison) {
        if (this.needsWeekComparison() && this.comparisonData.weekAgo) {
          headerRow.push('Prevailing Price 1 Week Ago');
          headerRow.push('Price Diff (₱)');
          headerRow.push('Price Diff (%)');
        }
        if (this.comparisonData.monthAgo) {
          headerRow.push('Prevailing Price 1 Month Ago');
          headerRow.push('Price Diff (₱)');
          headerRow.push('Price Diff (%)');
        }
        if (this.comparisonData.threeMonthsAgo) {
          headerRow.push('Prevailing Price 3 Months Ago');
          headerRow.push('Price Diff (₱)');
          headerRow.push('Price Diff (%)');
        }
      }
      
      // Add price data header
      exportData.push(['PRICE DATA']);
      exportData.push(headerRow);
      
      // Add price data rows from categories
      for (const category of this.fileData.categories) {
        // Add category header
        const categoryRow = [category.name];
        exportData.push(categoryRow);
        
        // Add products
        for (const product of category.products) {
          const productRow = [
            product.name || '',
            product.unit || ''
          ];
          
          // Add store prices
          if (product.prices && Array.isArray(product.prices)) {
            product.prices.forEach((price: number | null) => {
              productRow.push(price !== null ? price.toString() : '—');
            });
          } else {
            stores.forEach(() => productRow.push('—'));
          }
          
          // Add prevailing price
          const currentPrice: number | null = product.prevailingPrice !== null && product.prevailingPrice !== undefined 
            ? product.prevailingPrice 
            : null;
          productRow.push(currentPrice !== null ? currentPrice.toString() : '—');
          
          // Add comparison data if available
          if (this.showComparison) {
            // Week ago comparison
            if (this.needsWeekComparison() && this.comparisonData.weekAgo) {
              const weekAgoPrice = this.getPriceFromComparison(
                product.name, 
                product.unit || '', 
                category.name, 
                this.comparisonData.weekAgo
              );
              productRow.push(weekAgoPrice !== null ? weekAgoPrice.toString() : '—');
              
              const weekDiff = this.calculatePriceDifference(currentPrice, weekAgoPrice);
              if (weekDiff) {
                const pesoSign = weekDiff.peso >= 0 ? '+' : '';
                const percentSign = weekDiff.percent >= 0 ? '+' : '';
                productRow.push(`${pesoSign}${weekDiff.peso.toFixed(2)}`);
                productRow.push(`${percentSign}${weekDiff.percent.toFixed(2)}%`);
              } else {
                productRow.push('—', '—');
              }
            }
            
            // Month ago comparison
            if (this.comparisonData.monthAgo) {
              const monthAgoPrice = this.getPriceFromComparison(
                product.name, 
                product.unit || '', 
                category.name, 
                this.comparisonData.monthAgo
              );
              productRow.push(monthAgoPrice !== null ? monthAgoPrice.toString() : '—');
              
              const monthDiff = this.calculatePriceDifference(currentPrice, monthAgoPrice);
              if (monthDiff) {
                const pesoSign = monthDiff.peso >= 0 ? '+' : '';
                const percentSign = monthDiff.percent >= 0 ? '+' : '';
                productRow.push(`${pesoSign}${monthDiff.peso.toFixed(2)}`);
                productRow.push(`${percentSign}${monthDiff.percent.toFixed(2)}%`);
              } else {
                productRow.push('—', '—');
              }
            }
            
            // 3 months ago comparison
            if (this.comparisonData.threeMonthsAgo) {
              const threeMonthsPrice = this.getPriceFromComparison(
                product.name, 
                product.unit || '', 
                category.name, 
                this.comparisonData.threeMonthsAgo
              );
              productRow.push(threeMonthsPrice !== null ? threeMonthsPrice.toString() : '—');
              
              const threeMonthsDiff = this.calculatePriceDifference(currentPrice, threeMonthsPrice);
              if (threeMonthsDiff) {
                const pesoSign = threeMonthsDiff.peso >= 0 ? '+' : '';
                const percentSign = threeMonthsDiff.percent >= 0 ? '+' : '';
                productRow.push(`${pesoSign}${threeMonthsDiff.peso.toFixed(2)}`);
                productRow.push(`${percentSign}${threeMonthsDiff.percent.toFixed(2)}%`);
              } else {
                productRow.push('—', '—');
              }
            }
          }
          
          exportData.push(productRow);
        }
      }
      
      // Create workbook and worksheet
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      
      // Auto-size columns
      const colWidths = headerRow.map((_, i) => {
        const maxLength = exportData.reduce((max, row) => {
          const cellValue = row[i] ? String(row[i]) : '';
          return Math.max(max, cellValue.length);
        }, 10);
        return { wch: Math.min(maxLength + 2, 30) };
      });
      ws['!cols'] = colWidths;
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Price Data');
      
      // Generate file name
      const commodityName = this.fileData.commodityDisplay;
      const month = this.fileData.month;
      const week = this.fileData.week ? `_${this.fileData.week.replace(' ', '_')}` : '';
      const fileName = `${commodityName}_${month}${week}_${new Date().getTime()}.xlsx`;
      
      // Download the file
      XLSX.writeFile(wb, fileName);
      
      await loading.dismiss();
      this.showToast('Excel file exported successfully!', 'success');
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      await loading.dismiss();
      this.showToast('Error exporting file. Please try again.', 'danger');
    }
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

  onSearchChange(event: any) {
    this.searchText = event.target.value || '';
    this.filterCategories();
  }

  filterCategories() {
    if (!this.fileData) return;

    if (!this.searchText || this.searchText.trim() === '') {
      this.filteredCategories = this.fileData.categories;
      return;
    }

    const searchLower = this.searchText.toLowerCase().trim();
    
    this.filteredCategories = this.fileData.categories
      .map(category => {
        const filteredProducts = category.products.filter((product: any) => 
          product.name.toLowerCase().includes(searchLower) ||
          (product.unit && product.unit.toLowerCase().includes(searchLower))
        );
        
        if (filteredProducts.length > 0) {
          return {
            ...category,
            products: filteredProducts
          };
        }
        return null;
      })
      .filter(category => category !== null);
  }

  getFilteredCategories() {
    if (!this.fileData) return [];
    
    if (!this.searchText || this.searchText.trim() === '') {
      return this.fileData.categories;
    }
    
    return this.filteredCategories;
  }
}