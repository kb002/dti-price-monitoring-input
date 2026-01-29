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

@Component({
  selector: 'app-nueva-business',
  templateUrl: './nueva-business.page.html',
  styleUrls: ['./nueva-business.page.scss'],
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
export class NuevaBusinessPage implements OnInit {
  userEmail: string = '';
  userId: string = '';
  establishmentName: string = '';
  files: FileData[] = [];
  loading: boolean = true;
  provinceName: string = 'nueva_vizcaya';
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
    this.establishmentName = localStorage.getItem('establishmentName') || '';
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
      // Load ALL files from the province
      const allFiles = await this.dataService.getFilesByProvince(this.provinceName);
      
      // Filter to show ONLY files created by this business owner
      this.files = allFiles.filter(file => file.uploadedBy === this.userId);
      
      this.filteredFiles = [...this.files];
      console.log('Business owner files loaded:', this.files.length);
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
      
      // Search in commodity
      const commodityMatch = file.commodityDisplay?.toLowerCase().includes(query);
      
      // Search in month
      const monthMatch = file.month?.toLowerCase().includes(query);
      
      // Search in week
      const weekMatch = file.week?.toLowerCase().includes(query);
      
      return fileNameMatch || commodityMatch || monthMatch || weekMatch;
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
      localStorage.removeItem('userRole');
      localStorage.removeItem('establishmentName');
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  generateNewFile() {
    // Navigate to file upload page for business owners
    this.router.navigate(['/add-nueva-business']);
  }

  async openFileOptions(file: FileData) {
    // Business owners can only see their own files, so they always have full access
    const buttons: any[] = [
      {
        text: 'View',
        icon: 'eye-outline',
        handler: () => {
          this.viewFile(file);
        }
      },
      {
        text: 'Edit',
        icon: 'create-outline',
        handler: () => {
          this.editFile(file);
        }
      },
      {
        text: 'Delete',
        icon: 'trash-outline',
        role: 'destructive',
        handler: () => {
          this.confirmDeleteFile(file);
        }
      },
      {
        text: 'Cancel',
        icon: 'close',
        role: 'cancel'
      }
    ];

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
    // Navigate to edit page for business owners
    this.router.navigate(['/edit-file-business', this.provinceName, file.id]);
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