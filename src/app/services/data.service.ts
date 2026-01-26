import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  deleteDoc,
  updateDoc,
  setDoc,
  Timestamp 
} from '@angular/fire/firestore';

export interface Product {
  id: string;
  name: string;
  unit?: string;
  prices: { [storeIndex: number]: number | null };
  prevailingPrice?: number | null;
  createdAt?: Timestamp;
}

export interface ProductCategory {
  id: string;
  name: string;
  products: Product[];
  createdAt?: Timestamp;
}

export interface FileData {
  id: string;
  fileName: string;
  commodity: string;
  commodityDisplay: string;
  month: string;
  week: string | null;
  stores: string[];
  categories: ProductCategory[];
  uploadedBy: string;
  uploadedByEmail: string;
  uploadedAt: Timestamp;
  province: string;
  lastModified: Timestamp;
  isCustomCommodity: boolean;
  timePeriod?: {
    month: string;
    week: string | null;
    year: number;
    timestamp: Timestamp;
  };
}

// Baseline data interfaces
export interface BaselineProductPrice {
  productId: string;
  productName: string;
  unit: string;
  prices: {
    [month: string]: number | { [week: string]: number };
  };
}

export interface BaselineData {
  commodity: string;
  commodityDisplay: string;
  province: string;
  year: number;
  products: BaselineProductPrice[];
  createdAt: Timestamp;
  lastModified: Timestamp;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(private firestore: Firestore) { }

