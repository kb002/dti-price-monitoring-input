import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  AlertController
} from '@ionic/angular/standalone';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-quirino',
  templateUrl: './quirino.page.html',
  styleUrls: ['./quirino.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon
  ]
})
export class QuirinoPage implements OnInit {
  userEmail: string = '';
  provinceName: string = 'Quirino';

  constructor(
    private router: Router,
    private auth: Auth,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.userEmail = localStorage.getItem('userEmail') || '';
  }

  async confirmLogout() {
    const alert = await this.alertController.create({
      header: 'Confirm Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Logout cancelled');
          }
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
}