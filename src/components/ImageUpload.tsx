'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UploadedImage, UploadProgress } from '@/types/medical';
import { DicomProcessor, medicalImageUtils } from '@/lib/dicom-utils';
import { FileUploadManager } from '@/lib/storage';

interface ImageUploadProps {
  maxFiles?: number;
  onImagesUploaded: (images: UploadedImage[]) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  existingImages?: UploadedImage[];
}

export function ImageUpload({ 
  maxFiles = 20, 
  onImagesUploaded, 
  onError, 
  disabled = false,
  existingImages = []
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(existingImages);
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files) as File[];
    handleFiles(files);
  }, [disabled]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const files = Array.from(e.target.files || []) as File[];
    handleFiles(files);
    // Clear the input so the same file can be selected again
    e.target.value = '';
  };

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    // Check if adding these files would exceed the limit
    const totalFiles = uploadedImages.length + files.length;
    if (totalFiles > maxFiles) {
      const error = `Cannot upload more than ${maxFiles} files. You currently have ${uploadedImages.length} files.`;
      setValidationErrors(prev => [...prev, error]);
      onError?.(error);
      return;
    }

    setIsProcessing(true);
    setValidationErrors([]);

    // Validate all files first
    const validationResults: { file: File; validation: { isValid: boolean; error?: string } }[] = [];
    for (const file of files) {
      const validation = FileUploadManager.validateFile(file);
      validationResults.push({ file, validation });
    }

    // Check for validation errors
    const invalidFiles = validationResults.filter(result => !result.validation.isValid);
    if (invalidFiles.length > 0) {
      const errors = invalidFiles.map(result => result.validation.error!);
      setValidationErrors(errors);
      onError?.(errors.join(', '));
      setIsProcessing(false);
      return;
    }

    // Validate total size
    const totalSizeValidation = FileUploadManager.validateTotalSize([...files]);
    if (!totalSizeValidation.isValid) {
      setValidationErrors([totalSizeValidation.error!]);
      onError?.(totalSizeValidation.error!);
      setIsProcessing(false);
      return;
    }

    // Create progress trackers
    const progressMap = new Map<string, UploadProgress>();
    files.forEach(file => {
      progressMap.set(file.name, {
        fileId: file.name,
        fileName: file.name,
        progress: 0,
        status: 'processing'
      });
    });
    setUploadProgress(progressMap);

    // Process files
    const processedImages: UploadedImage[] = [];
    
    for (const file of files) {
      try {
        // Update progress
        progressMap.set(file.name, {
          ...progressMap.get(file.name)!,
          progress: 25,
          status: 'processing'
        });
        setUploadProgress(new Map(progressMap));

        // Check if it's a DICOM file
        const isDicom = DicomProcessor.isDicomFile(file);
        
        let processedUrl = '';
        let thumbnail = '';
        let dicomData = undefined;

        if (isDicom) {
          // Process DICOM file
          const validation = await DicomProcessor.validateDicomFile(file);
          if (!validation.isValid) {
            throw new Error(`DICOM validation failed: ${validation.errors.join(', ')}`);
          }

          // Update progress
          progressMap.set(file.name, {
            ...progressMap.get(file.name)!,
            progress: 50,
            status: 'processing'
          });
          setUploadProgress(new Map(progressMap));

          // Extract DICOM metadata
          dicomData = await DicomProcessor.parseDicomFile(file);
          
          // Convert DICOM to displayable image
          processedUrl = await DicomProcessor.dicomToImageUrl(file) || '';
          thumbnail = await DicomProcessor.createDicomThumbnail(file, 200) || '';
        } else {
          // Process regular image
          processedUrl = FileUploadManager.generateTempUrl(file);
          
          if (file.type.startsWith('image/')) {
            thumbnail = await FileUploadManager.createThumbnail(file, 200);
          }
        }

        // Update progress
        progressMap.set(file.name, {
          ...progressMap.get(file.name)!,
          progress: 90,
          status: 'processing'
        });
        setUploadProgress(new Map(progressMap));

        // Create uploaded image object
        const uploadedImage: UploadedImage = {
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          isDicom,
          uploadedAt: new Date(),
          url: processedUrl,
          thumbnail,
          dicomData: dicomData || undefined,
          processedUrl
        };

        processedImages.push(uploadedImage);

        // Complete progress
        progressMap.set(file.name, {
          ...progressMap.get(file.name)!,
          progress: 100,
          status: 'completed'
        });
        setUploadProgress(new Map(progressMap));

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        progressMap.set(file.name, {
          ...progressMap.get(file.name)!,
          progress: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        setUploadProgress(new Map(progressMap));
      }
    }

    // Update uploaded images state
    const newImages = [...uploadedImages, ...processedImages];
    setUploadedImages(newImages);
    onImagesUploaded(newImages);

    // Clear progress after a delay
    setTimeout(() => {
      setUploadProgress(new Map());
      setIsProcessing(false);
    }, 2000);
  };

  const removeImage = (imageId: string) => {
    if (disabled) return;
    
    const newImages = uploadedImages.filter(img => img.id !== imageId);
    setUploadedImages(newImages);
    onImagesUploaded(newImages);
  };

  const clearAllImages = () => {
    if (disabled) return;
    
    // Cleanup blob URLs to prevent memory leaks
    uploadedImages.forEach(image => {
      if (image.url.startsWith('blob:')) {
        URL.revokeObjectURL(image.url);
      }
      if (image.thumbnail && image.thumbnail.startsWith('blob:')) {
        URL.revokeObjectURL(image.thumbnail);
      }
    });
    
    setUploadedImages([]);
    onImagesUploaded([]);
    setValidationErrors([]);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>X-ray Images Upload</span>
          </span>
          <Badge variant="outline" className="text-xs">
            {uploadedImages.length}/{maxFiles} files
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription>
              <div className="space-y-1">
                {validationErrors.map((error, index) => (
                  <div key={index} className="text-red-700">{error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Area */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${dragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.dcm,.dicom"
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled}
          />
          
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-900">
                {dragActive ? 'Drop images here' : 'Upload X-ray Images'}
              </p>
              <p className="text-sm text-gray-500">
                Drag & drop or click to select files
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Supports JPEG, PNG, TIFF, BMP, DICOM (max 50MB per file)
              </p>
            </div>
            
            {!disabled && (
              <Button variant="outline" className="mt-2">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Browse Files
              </Button>
            )}
          </div>
        </div>

        {/* Upload Progress */}
        {uploadProgress.size > 0 && (
          <div className="space-y-2">
            {Array.from(uploadProgress.entries()).map(([fileName, progress]) => (
              <div key={fileName} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="truncate">{fileName}</span>
                  <span className={`
                    ${progress.status === 'completed' ? 'text-green-600' : ''}
                    ${progress.status === 'error' ? 'text-red-600' : ''}
                    ${progress.status === 'processing' ? 'text-blue-600' : ''}
                  `}>
                    {progress.status === 'completed' ? 'Complete' : 
                     progress.status === 'error' ? 'Error' : 
                     `${progress.progress}%`}
                  </span>
                </div>
                <Progress 
                  value={progress.progress} 
                  className={`h-2 ${
                    progress.status === 'error' ? '[&>div]:bg-red-500' :
                    progress.status === 'completed' ? '[&>div]:bg-green-500' : ''
                  }`}
                />
                {progress.error && (
                  <p className="text-xs text-red-600">{progress.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Uploaded Images Grid */}
        {uploadedImages.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-900">Uploaded Images ({uploadedImages.length})</h4>
              {!disabled && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearAllImages}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {uploadedImages.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                    {image.thumbnail || image.url ? (
                      <img
                        src={image.thumbnail || image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                      {!disabled && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeImage(image.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* File Info */}
                  <div className="mt-1 space-y-1">
                    <p className="text-xs font-medium text-gray-900 truncate" title={image.name}>
                      {image.name}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {medicalImageUtils.formatFileSize(image.size)}
                      </span>
                      {image.isDicom && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          DICOM
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Supported formats: JPEG, PNG, TIFF, BMP, and DICOM (.dcm)</p>
          <p>• Maximum {maxFiles} files, 50MB per file, 500MB total</p>
          <p>• DICOM files will be automatically processed and validated</p>
        </div>
      </CardContent>
    </Card>
  );
}