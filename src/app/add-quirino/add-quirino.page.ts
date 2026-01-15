import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-add-quirino',
  templateUrl: './add-quirino.page.html',
  styleUrls: ['./add-quirino.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class AddQuirinoPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
