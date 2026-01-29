import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-isabela-business',
  templateUrl: './isabela-business.page.html',
  styleUrls: ['./isabela-business.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class IsabelaBusinessPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
