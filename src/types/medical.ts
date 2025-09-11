// Medical data type definitions for X-ray diagnostic system

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  patientId: string;
  medicalHistory: string;
  symptoms: string;
  examinationNotes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadedImage {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  isDicom: boolean;
  uploadedAt: Date;
  url: string;
  thumbnail?: string;
  dicomData?: DicomMetadata;
  processedUrl?: string;
}

export interface DicomMetadata {
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  modality?: string;
  bodyPart?: string;
  studyDescription?: string;
  seriesDescription?: string;
  instanceNumber?: number;
  rows?: number;
  columns?: number;
  pixelSpacing?: [number, number];
  windowCenter?: number;
  windowWidth?: number;
  photometricInterpretation?: string;
}

export interface AIAnalysisResult {
  id: string;
  imageId: string;
  findings: Finding[];
  impression: string;
  recommendations: string[];
  confidence: number;
  analysisDate: Date;
  processingTime: number;
}

export interface Finding {
  id: string;
  category: FindingCategory;
  description: string;
  severity: FindingSeverity;
  confidence: number;
  location?: string;
  measurements?: Measurement[];
  annotations?: Annotation[];
}

export type FindingCategory = 
  | 'fracture'
  | 'pneumonia'
  | 'pleural_effusion'
  | 'pneumothorax'
  | 'cardiomegaly'
  | 'infiltrate'
  | 'mass'
  | 'atelectasis'
  | 'consolidation'
  | 'nodule'
  | 'normal'
  | 'other';

export type FindingSeverity = 'normal' | 'mild' | 'moderate' | 'severe' | 'critical';

export interface Measurement {
  id: string;
  type: 'distance' | 'area' | 'angle';
  value: number;
  unit: string;
  coordinates: number[];
  description: string;
}

export interface Annotation {
  id: string;
  type: 'arrow' | 'circle' | 'rectangle' | 'text';
  coordinates: number[];
  text?: string;
  color: string;
}

export interface DiagnosticReport {
  id: string;
  patientId: string;
  imageIds: string[];
  clinicalHistory: string;
  findings: string;
  impression: string;
  recommendations: string[];
  radiologist: string;
  reportDate: Date;
  aiAnalysis?: AIAnalysisResult[];
  status: ReportStatus;
  priority: ReportPriority;
}

export type ReportStatus = 'draft' | 'pending_review' | 'completed' | 'revised';
export type ReportPriority = 'routine' | 'urgent' | 'stat';

export interface AnalysisSession {
  id: string;
  patientData: Patient;
  images: UploadedImage[];
  aiResults: AIAnalysisResult[];
  report?: DiagnosticReport;
  createdAt: Date;
  updatedAt: Date;
  status: 'uploading' | 'analyzing' | 'reviewing' | 'completed';
}

export interface ImageViewerSettings {
  brightness: number;
  contrast: number;
  zoom: number;
  rotation: number;
  pan: { x: number; y: number };
  windowLevel?: { center: number; width: number };
  invert: boolean;
  annotations: Annotation[];
  measurements: Measurement[];
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// API Response types
export interface UploadResponse {
  success: boolean;
  images: UploadedImage[];
  errors: string[];
}

export interface AnalysisResponse {
  success: boolean;
  results: AIAnalysisResult[];
  reportId: string;
  error?: string;
}

export interface ReportResponse {
  success: boolean;
  report: DiagnosticReport;
  pdfUrl?: string;
  error?: string;
}

// Form types for patient information
export interface PatientFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  patientId: string;
  medicalHistory: string;
  symptoms: string;
  examinationNotes: string;
}

// Configuration types
export interface AppConfig {
  maxFileSize: number;
  maxFiles: number;
  allowedFormats: string[];
  aiProvider: string;
  dicomSupported: boolean;
  securityLevel: 'basic' | 'hipaa' | 'enterprise';
}

export interface ErrorLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  context: Record<string, any>;
  userId?: string;
  sessionId: string;
}