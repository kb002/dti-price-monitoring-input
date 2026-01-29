import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService, FileData } from '../../services/admin.service';
import { FormsModule } from '@angular/forms';
import { Auth, signOut } from '@angular/fire/auth';
import { Firestore, doc, deleteDoc } from '@angular/fire/firestore';
import { AlertController, IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class AdminPage implements OnInit {
  allFiles: FileData[] = [];
  filteredFiles: FileData[] = [];
  
  currentUser: any = null;
  loading = true;
  selectedProvince: string = 'all';
  selectedFileId: string | null = null;
  
  provinces = [
    { value: 'all', label: 'All Provinces' },
    { value: 'cagayan', label: 'Cagayan' },
    { value: 'isabela', label: 'Isabela' },
    { value: 'nueva_vizcaya', label: 'Nueva Vizcaya' },
    { value: 'quirino', label: 'Quirino' },
    { value: 'batanes', label: 'Batanes' }
  ];

  constructor(
    private adminService: AdminService,
    private router: Router,
    private auth: Auth,
    private firestore: Firestore,
    private alertController: AlertController
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    this.selectedFileId = null;
  }

  async ngOnInit() {
    const isAdmin = await this.adminService.isAdmin();
    if (!isAdmin) {
      alert('Access denied. Admin privileges required.');
      this.router.navigate(['/login']);
      return;
    }

    this.currentUser = this.auth.currentUser;
    await this.loadFiles();
  }

  async loadFiles() {
    this.loading = true;
    try {
      this.allFiles = await this.adminService.getAllFiles();
      this.filterFiles();
    } catch (error) {
      console.error('Error loading files:', error);
      alert('Error loading files. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  onProvinceChange(event: any) {
    this.selectedProvince = event.target.value;
    this.filterFiles();
  }

  filterFiles() {
    if (this.selectedProvince === 'all') {
      this.filteredFiles = this.allFiles;
    } else {
      this.filteredFiles = this.allFiles.filter(f => f.province === this.selectedProvince);
    }
  }

  toggleMenu(fileId: string) {
    event?.stopPropagation();
    this.selectedFileId = this.selectedFileId === fileId ? null : fileId;
  }

  closeMenu() {
    this.selectedFileId = null;
  }

  getSelectedFile(): FileData {
    return this.filteredFiles.find(f => f.id === this.selectedFileId) || this.filteredFiles[0];
  }

  getSelectedFileName(): string {
    const file = this.getSelectedFile();
    return file?.fileName || '';
  }

  editFile(file: FileData) {
    this.closeMenu();
    this.router.navigate(['/edit-file', file.province, file.id]);
  }

  formatProvinceName(province: string): string {
    if (province === 'all') return 'All Provinces';
    return province.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate?.();
      if (!date) return 'N/A';
      
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'N/A';
    }
  }

  viewFile(file: FileData) {
    this.closeMenu();
    this.router.navigate(['/view-file', file.province, file.id]);
  }

  async deleteFile(file: FileData) {
    this.closeMenu();
    
    const confirmed = confirm(`Are you sure you want to delete "${file.fileName}"?`);
    if (!confirmed) return;

    try {
      const fileRef = doc(this.firestore, `provinces/${file.province}/files/${file.id}`);
      await deleteDoc(fileRef);
      
      alert('File deleted successfully');
      await this.loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error deleting file. Please try again.');
    }
  }

async confirmLogout() {
    const alert = await this.alertController.create({
      header: 'Confirm Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'CANCEL',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'LOGOUT',
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
      await signOut(this.auth);
      localStorage.clear();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }
}