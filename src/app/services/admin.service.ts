import { Injectable } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

export interface FileData {
  id: string;
  province: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: any;
  fileUrl?: string;
  month?: string;
  week?: string;
  commodityDisplay?: string;
  commodity?: string;
  categories?: any[];
  stores?: string[];
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private provinces = ['cagayan', 'isabela', 'nueva_vizcaya', 'quirino', 'batanes'];

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {}

  async isAdmin(): Promise<boolean> {
    const user = this.auth.currentUser;
    if (!user) return false;

    try {
      // CHANGED FROM 'admins' TO 'admin' to match your Firestore collection
      const adminDocRef = doc(this.firestore, 'admin', user.uid);
      const adminDoc = await getDoc(adminDocRef);
      
      console.log('Admin check - Doc exists:', adminDoc.exists());
      console.log('Admin check - Data:', adminDoc.data());
      
      // User is admin if document exists in admin collection
      return adminDoc.exists();
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  async getAllFiles(): Promise<FileData[]> {
    const allFiles: FileData[] = [];

    try {
      for (const province of this.provinces) {
        const filesRef = collection(this.firestore, `provinces/${province}/files`);
        const snapshot = await getDocs(filesRef);
        
        snapshot.forEach(docSnap => {
          allFiles.push({
            id: docSnap.id,
            province: province,
            ...docSnap.data() as any
          });
        });
      }
      
      allFiles.sort((a, b) => {
        const dateA = a.uploadedAt?.toDate?.() || new Date(0);
        const dateB = b.uploadedAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      return allFiles;
    } catch (error) {
      console.error('Error fetching all files:', error);
      return [];
    }
  }
}