import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-add-cagayan',
  templateUrl: './add-cagayan.page.html',
  styleUrls: ['./add-cagayan.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class AddCagayanPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
