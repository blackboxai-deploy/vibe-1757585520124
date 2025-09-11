// DICOM file processing utilities for medical imaging
import * as dicomParser from 'dicom-parser';
import { DicomMetadata, UploadedImage, ValidationResult } from '@/types/medical';

export class DicomProcessor {
  /**
   * Check if a file is in DICOM format
   */
  static isDicomFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.dcm') || 
           file.name.toLowerCase().endsWith('.dicom') ||
           file.type === 'application/dicom';
  }

  /**
   * Parse DICOM file and extract metadata
   */
  static async parseDicomFile(file: File): Promise<DicomMetadata | null> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Parse the DICOM file
      const dataSet = dicomParser.parseDicom(uint8Array);
      
      return this.extractMetadata(dataSet);
    } catch (error) {
      console.error('Error parsing DICOM file:', error);
      return null;
    }
  }

  /**
   * Extract relevant metadata from parsed DICOM dataset
   */
  private static extractMetadata(dataSet: any): DicomMetadata {
    const getString = (tag: string): string | undefined => {
      try {
        return dataSet.string(tag);
      } catch {
        return undefined;
      }
    };

    const getNumber = (tag: string): number | undefined => {
      try {
        const value = dataSet.string(tag);
        return value ? parseFloat(value) : undefined;
      } catch {
        return undefined;
      }
    };

    const getNumbers = (tag: string): [number, number] | undefined => {
      try {
        const value = dataSet.string(tag);
        if (value) {
          const numbers = value.split('\\').map(parseFloat);
          return numbers.length >= 2 ? [numbers[0], numbers[1]] : undefined;
        }
      } catch {
        return undefined;
      }
    };

    return {
      patientName: getString('x00100010'),
      patientId: getString('x00100020'),
      studyDate: getString('x00080020'),
      modality: getString('x00080060'),
      bodyPart: getString('x00180015'),
      studyDescription: getString('x00081030'),
      seriesDescription: getString('x0008103e'),
      instanceNumber: getNumber('x00200013'),
      rows: getNumber('x00280010'),
      columns: getNumber('x00280011'),
      pixelSpacing: getNumbers('x00280030'),
      windowCenter: getNumber('x00281050'),
      windowWidth: getNumber('x00281051'),
      photometricInterpretation: getString('x00280004'),
    };
  }

  /**
   * Convert DICOM image data to displayable format
   */
  static async dicomToImageUrl(file: File): Promise<string | null> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Parse the DICOM file
      const dataSet = dicomParser.parseDicom(uint8Array);
      
      // Extract pixel data
      const pixelDataElement = dataSet.elements.x7fe00010;
      if (!pixelDataElement) {
        throw new Error('No pixel data found in DICOM file');
      }

      // Get image dimensions
      const rows = parseInt(dataSet.string('x00280010') || '0');
      const columns = parseInt(dataSet.string('x00280011') || '0');
      const bitsAllocated = parseInt(dataSet.string('x00280100') || '16');
      
      if (rows === 0 || columns === 0) {
        throw new Error('Invalid image dimensions');
      }

      // Create canvas for image conversion
      const canvas = document.createElement('canvas');
      canvas.width = columns;
      canvas.height = rows;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Extract pixel data based on bits allocated
      const pixelData = this.extractPixelData(uint8Array, pixelDataElement, bitsAllocated);
      
      // Apply windowing if available
      const windowCenter = parseFloat(dataSet.string('x00281050') || '0');
      const windowWidth = parseFloat(dataSet.string('x00281051') || '0');
      
      // Convert pixel data to ImageData
      const imageData = ctx.createImageData(columns, rows);
      this.applyWindowingAndConvert(pixelData, imageData, windowCenter, windowWidth);
      
      // Put image data on canvas
      ctx.putImageData(imageData, 0, 0);
      
      // Convert canvas to blob URL
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error converting DICOM to image:', error);
      return null;
    }
  }

  /**
   * Extract pixel data from DICOM file
   */
  private static extractPixelData(uint8Array: Uint8Array, pixelDataElement: any, bitsAllocated: number): Uint16Array | Uint8Array {
    const offset = pixelDataElement.dataOffset;
    const length = pixelDataElement.length;
    
    if (bitsAllocated === 16) {
      return new Uint16Array(uint8Array.buffer, offset, length / 2);
    } else {
      return new Uint8Array(uint8Array.buffer, offset, length);
    }
  }

  /**
   * Apply windowing and convert to RGB
   */
  private static applyWindowingAndConvert(
    pixelData: Uint16Array | Uint8Array,
    imageData: ImageData,
    windowCenter: number,
    windowWidth: number
  ): void {
    const data = imageData.data;
    const pixelCount = pixelData.length;
    
    // Auto-calculate window level if not provided
    if (windowWidth === 0) {
      const minMax = this.findMinMax(pixelData);
      windowCenter = (minMax.max + minMax.min) / 2;
      windowWidth = minMax.max - minMax.min;
    }

    const windowLow = windowCenter - windowWidth / 2;
    const windowHigh = windowCenter + windowWidth / 2;

    for (let i = 0; i < pixelCount; i++) {
      let pixelValue = pixelData[i];
      
      // Apply windowing
      if (pixelValue <= windowLow) {
        pixelValue = 0;
      } else if (pixelValue >= windowHigh) {
        pixelValue = 255;
      } else {
        pixelValue = ((pixelValue - windowLow) / windowWidth) * 255;
      }

      // Convert to RGB (grayscale)
      const dataIndex = i * 4;
      data[dataIndex] = pixelValue;     // Red
      data[dataIndex + 1] = pixelValue; // Green
      data[dataIndex + 2] = pixelValue; // Blue
      data[dataIndex + 3] = 255;        // Alpha
    }
  }

  /**
   * Find min and max values in pixel data
   */
  private static findMinMax(pixelData: Uint16Array | Uint8Array): { min: number; max: number } {
    let min = pixelData[0];
    let max = pixelData[0];
    
    for (let i = 1; i < pixelData.length; i++) {
      if (pixelData[i] < min) min = pixelData[i];
      if (pixelData[i] > max) max = pixelData[i];
    }
    
    return { min, max };
  }

  /**
   * Validate DICOM file structure and content
   */
  static async validateDicomFile(file: File): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check file size
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        errors.push('DICOM file is too large (>100MB)');
      }

      // Check if it's actually a DICOM file
      if (!this.isDicomFile(file)) {
        errors.push('File does not appear to be in DICOM format');
        return { isValid: false, errors, warnings };
      }

      // Try to parse the file
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const dataSet = dicomParser.parseDicom(uint8Array);
      
      // Check for required elements
      if (!dataSet.string('x00280010') || !dataSet.string('x00280011')) {
        errors.push('Missing required image dimensions');
      }

      if (!dataSet.elements.x7fe00010) {
        errors.push('Missing pixel data');
      }

      // Check modality
      const modality = dataSet.string('x00080060');
      if (modality && !['CR', 'DX', 'CT', 'MR', 'XA'].includes(modality)) {
        warnings.push(`Unusual modality: ${modality}. This may not be an X-ray image.`);
      }

      // Check photometric interpretation
      const photoInt = dataSet.string('x00280004');
      if (photoInt && !['MONOCHROME1', 'MONOCHROME2'].includes(photoInt)) {
        warnings.push('Color images may not be properly displayed');
      }

    } catch (error) {
      errors.push(`Failed to parse DICOM file: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create a thumbnail from DICOM file
   */
  static async createDicomThumbnail(file: File, maxSize: number = 200): Promise<string | null> {
    try {
      const imageUrl = await this.dicomToImageUrl(file);
      if (!imageUrl) return null;

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve(null);
            return;
          }

          // Calculate thumbnail dimensions
          const aspectRatio = img.width / img.height;
          let thumbnailWidth = maxSize;
          let thumbnailHeight = maxSize;

          if (aspectRatio > 1) {
            thumbnailHeight = maxSize / aspectRatio;
          } else {
            thumbnailWidth = maxSize * aspectRatio;
          }

          canvas.width = thumbnailWidth;
          canvas.height = thumbnailHeight;

          // Draw thumbnail
          ctx.drawImage(img, 0, 0, thumbnailWidth, thumbnailHeight);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        
        img.onerror = () => resolve(null);
        img.src = imageUrl;
      });
    } catch (error) {
      console.error('Error creating DICOM thumbnail:', error);
      return null;
    }
  }
}

/**
 * Utility functions for medical image processing
 */
export const medicalImageUtils = {
  /**
   * Check if a file is a supported medical image format
   */
  isSupportedMedicalImage(file: File): boolean {
    const supportedTypes = [
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/bmp',
      'application/dicom'
    ];
    
    const supportedExtensions = [
      '.jpg', '.jpeg', '.png', '.tiff', '.tif', 
      '.bmp', '.dcm', '.dicom'
    ];

    return supportedTypes.includes(file.type) || 
           supportedExtensions.some(ext => 
             file.name.toLowerCase().endsWith(ext)
           );
  },

  /**
   * Get human-readable file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Extract patient information from filename (if following naming convention)
   */
  extractPatientInfoFromFilename(filename: string): Partial<{ patientId: string; studyDate: string }> {
    const info: Partial<{ patientId: string; studyDate: string }> = {};
    
    // Try to extract patient ID (assuming format like "PATIENT123_20240101_XRAY.dcm")
    const patientIdMatch = filename.match(/PATIENT(\w+)/i) || filename.match(/(\d{6,})/);
    if (patientIdMatch) {
      info.patientId = patientIdMatch[1];
    }

    // Try to extract date (YYYYMMDD format)
    const dateMatch = filename.match(/(\d{8})/);
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      info.studyDate = `${year}-${month}-${day}`;
    }

    return info;
  }
};