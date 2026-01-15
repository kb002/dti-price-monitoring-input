import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-add-isabela',
  templateUrl: './add-isabela.page.html',
  styleUrls: ['./add-isabela.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class AddIsabelaPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
