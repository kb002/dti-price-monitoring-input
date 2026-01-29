import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-cagayan-business',
  templateUrl: './cagayan-business.page.html',
  styleUrls: ['./cagayan-business.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class CagayanBusinessPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
