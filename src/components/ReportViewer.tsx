'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { AIAnalysisResult, PatientFormData, Finding } from '@/types/medical';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportViewerProps {
  analysisResults: AIAnalysisResult[];
  patientData: PatientFormData;
  images: { id: string; name: string; url: string }[];
  onAddNotes?: (notes: string) => void;
  onExportPDF?: () => void;
  className?: string;
}

export function ReportViewer({ 
  analysisResults, 
  patientData, 
  images, 
  onAddNotes, 
  onExportPDF,
  className = "" 
}: ReportViewerProps) {
  const [radiologistNotes, setRadiologistNotes] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const getSeverityColor = (severity: Finding['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'severe':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'mild':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'normal':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: Finding['category']) => {
    switch (category) {
      case 'fracture':
        return '🦴';
      case 'pneumonia':
        return '🫁';
      case 'cardiomegaly':
        return '❤️';
      case 'normal':
        return '✅';
      default:
        return '📋';
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    
    try {
      // Capture the report as canvas
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Save PDF
      const fileName = `X-Ray_Report_${patientData.firstName}_${patientData.lastName}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      onExportPDF?.();
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveNotes = () => {
    onAddNotes?.(radiologistNotes);
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOverallAssessment = () => {
    const allFindings = analysisResults.reduce<Finding[]>((acc, result) => acc.concat(result.findings), []);
    const criticalFindings = allFindings.filter(f => f.severity === 'critical' || f.severity === 'severe');
    
    if (criticalFindings.length > 0) {
      return { level: 'urgent', color: 'bg-red-50 border-red-200', text: 'Urgent findings detected - immediate attention required' };
    }
    
    const abnormalFindings = allFindings.filter(f => f.category !== 'normal');
    if (abnormalFindings.length > 0) {
      return { level: 'abnormal', color: 'bg-yellow-50 border-yellow-200', text: 'Abnormal findings present - clinical correlation recommended' };
    }
    
    return { level: 'normal', color: 'bg-green-50 border-green-200', text: 'No significant abnormalities detected' };
  };

  const overallAssessment = getOverallAssessment();
  const totalProcessingTime = analysisResults.reduce((sum, result) => sum + result.processingTime, 0);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Report Header */}
      <Card>
        <CardHeader className="bg-blue-50 border-b">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">X-ray Diagnostic Report</h1>
                <p className="text-sm text-gray-600">AI-Powered Radiological Analysis</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isExporting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Exporting...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Export PDF</span>
                  </div>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Report Content */}
      <div ref={reportRef} className="bg-white">
        {/* Patient Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Patient Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">Patient Name</h4>
                <p className="text-gray-900">{patientData.firstName} {patientData.lastName}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">Patient ID</h4>
                <p className="text-gray-900">{patientData.patientId}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">Date of Birth</h4>
                <p className="text-gray-900">{patientData.dateOfBirth}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">Gender</h4>
                <p className="text-gray-900 capitalize">{patientData.gender}</p>
              </div>
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-600 mb-1">Medical History</h4>
                <p className="text-gray-900 text-sm">{patientData.medicalHistory || 'None reported'}</p>
              </div>
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-600 mb-1">Current Symptoms</h4>
                <p className="text-gray-900 text-sm">{patientData.symptoms || 'None reported'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Study Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Study Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">Study Date</h4>
                <p className="text-gray-900">{getCurrentDate()}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">Modality</h4>
                <p className="text-gray-900">Digital Radiography (DR)</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">Images Analyzed</h4>
                <p className="text-gray-900">{images.length} images</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">Analysis Time</h4>
                <p className="text-gray-900">{(totalProcessingTime / 1000).toFixed(1)}s</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Assessment */}
        <Card className={`mb-6 border-2 ${overallAssessment.color}`}>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                overallAssessment.level === 'urgent' ? 'bg-red-500' :
                overallAssessment.level === 'abnormal' ? 'bg-yellow-500' : 'bg-green-500'
              }`} />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Overall Assessment</h3>
                <p className="text-gray-700">{overallAssessment.text}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Analysis Results */}
        {analysisResults.map((result, index) => (
          <Card key={result.id} className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span>Analysis Result #{index + 1}</span>
                <Badge variant="outline" className="text-xs">
                  Confidence: {result.confidence}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Clinical Impression */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-2">Clinical Impression</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 leading-relaxed">{result.impression}</p>
                </div>
              </div>

              {/* Findings */}
              {result.findings.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Findings</h4>
                  <div className="space-y-3">
                    {result.findings.map((finding) => (
                      <div key={finding.id} className={`p-4 rounded-lg border ${getSeverityColor(finding.severity)}`}>
                        <div className="flex items-start space-x-3">
                          <span className="text-lg">{getCategoryIcon(finding.category)}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium capitalize">
                                {finding.category.replace('_', ' ')} Finding
                              </h5>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs capitalize">
                                  {finding.severity}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {finding.confidence}% confidence
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm leading-relaxed">{finding.description}</p>
                            {finding.location && (
                              <p className="text-xs text-gray-600 mt-1">Location: {finding.location}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-2">Recommendations</h4>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <ul className="space-y-2">
                      {result.recommendations.map((recommendation, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm text-blue-900">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Radiologist Notes Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Radiologist Review & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Add your professional assessment, additional observations, or corrections to the AI analysis..."
              value={radiologistNotes}
              onChange={(e) => setRadiologistNotes(e.target.value)}
              rows={6}
              className="w-full resize-vertical"
            />
            <div className="flex justify-end">
              <Button onClick={handleSaveNotes} variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Notes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Footer */}
        <Card>
          <CardContent className="pt-6">
            <Separator className="mb-4" />
            <div className="flex justify-between items-center text-sm text-gray-600">
              <div>
                <p>This report was generated using AI-powered analysis technology</p>
                <p className="text-xs">Always verify with clinical correlation and professional judgment</p>
              </div>
              <div className="text-right">
                <p>RadiologyAI Platform</p>
                <p className="text-xs">Generated: {getCurrentDate()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}