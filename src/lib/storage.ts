// Secure storage utilities for medical file management
import { UploadedImage, AnalysisSession } from '@/types/medical';

export class SecureStorage {
  private static readonly STORAGE_PREFIX = 'radiology_';
  private static readonly MAX_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  /**
   * Generate a secure session ID
   */
  static generateSessionId(): string {
    const timestamp = Date.now();
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const randomString = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `${this.STORAGE_PREFIX}${timestamp}_${randomString}`;
  }

  /**
   * Store uploaded images in session storage with encryption
   */
  static async storeImages(sessionId: string, images: UploadedImage[]): Promise<void> {
    try {
      const sessionData = this.getSessionData(sessionId) || this.createNewSession(sessionId);
      
      // Add images to session
      sessionData.images = [...sessionData.images, ...images];
      sessionData.updatedAt = new Date();

      // Encrypt and store
      const encryptedData = await this.encryptData(JSON.stringify(sessionData));
      sessionStorage.setItem(sessionId, encryptedData);
      
      // Update session index
      this.updateSessionIndex(sessionId);
    } catch (error) {
      console.error('Error storing images:', error);
      throw new Error('Failed to store images securely');
    }
  }

  /**
   * Retrieve images from session storage
   */
  static async retrieveImages(sessionId: string): Promise<UploadedImage[]> {
    try {
      const sessionData = this.getSessionData(sessionId);
      return sessionData?.images || [];
    } catch (error) {
      console.error('Error retrieving images:', error);
      return [];
    }
  }

  /**
   * Store analysis session data
   */
  static async storeSession(session: AnalysisSession): Promise<void> {
    try {
      const encryptedData = await this.encryptData(JSON.stringify(session));
      sessionStorage.setItem(session.id, encryptedData);
      this.updateSessionIndex(session.id);
    } catch (error) {
      console.error('Error storing session:', error);
      throw new Error('Failed to store session data');
    }
  }