  /**
   * Get all files for a specific province
   */
  async getFilesByProvince(provinceName: string): Promise<FileData[]> {
    try {
      const filesRef = collection(this.firestore, `provinces/${provinceName}/files`);
      const q = query(filesRef, orderBy('uploadedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const files: FileData[] = [];
      snapshot.forEach(doc => {
        files.push({
          id: doc.id,
          ...doc.data()
        } as FileData);
      });
      
      return files;
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }
  }

  /**
   * Get a single file by ID
   */
  async getFileById(provinceName: string, fileId: string): Promise<FileData | null> {
    try {
      const fileRef = doc(this.firestore, `provinces/${provinceName}/files/${fileId}`);
      const fileDoc = await getDoc(fileRef);
      
      if (fileDoc.exists()) {
        return {
          id: fileDoc.id,
          ...fileDoc.data()
        } as FileData;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching file:', error);
      throw error;
    }
  }

  /**
   * Update a file by ID
   */
  async updateFile(provinceName: string, fileId: string, updateData: Partial<FileData>): Promise<void> {
    try {
      const fileRef = doc(this.firestore, `provinces/${provinceName}/files/${fileId}`);
      
      const dataToUpdate = {
        ...updateData,
        lastModified: Timestamp.now()
      };
      
      await updateDoc(fileRef, dataToUpdate);
      console.log(`File ${fileId} updated successfully in ${provinceName}`);
    } catch (error) {
      console.error('Error updating file:', error);
      throw error;
    }
  }

  /**
   * Delete a file by ID
   */
  async deleteFile(provinceName: string, fileId: string): Promise<void> {
    try {
      const fileRef = doc(this.firestore, `provinces/${provinceName}/files/${fileId}`);
      await deleteDoc(fileRef);
      console.log(`File ${fileId} deleted successfully from ${provinceName}`);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Get files filtered by commodity
   */
  async getFilesByCommodity(provinceName: string, commodity: string): Promise<FileData[]> {
    try {
      const filesRef = collection(this.firestore, `provinces/${provinceName}/files`);
      const q = query(
        filesRef, 
        where('commodity', '==', commodity),
        orderBy('uploadedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const files: FileData[] = [];
      snapshot.forEach(doc => {
        files.push({
          id: doc.id,
          ...doc.data()
        } as FileData);
      });
      
      return files;
    } catch (error) {
      console.error('Error fetching files by commodity:', error);
      throw error;
    }
  }

  /**
   * Get files filtered by month
   */
  async getFilesByMonth(provinceName: string, month: string): Promise<FileData[]> {
    try {
      const filesRef = collection(this.firestore, `provinces/${provinceName}/files`);
      const q = query(
        filesRef, 
        where('month', '==', month),
        orderBy('uploadedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const files: FileData[] = [];
      snapshot.forEach(doc => {
        files.push({
          id: doc.id,
          ...doc.data()
        } as FileData);
      });
      
      return files;
    } catch (error) {
      console.error('Error fetching files by month:', error);
      throw error;
    }
  }

  /**
   * Get files filtered by month and week
   */
  async getFilesByMonthAndWeek(
    provinceName: string, 
    month: string, 
    week: string
  ): Promise<FileData[]> {
    try {
      const filesRef = collection(this.firestore, `provinces/${provinceName}/files`);
      const q = query(
        filesRef, 
        where('month', '==', month),
        where('week', '==', week),
        orderBy('uploadedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const files: FileData[] = [];
      snapshot.forEach(doc => {
        files.push({
          id: doc.id,
          ...doc.data()
        } as FileData);
      });
      
      return files;
    } catch (error) {
      console.error('Error fetching files by month and week:', error);
      throw error;
    }
  }

  /**
   * Search files by name
   */
  async searchFilesByName(provinceName: string, searchTerm: string): Promise<FileData[]> {
    try {
      const allFiles = await this.getFilesByProvince(provinceName);
      
      const searchLower = searchTerm.toLowerCase();
      return allFiles.filter(file => 
        file.fileName.toLowerCase().includes(searchLower) ||
        file.commodityDisplay.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      console.error('Error searching files:', error);
      throw error;
    }
  }

  /**
   * Get all unique commodities for a province
   */
  async getCommoditiesForProvince(provinceName: string): Promise<string[]> {
    try {
      const files = await this.getFilesByProvince(provinceName);
      const commodities = new Set<string>();
      
      files.forEach(file => {
        commodities.add(file.commodityDisplay);
      });
      
      return Array.from(commodities).sort();
    } catch (error) {
      console.error('Error fetching commodities:', error);
      throw error;
    }
  }

  /**
   * Get all unique months for a province
   */
  async getMonthsForProvince(provinceName: string): Promise<string[]> {
    try {
      const files = await this.getFilesByProvince(provinceName);
      const months = new Set<string>();
      
      files.forEach(file => {
        months.add(file.month);
      });
      
      return Array.from(months);
    } catch (error) {
      console.error('Error fetching months:', error);
      throw error;
    }
  }

  /**
   * Get files uploaded by a specific user
   */
  async getFilesByUser(provinceName: string, userId: string): Promise<FileData[]> {
    try {
      const filesRef = collection(this.firestore, `provinces/${provinceName}/files`);
      const q = query(
        filesRef, 
        where('uploadedBy', '==', userId),
        orderBy('uploadedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const files: FileData[] = [];
      snapshot.forEach(doc => {
        files.push({
          id: doc.id,
          ...doc.data()
        } as FileData);
      });
      
      return files;
    } catch (error) {
      console.error('Error fetching files by user:', error);
      throw error;
    }
  }

  /**
   * Get recent files (limit to N files)
   */
  async getRecentFiles(provinceName: string, limit: number = 10): Promise<FileData[]> {
    try {
      const allFiles = await this.getFilesByProvince(provinceName);
      return allFiles.slice(0, limit);
    } catch (error) {
      console.error('Error fetching recent files:', error);
      throw error;
    }
  }

  /**
   * Get files for comparison purposes
   */
  async getFilesForComparison(
    provinceName: string, 
    commodityDisplay: string,
    targetDate: Date,
    rangeDays: number = 15
  ): Promise<FileData[]> {
    try {
      const allFiles = await this.getFilesByProvince(provinceName);
      
      const commodityFiles = allFiles.filter(f => 
        f.commodityDisplay === commodityDisplay
      );

      const startDate = new Date(targetDate);
      startDate.setDate(startDate.getDate() - rangeDays);
      
      const endDate = new Date(targetDate);
      endDate.setDate(endDate.getDate() + rangeDays);

      const filesInRange = commodityFiles.filter(file => {
        const fileDate = this.parseFileDate(file.month, file.week || undefined);
        return fileDate >= startDate && fileDate <= endDate;
      });

      return filesInRange;
    } catch (error) {
      console.error('Error fetching files for comparison:', error);
      throw error;
    }
  }

  /**
   * Helper method to parse file date from month and week
   */
  parseFileDate(month: string, week?: string, year?: number): Date {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIndex = monthNames.indexOf(month);
    const useYear = year || 2026;
    
    const date = new Date(useYear, monthIndex, 1);
    
    if (week) {
      const weekMatch = week.match(/Week (\d+)/);
      if (weekMatch) {
        const weekNum = parseInt(weekMatch[1]);
        date.setDate((weekNum - 1) * 7 + 1);
      }
    }
    
    return date;
  }

  /**
   * Get closest file to a target date
   */
  async getClosestFile(
    provinceName: string,
    commodityDisplay: string,
    targetDate: Date,
    maxDaysDifference: number = 30
  ): Promise<FileData | null> {
    try {
      const candidateFiles = await this.getFilesForComparison(
        provinceName, 
        commodityDisplay, 
        targetDate, 
        maxDaysDifference
      );

      if (candidateFiles.length === 0) {
        return null;
      }

      let closestFile: FileData | null = null;
      let smallestDiff = Infinity;

      for (const file of candidateFiles) {
        const fileDate = this.parseFileDate(file.month, file.week || undefined);
        const diff = Math.abs(fileDate.getTime() - targetDate.getTime());
        
        if (diff < smallestDiff) {
          smallestDiff = diff;
          closestFile = file;
        }
      }

      return closestFile;
    } catch (error) {
      console.error('Error getting closest file:', error);
      throw error;
    }
  }

  /**
   * Get comparison files for a given file
   */
  async getComparisonFiles(
    provinceName: string,
    currentFile: FileData
  ): Promise<{
    weekAgo: FileData | null;
    monthAgo: FileData | null;
    threeMonthsAgo: FileData | null;
  }> {
    try {
      const currentDate = this.parseFileDate(currentFile.month, currentFile.week || undefined);
      
      const weekAgoDate = new Date(currentDate);
      weekAgoDate.setDate(weekAgoDate.getDate() - 7);
      
      const monthAgoDate = new Date(currentDate);
      monthAgoDate.setMonth(monthAgoDate.getMonth() - 1);
      
      const threeMonthsAgoDate = new Date(currentDate);
      threeMonthsAgoDate.setMonth(threeMonthsAgoDate.getMonth() - 3);

      const [weekAgo, monthAgo, threeMonthsAgo] = await Promise.all([
        this.getClosestFile(provinceName, currentFile.commodityDisplay, weekAgoDate, 10),
        this.getClosestFile(provinceName, currentFile.commodityDisplay, monthAgoDate, 15),
        this.getClosestFile(provinceName, currentFile.commodityDisplay, threeMonthsAgoDate, 20)
      ]);

      return {
        weekAgo,
        monthAgo,
        threeMonthsAgo
      };
    } catch (error) {
      console.error('Error getting comparison files:', error);
      throw error;
    }
  }

  // ==================== BASELINE DATA METHODS ====================

  /**
   * SMART CHECK: Check if we have year-over-year comparison data
   * For Jan-Mar files, checks Oct-Dec of previous year in BOTH files AND baseline
   * This makes the system future-proof - works for 2026, 2027, 2028, etc.
   */
  async checkYearOverYearDataExists(
    provinceName: string, 
    commodityDisplay: string,
    currentMonth: string,
    currentWeek: string | null,
    needsWeekly: boolean
  ): Promise<boolean> {
    try {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      // Only check for Jan-Mar files
      const needsBaselineMonths = ['January', 'February', 'March'];
      if (!needsBaselineMonths.includes(currentMonth)) {
        return true; // Not Jan-Mar, no baseline needed
      }

      console.log('📅 Checking year-over-year data for', commodityDisplay, currentMonth);

      // Check for Oct-Dec files from previous year in regular files
      const requiredMonths = ['October', 'November', 'December'];
      const allFiles = await this.getFilesByProvince(provinceName);
      
      let hasAllMonths = true;
      
      for (const month of requiredMonths) {
        if (needsWeekly) {
          // For weekly provinces, need all 4 weeks for each month
          for (let week = 1; week <= 4; week++) {
            const found = allFiles.some(f => 
              f.commodityDisplay === commodityDisplay &&
              f.month === month &&
              f.week === `Week ${week}`
            );
            if (!found) {
              console.log(`  ✗ Missing: ${month} Week ${week}`);
              hasAllMonths = false;
              break;
            }
          }
        } else {
          // For monthly provinces, just need the month
          const found = allFiles.some(f => 
            f.commodityDisplay === commodityDisplay &&
            f.month === month &&
            (!f.week || f.week === '')
          );
          if (!found) {
            console.log(`  ✗ Missing: ${month}`);
            hasAllMonths = false;
            break;
          }
        }
        if (!hasAllMonths) break;
      }

      // If we found all required files, return true
      if (hasAllMonths) {
        console.log('  ✓ Found all Oct-Dec data in regular files!');
        return true;
      }

      // Otherwise, check for baseline data
      console.log('  ℹ Oct-Dec data not in files, checking baseline...');
      const baselineExists = await this.checkBaselineExists(provinceName, commodityDisplay);
      
      if (baselineExists) {
        console.log('  ✓ Found baseline data!');
      } else {
        console.log('  ✗ No baseline data found');
      }
      
      return baselineExists;
      
    } catch (error) {
      console.error('Error checking year-over-year data:', error);
      return false;
    }
  }

  /**
   * Check if baseline data exists for a commodity
   */
  async checkBaselineExists(provinceName: string, commodityDisplay: string): Promise<boolean> {
    try {
      const baselineRef = doc(
        this.firestore, 
        `provinces/${provinceName}/baseline/2025_${commodityDisplay.replace(/\s+/g, '_')}`
      );
      const baselineDoc = await getDoc(baselineRef);
      return baselineDoc.exists();
    } catch (error) {
      console.error('Error checking baseline:', error);
      return false;
    }
  }

  /**
   * Get baseline template from existing 2026 files
   */
  async getBaselineTemplate(provinceName: string, commodityDisplay: string): Promise<ProductCategory[]> {
    try {
      const allFiles = await this.getFilesByProvince(provinceName);
      const templateFile = allFiles.find(f => f.commodityDisplay === commodityDisplay);
      
      if (!templateFile) {
        throw new Error(`No template found for commodity: ${commodityDisplay}`);
      }

      return templateFile.categories.map(category => ({
        ...category,
        products: category.products.map(product => ({
          ...product,
          prices: {},
          prevailingPrice: null
        }))
      }));
    } catch (error) {
      console.error('Error getting baseline template:', error);
      throw error;
    }
  }

  /**
   * Save baseline data for a commodity
   */
  async saveBaselineData(
    provinceName: string,
    commodityDisplay: string,
    baselineData: BaselineData
  ): Promise<void> {
    try {
      const docId = `2025_${commodityDisplay.replace(/\s+/g, '_')}`;
      const baselineRef = doc(this.firestore, `provinces/${provinceName}/baseline/${docId}`);
      
      await setDoc(baselineRef, {
        ...baselineData,
        lastModified: Timestamp.now()
      });
      
      console.log(`Baseline data saved for ${commodityDisplay} in ${provinceName}`);
    } catch (error) {
      console.error('Error saving baseline data:', error);
      throw error;
    }
  }

  /**
   * Get baseline data for a commodity
   */
  async getBaselineData(provinceName: string, commodityDisplay: string): Promise<BaselineData | null> {
    try {
      const docId = `2025_${commodityDisplay.replace(/\s+/g, '_')}`;
      const baselineRef = doc(this.firestore, `provinces/${provinceName}/baseline/${docId}`);
      const baselineDoc = await getDoc(baselineRef);
      
      if (baselineDoc.exists()) {
        return baselineDoc.data() as BaselineData;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting baseline data:', error);
      throw error;
    }
  }

  /**
   * Get all baseline commodities for a province
   */
  async getBaselineCommodities(provinceName: string): Promise<string[]> {
    try {
      const baselineRef = collection(this.firestore, `provinces/${provinceName}/baseline`);
      const snapshot = await getDocs(baselineRef);
      
      const commodities: string[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as BaselineData;
        commodities.push(data.commodityDisplay);
      });
      
      return commodities;
    } catch (error) {
      console.error('Error getting baseline commodities:', error);
      throw error;
    }
  }

  /**
   * Delete baseline data for a commodity
   */
  async deleteBaselineData(provinceName: string, commodityDisplay: string): Promise<void> {
    try {
      const docId = `2025_${commodityDisplay.replace(/\s+/g, '_')}`;
      const baselineRef = doc(this.firestore, `provinces/${provinceName}/baseline/${docId}`);
      await deleteDoc(baselineRef);
      console.log(`Baseline data deleted for ${commodityDisplay} in ${provinceName}`);
    } catch (error) {
      console.error('Error deleting baseline data:', error);
      throw error;
    }
  }
}