import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-quirino-business',
  templateUrl: './quirino-business.page.html',
  styleUrls: ['./quirino-business.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class QuirinoBusinessPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
