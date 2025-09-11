'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { UploadedImage, ImageViewerSettings } from '@/types/medical';

interface ImageViewerProps {
  images: UploadedImage[];
  currentImageIndex?: number;
  onImageChange?: (index: number) => void;
  className?: string;
}

export function ImageViewer({ 
  images, 
  currentImageIndex = 0, 
  onImageChange, 
  className = "" 
}: ImageViewerProps) {
  const [settings, setSettings] = useState<ImageViewerSettings>({
    brightness: 100,
    contrast: 100,
    zoom: 100,
    rotation: 0,
    pan: { x: 0, y: 0 },
    invert: false,
    annotations: [],
    measurements: []
  });
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentImage = images[currentImageIndex];

  // Load and display image on canvas
  useEffect(() => {
    if (currentImage && canvasRef.current) {
      loadImageToCanvas();
    }
  }, [currentImage, settings]);

  const loadImageToCanvas = async () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx || !currentImage) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas size
      canvas.width = img.width;
      canvas.height = img.height;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply image transformations
      ctx.save();
      
      // Apply pan
      ctx.translate(settings.pan.x, settings.pan.y);
      
      // Apply zoom and rotation from center
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(settings.zoom / 100, settings.zoom / 100);
      ctx.rotate((settings.rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      // Apply filters
      const filters: string[] = [];
      if (settings.brightness !== 100) {
        filters.push(`brightness(${settings.brightness}%)`);
      }
      if (settings.contrast !== 100) {
        filters.push(`contrast(${settings.contrast}%)`);
      }
      if (settings.invert) {
        filters.push('invert(1)');
      }
      
      if (filters.length > 0) {
        ctx.filter = filters.join(' ');
      }

      // Draw image
      ctx.drawImage(img, 0, 0);
      
      ctx.restore();
    };

    img.src = currentImage.thumbnail || currentImage.url;
  };

  const handleZoomIn = () => {
    setSettings(prev => ({ ...prev, zoom: Math.min(prev.zoom + 25, 500) }));
  };

  const handleZoomOut = () => {
    setSettings(prev => ({ ...prev, zoom: Math.max(prev.zoom - 25, 25) }));
  };

  const handleRotate = () => {
    setSettings(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360 }));
  };

  const handleReset = () => {
    setSettings({
      brightness: 100,
      contrast: 100,
      zoom: 100,
      rotation: 0,
      pan: { x: 0, y: 0 },
      invert: false,
      annotations: [],
      measurements: []
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - settings.pan.x, y: e.clientY - settings.pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setSettings(prev => ({
      ...prev,
      pan: {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!onImageChange) return;
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : images.length - 1;
    } else {
      newIndex = currentImageIndex < images.length - 1 ? currentImageIndex + 1 : 0;
    }
    
    onImageChange(newIndex);
    handleReset();
  };

  if (!currentImage) {
    return (
      <Card className={`w-full h-96 ${className}`}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium">No images to display</p>
            <p className="text-sm">Upload X-ray images to begin analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div ref={containerRef} className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <CardHeader className="border-b">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Medical Image Viewer</span>
            {currentImage.isDicom && (
              <Badge variant="secondary" className="text-xs">DICOM</Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {currentImageIndex + 1} of {images.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l4 4m8-4h4m0 0v4m0-4l-4 4M4 16v4m0 0h4m-4 0l4-4m8 4l4-4m0 0h-4m4 0v-4" />
              </svg>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      {/* Image Display Area */}
      <CardContent className="p-0">
        <div className="relative bg-gray-900 overflow-hidden" style={{ height: '500px' }}>
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full mx-auto cursor-grab active:cursor-grabbing"
            style={{ 
              cursor: isDragging ? 'grabbing' : 'grab',
              objectFit: 'contain',
              filter: settings.invert ? 'invert(1)' : 'none'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          
          {/* Image Navigation */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                onClick={() => navigateImage('prev')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                onClick={() => navigateImage('next')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </>
          )}
          
          {/* Image Info Overlay */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded text-sm">
            <p className="font-medium">{currentImage.name}</p>
            <p className="text-xs opacity-75">
              {Math.round(currentImage.size / 1024)} KB • Zoom: {settings.zoom}%
            </p>
          </div>
        </div>
      </CardContent>

      {/* Controls */}
      <div className="border-t bg-gray-50 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Zoom and Navigation */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Navigation & Zoom</h4>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </Button>
              <div className="flex-1 px-3">
                <Slider
                  value={[settings.zoom]}
                  onValueChange={([zoom]) => setSettings(prev => ({ ...prev, zoom }))}
                  min={25}
                  max={500}
                  step={25}
                  className="w-full"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleRotate}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Rotate
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSettings(prev => ({ ...prev, invert: !prev.invert }))}
                className={settings.invert ? 'bg-blue-100' : ''}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Invert
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleReset}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </Button>
            </div>
          </div>

          {/* Brightness Control */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Brightness</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Brightness</span>
                <span className="text-sm font-medium">{settings.brightness}%</span>
              </div>
              <Slider
                value={[settings.brightness]}
                onValueChange={([brightness]) => setSettings(prev => ({ ...prev, brightness }))}
                min={0}
                max={200}
                step={5}
                className="w-full"
              />
            </div>
          </div>

          {/* Contrast Control */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Contrast</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Contrast</span>
                <span className="text-sm font-medium">{settings.contrast}%</span>
              </div>
              <Slider
                value={[settings.contrast]}
                onValueChange={([contrast]) => setSettings(prev => ({ ...prev, contrast }))}
                min={0}
                max={200}
                step={5}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* DICOM Metadata Display */}
        {currentImage.isDicom && currentImage.dicomData && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-3">DICOM Metadata</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {currentImage.dicomData.patientName && (
                <div>
                  <span className="font-medium text-gray-600">Patient:</span>
                  <p className="text-gray-900">{currentImage.dicomData.patientName}</p>
                </div>
              )}
              {currentImage.dicomData.modality && (
                <div>
                  <span className="font-medium text-gray-600">Modality:</span>
                  <p className="text-gray-900">{currentImage.dicomData.modality}</p>
                </div>
              )}
              {currentImage.dicomData.studyDate && (
                <div>
                  <span className="font-medium text-gray-600">Study Date:</span>
                  <p className="text-gray-900">{currentImage.dicomData.studyDate}</p>
                </div>
              )}
              {currentImage.dicomData.bodyPart && (
                <div>
                  <span className="font-medium text-gray-600">Body Part:</span>
                  <p className="text-gray-900">{currentImage.dicomData.bodyPart}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}