import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  ActionSheetController
} from '@ionic/angular/standalone';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, getDocs, query, orderBy } from '@angular/fire/firestore';

@Component({
  selector: 'app-isabela',
  templateUrl: './isabela.page.html',
  styleUrls: ['./isabela.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
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
  files: any[] = [];
  loading: boolean = true;

  constructor(
    private router: Router,
    private auth: Auth,
    private firestore: Firestore,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController
  ) {}

  async ngOnInit() {
    this.userEmail = localStorage.getItem('userEmail') || '';
    this.userId = localStorage.getItem('userId') || '';
    await this.loadFiles();
  }

  async loadFiles() {
    this.loading = true;
    try {
      const filesRef = collection(this.firestore, 'provinces/isabela/files');
      const q = query(filesRef, orderBy('uploadedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      this.files = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      this.loading = false;
    }
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

  async openFileOptions(file: any) {
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

  viewFile(file: any) {
    // Open file URL in new tab or implement file viewer
    window.open(file.fileUrl, '_blank');
  }

  editFile(file: any) {
    // Navigate to edit page (to be created)
    this.router.navigate(['/edit-file', file.id]);
  }

  async confirmDeleteFile(file: any) {
    const alert = await this.alertController.create({
      header: 'Delete File',
      message: `Are you sure you want to delete "${file.fileName}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.deleteFile(file);
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteFile(file: any) {
    // Implement file deletion (to be added)
    console.log('Deleting file:', file);
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