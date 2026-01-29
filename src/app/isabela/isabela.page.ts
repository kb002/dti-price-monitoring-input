import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  AlertController,
  ActionSheetController,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { Auth } from '@angular/fire/auth';
import { DataService, FileData } from '../services/data.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-isabela',
  templateUrl: './isabela.page.html',
  styleUrls: ['./isabela.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonList,
    IonItem,
    IonLabel
  ]
})
export class IsabelaPage implements OnInit {
  userEmail: string = '';
  userId: string = '';
  files: FileData[] = [];
  loading: boolean = true;
  provinceName: string = 'isabela';
  searchQuery: string = '';
  filteredFiles: FileData[] = [];

  constructor(
    private router: Router,
    private auth: Auth,
    private dataService: DataService,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    this.userEmail = localStorage.getItem('userEmail') || '';
    this.userId = localStorage.getItem('userId') || '';
    await this.loadFiles();
  }

  // This Ionic lifecycle hook runs every time the page is about to enter view
  async ionViewWillEnter() {
    // Reload files every time user navigates back to this page
    await this.loadFiles();
  }

  async loadFiles() {
    this.loading = true;
    try {
      // Using DataService instead of direct Firestore calls
      this.files = await this.dataService.getFilesByProvince(this.provinceName);
      this.filteredFiles = [...this.files];
      console.log('Files loaded:', this.files);
    } catch (error) {
      console.error('Error loading files:', error);
      await this.showToast('Error loading files', 'danger');
    } finally {
      this.loading = false;
    }
  }

  onSearchChange() {
    if (!this.searchQuery.trim()) {
      this.filteredFiles = [...this.files];
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    
    this.filteredFiles = this.files.filter(file => {
      // Search in file name
      const fileNameMatch = file.fileName.toLowerCase().includes(query);
      
      // Search in owner email
      const ownerMatch = file.uploadedByEmail?.toLowerCase().includes(query);
      
      // Search in commodity
      const commodityMatch = file.commodityDisplay?.toLowerCase().includes(query);
      
      // Search in month
      const monthMatch = file.month?.toLowerCase().includes(query);
      
      // Search in week
      const weekMatch = file.week?.toLowerCase().includes(query);
      
      return fileNameMatch || ownerMatch || commodityMatch || monthMatch || weekMatch;
    });
  }

  clearSearch() {
    this.searchQuery = '';
    this.filteredFiles = [...this.files];
  }

  async confirmLogout() {
    const alert = await this.alertController.create({
      header: 'Confirm Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          role: 'confirm',
          cssClass: 'danger',
          handler: () => {
            this.logout();
          }
        }
      ]
    });

