'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PatientForm } from '@/components/PatientForm';
import { ImageUpload } from '@/components/ImageUpload';
import { ImageViewer } from '@/components/ImageViewer';
import { ReportViewer } from '@/components/ReportViewer';
import { UploadedImage, PatientFormData, AnalysisSession, AIAnalysisResult } from '@/types/medical';
import { SecureStorage } from '@/lib/storage';

export default function DashboardPage() {
  const [currentStep, setCurrentStep] = useState<'patient' | 'upload' | 'analyze' | 'report'>('patient');
  const [sessionId] = useState(() => SecureStorage.generateSessionId());
  const [patientData, setPatientData] = useState<PatientFormData | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AIAnalysisResult[] | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handlePatientSubmit = async (data: PatientFormData) => {
    try {
      setPatientData(data);
      
      // Save patient data to session
      const session: AnalysisSession = {
        id: sessionId,
        patientData: {
          id: sessionId,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          patientId: data.patientId,
          medicalHistory: data.medicalHistory,
          symptoms: data.symptoms,
          examinationNotes: data.examinationNotes,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        images: uploadedImages,
        aiResults: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'uploading'
      };

      await SecureStorage.storeSession(session);
      setCurrentStep('upload');
      setError(null);
    } catch (error) {
      console.error('Error saving patient data:', error);
      setError('Failed to save patient information. Please try again.');
    }
  };

  const handleImagesUploaded = async (images: UploadedImage[]) => {
    try {
      setUploadedImages(images);
      
      // Update session with images
      if (patientData) {
        const session: AnalysisSession = {
          id: sessionId,
          patientData: {
            id: sessionId,
            firstName: patientData.firstName,
            lastName: patientData.lastName,
            dateOfBirth: new Date(patientData.dateOfBirth),
            gender: patientData.gender,
            patientId: patientData.patientId,
            medicalHistory: patientData.medicalHistory,
            symptoms: patientData.symptoms,
            examinationNotes: patientData.examinationNotes,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          images,
          aiResults: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'analyzing'
        };

        await SecureStorage.storeSession(session);
      }
      
      setError(null);
    } catch (error) {
      console.error('Error saving images:', error);
      setError('Failed to save uploaded images. Please try again.');
    }
  };

  const handleStartAnalysis = async () => {
    if (!patientData || uploadedImages.length === 0) {
      setError('Please complete patient information and upload at least one image.');
      return;
    }

    setIsAnalyzing(true);
    setCurrentStep('analyze');
    setError(null);

    try {
      // Prepare form data for API call
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('patientData', JSON.stringify(patientData));
      
      // Add all images to form data
      uploadedImages.forEach((image, index) => {
        formData.append(`image_${index}`, image.file);
      });

      // Call AI analysis API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const results = await response.json();
      setAnalysisResults(results);
      setCurrentStep('report');
      
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetSession = () => {
    setCurrentStep('patient');
    setPatientData(null);
    setUploadedImages([]);
    setAnalysisResults(null);
    setError(null);
    SecureStorage.deleteSession(sessionId);
  };

  const getStepNumber = (step: string) => {
    const steps = ['patient', 'upload', 'analyze', 'report'];
    return steps.indexOf(step) + 1;
  };

  const isStepCompleted = (step: string) => {
    switch (step) {
      case 'patient': return patientData !== null;
      case 'upload': return uploadedImages.length > 0;
      case 'analyze': return analysisResults !== null;
      case 'report': return analysisResults !== null;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">X-ray Diagnostic Analysis</h1>
          <p className="text-gray-600">Professional AI-powered diagnostic reporting system</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {['patient', 'upload', 'analyze', 'report'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 
                  ${currentStep === step 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : isStepCompleted(step)
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-gray-200 border-gray-300 text-gray-500'
                  }
                `}>
                  {isStepCompleted(step) && currentStep !== step ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    getStepNumber(step)
                  )}
                </div>
                <div className="ml-2 text-sm">
                  <p className={`font-medium ${currentStep === step ? 'text-blue-600' : isStepCompleted(step) ? 'text-green-600' : 'text-gray-500'}`}>
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </p>
                </div>
                {index < 3 && (
                  <div className={`ml-4 w-16 h-1 ${isStepCompleted(step) ? 'bg-green-300' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs value={currentStep} onValueChange={() => {}} className="w-full">
          {/* Patient Information Tab */}
          <TabsContent value="patient">
            <PatientForm
              initialData={patientData || undefined}
              onSubmit={handlePatientSubmit}
              isLoading={false}
            />
          </TabsContent>

          {/* Image Upload Tab */}
          <TabsContent value="upload">
            <div className="space-y-6">
              {patientData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Patient Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Name:</span>
                        <p className="text-gray-900">{patientData.firstName} {patientData.lastName}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Patient ID:</span>
                        <p className="text-gray-900">{patientData.patientId}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Date of Birth:</span>
                        <p className="text-gray-900">{patientData.dateOfBirth}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Gender:</span>
                        <p className="text-gray-900 capitalize">{patientData.gender}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ImageUpload
                  maxFiles={20}
                  onImagesUploaded={handleImagesUploaded}
                  onError={setError}
                  existingImages={uploadedImages}
                />
                
                {uploadedImages.length > 0 && (
                  <ImageViewer
                    images={uploadedImages}
                    currentImageIndex={currentImageIndex}
                    onImageChange={setCurrentImageIndex}
                  />
                )}
              </div>

              {uploadedImages.length > 0 && (
                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep('patient')}
                  >
                    Back to Patient Info
                  </Button>
                  <Button 
                    onClick={handleStartAnalysis}
                    disabled={uploadedImages.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Start AI Analysis
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analyze">
            <Card>
              <CardHeader>
                <CardTitle>AI Analysis in Progress</CardTitle>
                <CardDescription>
                  Analyzing {uploadedImages.length} X-ray images using advanced AI models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {isAnalyzing ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-lg font-medium text-gray-900 mb-2">Analyzing X-ray Images</p>
                      <p className="text-sm text-gray-600">This may take several minutes depending on image complexity</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-lg font-medium text-gray-900 mb-2">Analysis Complete</p>
                      <Button onClick={() => setCurrentStep('report')}>
                        View Diagnostic Report
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report Tab */}
          <TabsContent value="report">
            {analysisResults && patientData ? (
              <ReportViewer
                analysisResults={analysisResults}
                patientData={patientData}
                images={uploadedImages.map(img => ({ id: img.id, name: img.name, url: img.url }))}
                onAddNotes={(notes) => console.log('Radiologist notes:', notes)}
                onExportPDF={() => console.log('PDF exported')}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Diagnostic Report</CardTitle>
                  <CardDescription>
                    AI-generated analysis with radiologist review capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-900 mb-2">No Report Available</p>
                    <p className="text-gray-600">Complete the analysis to generate a diagnostic report</p>
                    
                    <div className="mt-6">
                      <Button variant="outline" onClick={resetSession}>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Start New Analysis
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Session Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Session ID: {sessionId} | Started: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}