  /**
   * Retrieve analysis session data
   */
  static getSessionData(sessionId: string): AnalysisSession | null {
    try {
      const encryptedData = sessionStorage.getItem(sessionId);
      if (!encryptedData) return null;

      const decryptedData = this.decryptData(encryptedData);
      const sessionData: AnalysisSession = JSON.parse(decryptedData);
      
      // Check if session is expired
      const now = new Date();
      const sessionAge = now.getTime() - new Date(sessionData.createdAt).getTime();
      
      if (sessionAge > this.MAX_SESSION_DURATION) {
        this.deleteSession(sessionId);
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error('Error retrieving session:', error);
      return null;
    }
  }

  /**
   * Create a new analysis session
   */
  private static createNewSession(sessionId: string): AnalysisSession {
    return {
      id: sessionId,
      patientData: {
        id: '',
        firstName: '',
        lastName: '',
        dateOfBirth: new Date(),
        gender: 'other',
        patientId: '',
        medicalHistory: '',
        symptoms: '',
        examinationNotes: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      images: [],
      aiResults: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'uploading'
    };
  }

  /**
   * Delete a session and cleanup associated data
   */
  static deleteSession(sessionId: string): void {
    try {
      // Remove session data
      sessionStorage.removeItem(sessionId);
      
      // Update session index
      const index = this.getSessionIndex();
      const updatedIndex = index.filter(id => id !== sessionId);
      localStorage.setItem(`${this.STORAGE_PREFIX}index`, JSON.stringify(updatedIndex));
      
      // Cleanup any associated blob URLs
      this.cleanupBlobUrls(sessionId);
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }

  /**
   * Update session index for cleanup tracking
   */
  private static updateSessionIndex(sessionId: string): void {
    try {
      const index = this.getSessionIndex();
      if (!index.includes(sessionId)) {
        index.push(sessionId);
        localStorage.setItem(`${this.STORAGE_PREFIX}index`, JSON.stringify(index));
      }
    } catch (error) {
      console.error('Error updating session index:', error);
    }
  }

  /**
   * Get list of active sessions
   */
  private static getSessionIndex(): string[] {
    try {
      const indexData = localStorage.getItem(`${this.STORAGE_PREFIX}index`);
      return indexData ? JSON.parse(indexData) : [];
    } catch (error) {
      console.error('Error reading session index:', error);
      return [];
    }
  }

  /**
   * Cleanup expired sessions
   */
  static cleanupExpiredSessions(): void {
    try {
      const index = this.getSessionIndex();
      const now = new Date();
      
      const activeSessionIds: string[] = [];
      
      index.forEach(sessionId => {
        const sessionData = this.getSessionData(sessionId);
        if (sessionData) {
          const sessionAge = now.getTime() - new Date(sessionData.createdAt).getTime();
          if (sessionAge <= this.MAX_SESSION_DURATION) {
            activeSessionIds.push(sessionId);
          } else {
            this.deleteSession(sessionId);
          }
        }
      });
      
      // Update index with only active sessions
      localStorage.setItem(`${this.STORAGE_PREFIX}index`, JSON.stringify(activeSessionIds));
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }

  /**
   * Simple encryption for sensitive data (Note: In production, use proper encryption)
   */
  private static async encryptData(data: string): Promise<string> {
    // For demo purposes, using base64 encoding
    // In production, implement proper AES encryption
    return btoa(data);
  }

  /**
   * Simple decryption for sensitive data
   */
  private static decryptData(encryptedData: string): string {
    // For demo purposes, using base64 decoding
    // In production, implement proper AES decryption
    return atob(encryptedData);
  }

  /**
   * Cleanup blob URLs associated with a session
   */
  private static cleanupBlobUrls(sessionId: string): void {
    try {
      const sessionData = this.getSessionData(sessionId);
      if (sessionData) {
        sessionData.images.forEach(image => {
          if (image.url.startsWith('blob:')) {
            URL.revokeObjectURL(image.url);
          }
          if (image.thumbnail && image.thumbnail.startsWith('blob:')) {
            URL.revokeObjectURL(image.thumbnail);
          }
        });
      }
    } catch (error) {
      console.error('Error cleaning up blob URLs:', error);
    }
  }

  /**
   * Get storage usage statistics
   */
  static getStorageStats(): { 
    totalSessions: number; 
    totalImages: number; 
    estimatedSize: string;
    oldestSession: Date | null;
  } {
    try {
      const index = this.getSessionIndex();
      let totalImages = 0;
      let estimatedSize = 0;
      let oldestSession: Date | null = null;
      
      index.forEach(sessionId => {
        const sessionData = this.getSessionData(sessionId);
        if (sessionData) {
          totalImages += sessionData.images.length;
          sessionData.images.forEach(image => {
            estimatedSize += image.size;
          });
          
          const sessionDate = new Date(sessionData.createdAt);
          if (!oldestSession || sessionDate < oldestSession) {
            oldestSession = sessionDate;
          }
        }
      });
      
      return {
        totalSessions: index.length,
        totalImages,
        estimatedSize: this.formatBytes(estimatedSize),
        oldestSession
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalSessions: 0,
        totalImages: 0,
        estimatedSize: '0 bytes',
        oldestSession: null
      };
    }
  }

  /**
   * Format bytes to human readable string
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 bytes';
    
    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Initialize cleanup interval
   */
  static initializeCleanup(): void {
    // Run initial cleanup
    this.cleanupExpiredSessions();
    
    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Clear all session data (for user logout or reset)
   */
  static clearAllSessions(): void {
    try {
      const index = this.getSessionIndex();
      
      // Delete all sessions
      index.forEach(sessionId => {
        this.deleteSession(sessionId);
      });
      
      // Clear the index
      localStorage.removeItem(`${this.STORAGE_PREFIX}index`);
    } catch (error) {
      console.error('Error clearing all sessions:', error);
    }
  }
}

/**
 * File upload utilities
 */
export class FileUploadManager {
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB
  private static readonly SUPPORTED_TYPES = [
    'image/jpeg',
    'image/png', 
    'image/tiff',
    'image/bmp',
    'application/dicom'
  ];

  /**
   * Validate file before upload
   */
  static validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File "${file.name}" is too large. Maximum size is 50MB.`
      };
    }

    // Check file type
    const isValidType = this.SUPPORTED_TYPES.includes(file.type) ||
                       file.name.toLowerCase().match(/\.(dcm|dicom)$/);
                       
    if (!isValidType) {
      return {
        isValid: false,
        error: `File "${file.name}" is not a supported format.`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate total upload size
   */
  static validateTotalSize(files: File[]): { isValid: boolean; error?: string } {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    if (totalSize > this.MAX_TOTAL_SIZE) {
      return {
        isValid: false,
        error: `Total file size exceeds 500MB limit.`
      };
    }

    return { isValid: true };
  }

  /**
   * Create file upload progress tracker
   */
  static createProgressTracker(files: File[]): Map<string, { progress: number; status: string }> {
    const tracker = new Map();
    
    files.forEach(file => {
      tracker.set(file.name, {
        progress: 0,
        status: 'pending'
      });
    });

    return tracker;
  }

  /**
   * Generate secure temporary URL for file
   */
  static generateTempUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Create thumbnail for image file
   */
  static async createThumbnail(file: File, maxSize: number = 200): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File is not an image'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate dimensions
        const aspectRatio = img.width / img.height;
        let width = maxSize;
        let height = maxSize;

        if (aspectRatio > 1) {
          height = maxSize / aspectRatio;
        } else {
          width = maxSize * aspectRatio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw thumbnail
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }
}

// Initialize storage cleanup on module load
if (typeof window !== 'undefined') {
  SecureStorage.initializeCleanup();
}