    await alert.present();
  }

  async logout() {
    try {
      await this.auth.signOut();
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userProvince');
      localStorage.removeItem('userId');
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  generateNewFile() {
    // Navigate to file upload page
    this.router.navigate(['/add-isabela']);
  }

  async openFileOptions(file: FileData) {
    const isOwner = file.uploadedBy === this.userId;
    
    const buttons: any[] = [
      {
        text: 'View',
        icon: 'eye-outline',
        handler: () => {
          this.viewFile(file);
        }
      }
    ];

    if (isOwner) {
      buttons.push({
        text: 'Edit',
        icon: 'create-outline',
        handler: () => {
          this.editFile(file);
        }
      });
      buttons.push({
        text: 'Delete',
        icon: 'trash-outline',
        role: 'destructive',
        handler: () => {
          this.confirmDeleteFile(file);
        }
      });
    }

    buttons.push({
      text: 'Cancel',
      icon: 'close',
      role: 'cancel'
    });

    const actionSheet = await this.actionSheetController.create({
      header: file.fileName,
      buttons: buttons
    });

    await actionSheet.present();
  }

  viewFile(file: FileData) {
    // Navigate to view file page with province name and file ID
    this.router.navigate(['/view-file', this.provinceName, file.id]);
  }

  editFile(file: FileData) {
    // Navigate to edit page with province name and file ID
    this.router.navigate(['/edit-file', this.provinceName, file.id]);
  }

  async confirmDeleteFile(file: FileData) {
    const alert = await this.alertController.create({
      header: 'Delete File',
      message: `Are you sure you want to delete "${file.fileName}"? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          cssClass: 'danger',
          handler: async () => {
            await this.deleteFile(file);
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteFile(file: FileData) {
    const loading = await this.loadingController.create({
      message: 'Deleting file...',
    });
    await loading.present();

    try {
      // Use DataService to delete the file
      await this.dataService.deleteFile(this.provinceName, file.id);
      
      // Reload files after deletion
      await this.loadFiles();
      
      await loading.dismiss();
      await this.showToast('File deleted successfully', 'success');
    } catch (error) {
      await loading.dismiss();
      console.error('Error deleting file:', error);
      await this.showToast('Failed to delete file. Please try again.', 'danger');
    }
  }

  async loadComparisonData(file: FileData): Promise<{
    weekAgo?: FileData | null;
    monthAgo?: FileData | null;
    threeMonthsAgo?: FileData | null;
  }> {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const currentMonthIndex = monthNames.indexOf(file.month);
    const allFiles = await this.dataService.getFilesByProvince(this.provinceName);
    
    let weekAgo = null;
    
    // Find 1 week ago (only if current file has a week)
    if (file.week) {
      const weekMatch = file.week.match(/Week (\d+)/);
      if (weekMatch) {
        const currentWeek = parseInt(weekMatch[1]);
        
        if (currentWeek > 1) {
          // Look for previous week in same month
          const prevWeekName = `Week ${currentWeek - 1}`;
          weekAgo = allFiles.find(f => 
            f.commodityDisplay === file.commodityDisplay &&
            f.month === file.month &&
            f.week === prevWeekName
          );
        } else {
          // Look for last week of previous month (Week 4)
          const prevMonthIndex = (currentMonthIndex - 1 + 12) % 12;
          const prevMonth = monthNames[prevMonthIndex];
          weekAgo = allFiles.find(f => 
            f.commodityDisplay === file.commodityDisplay &&
            f.month === prevMonth &&
            f.week === 'Week 4'
          );
        }
      }
    }
    
    // Find 1 month ago
    const prevMonthIndex = (currentMonthIndex - 1 + 12) % 12;
    const prevMonth = monthNames[prevMonthIndex];
    const monthAgo = allFiles.find(f => 
      f.commodityDisplay === file.commodityDisplay &&
      f.month === prevMonth &&
      (!file.week || !f.week || f.week === file.week)
    );
    
    // Find 3 months ago
    const threeMonthsIndex = (currentMonthIndex - 3 + 12) % 12;
    const threeMonthsMonth = monthNames[threeMonthsIndex];
    const threeMonthsAgo = allFiles.find(f => 
      f.commodityDisplay === file.commodityDisplay &&
      f.month === threeMonthsMonth &&
      (!file.week || !f.week || f.week === file.week)
    );
    
    return { weekAgo, monthAgo, threeMonthsAgo };
  }

  generateMainSheetData(file: FileData, comparisonData: any): any[][] {
    const data: any[][] = [];
    
    // Title and Info rows
    data.push([`Price Comparison Report`]);
    data.push([`Province: Isabela`]);
    data.push([`Commodity: ${file.commodityDisplay}`]);
    data.push([`Month: ${file.month}`]);
    if (file.week) {
      data.push([`Week: ${file.week}`]);
    }
    data.push([`File Name: ${file.fileName}`]);
    data.push([`Generated: ${new Date().toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`]);
    data.push([]); // Empty row
    
    // Header row
    const headers = ['Product Name', 'Unit', ...file.stores, 'Prevailing Price'];
    
    if (comparisonData.weekAgo) {
      headers.push('Prevailing Price (1 Week Ago)', 'Price Difference');
    }
    if (comparisonData.monthAgo) {
      headers.push('Prevailing Price (1 Month Ago)', 'Price Difference');
    }
    if (comparisonData.threeMonthsAgo) {
      headers.push('Prevailing Price (3 Months Ago)', 'Price Difference');
    }
    
    data.push(headers);
    
    // Data rows
    file.categories.forEach(category => {
      // Category header
      data.push([category.name]);
      
      category.products.forEach(product => {
        const row: any[] = [
          product.name,
          product.unit || '—'
        ];
        
        // Store prices
        file.stores.forEach((store, index) => {
          const price = product.prices[index];
          row.push(price !== null && price !== undefined ? price : '—');
        });
        
        // Prevailing price
        row.push(product.prevailingPrice !== null ? product.prevailingPrice : '—');
        
        // 1 Week Ago comparison
        if (comparisonData.weekAgo) {
          const prevPrice = this.getPriceFromComparisonFile(
            product.name, 
            product.unit || '', 
            category.name, 
            comparisonData.weekAgo
          );
          row.push(prevPrice !== null ? prevPrice : '—');
          
          const currentPrice = product.prevailingPrice ?? null;
          const diff = this.calculateDifference(currentPrice, prevPrice);
          row.push(diff);
        }
        
        // 1 Month Ago comparison
        if (comparisonData.monthAgo) {
          const prevPrice = this.getPriceFromComparisonFile(
            product.name, 
            product.unit || '', 
            category.name, 
            comparisonData.monthAgo
          );
          row.push(prevPrice !== null ? prevPrice : '—');
          
          const currentPrice = product.prevailingPrice ?? null;
          const diff = this.calculateDifference(currentPrice, prevPrice);
          row.push(diff);
        }
        
        // 3 Months Ago comparison
        if (comparisonData.threeMonthsAgo) {
          const prevPrice = this.getPriceFromComparisonFile(
            product.name, 
            product.unit || '', 
            category.name, 
            comparisonData.threeMonthsAgo
          );
          row.push(prevPrice !== null ? prevPrice : '—');
          
          const currentPrice = product.prevailingPrice ?? null;
          const diff = this.calculateDifference(currentPrice, prevPrice);
          row.push(diff);
        }
        
        data.push(row);
      });
      
      // Empty row after category
      data.push([]);
    });
    
    return data;
  }

  getPriceFromComparisonFile(productName: string, productUnit: string, categoryName: string, comparisonFile: FileData | null): number | null {
    if (!comparisonFile) return null;

    const category = comparisonFile.categories.find(c => c.name === categoryName);
    if (!category) return null;

    const product = category.products.find(p => 
      p.name === productName && p.unit === productUnit
    );
    return product?.prevailingPrice ?? null;
  }

  calculateDifference(current: number | null, previous: number | null): string {
    if (current === null || previous === null) return '—';
    
    const peso = current - previous;
    const percent = previous !== 0 ? (peso / previous) * 100 : 0;
    
    const pesoSign = peso >= 0 ? '+' : '';
    const percentSign = percent >= 0 ? '+' : '';
    
    return `${pesoSign}${peso.toFixed(2)} (${percentSign}${percent.toFixed(2)}%)`;
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
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
  }
}