import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-batanes-business',
  templateUrl: './batanes-business.page.html',
  styleUrls: ['./batanes-business.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class BatanesBusinessPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
