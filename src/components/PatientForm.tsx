'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PatientFormData } from '@/types/medical';

// Validation schema for patient information
const patientSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other'], { 
    required_error: 'Please select a gender' 
  }),
  patientId: z.string().min(1, 'Patient ID is required').max(20, 'Patient ID is too long'),
  medicalHistory: z.string().max(1000, 'Medical history is too long'),
  symptoms: z.string().max(1000, 'Symptoms description is too long'),
  examinationNotes: z.string().max(1000, 'Examination notes are too long'),
});

interface PatientFormProps {
  initialData?: Partial<PatientFormData>;
  onSubmit: (data: PatientFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function PatientForm({ initialData, onSubmit, onCancel, isLoading = false }: PatientFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid }
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      dateOfBirth: initialData?.dateOfBirth || '',
      gender: initialData?.gender || undefined,
      patientId: initialData?.patientId || '',
      medicalHistory: initialData?.medicalHistory || '',
      symptoms: initialData?.symptoms || '',
      examinationNotes: initialData?.examinationNotes || '',
    },
    mode: 'onChange'
  });

  const watchedGender = watch('gender');

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Patient Information</span>
        </CardTitle>
        <CardDescription>
          Enter comprehensive patient details for accurate diagnostic analysis.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                First Name *
              </Label>
              <Input
                id="firstName"
                {...register('firstName')}
                placeholder="Enter first name"
                className={`${errors.firstName ? 'border-red-500' : 'border-gray-300'} focus:ring-blue-500 focus:border-blue-500`}
                disabled={isLoading}
              />
              {errors.firstName && (
                <p className="text-xs text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                Last Name *
              </Label>
              <Input
                id="lastName"
                {...register('lastName')}
                placeholder="Enter last name"
                className={`${errors.lastName ? 'border-red-500' : 'border-gray-300'} focus:ring-blue-500 focus:border-blue-500`}
                disabled={isLoading}
              />
              {errors.lastName && (
                <p className="text-xs text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth" className="text-sm font-medium text-gray-700">
                Date of Birth *
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...register('dateOfBirth')}
                className={`${errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'} focus:ring-blue-500 focus:border-blue-500`}
                disabled={isLoading}
              />
              {errors.dateOfBirth && (
                <p className="text-xs text-red-600">{errors.dateOfBirth.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Gender *
              </Label>
              <Select 
                value={watchedGender} 
                onValueChange={(value) => setValue('gender', value as 'male' | 'female' | 'other')}
                disabled={isLoading}
              >
                <SelectTrigger className={`${errors.gender ? 'border-red-500' : 'border-gray-300'}`}>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-xs text-red-600">{errors.gender.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="patientId" className="text-sm font-medium text-gray-700">
                Patient ID *
              </Label>
              <Input
                id="patientId"
                {...register('patientId')}
                placeholder="Enter patient ID"
                className={`${errors.patientId ? 'border-red-500' : 'border-gray-300'} focus:ring-blue-500 focus:border-blue-500`}
                disabled={isLoading}
              />
              {errors.patientId && (
                <p className="text-xs text-red-600">{errors.patientId.message}</p>
              )}
            </div>
          </div>

          {/* Medical Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="medicalHistory" className="text-sm font-medium text-gray-700">
                Medical History
              </Label>
              <Textarea
                id="medicalHistory"
                {...register('medicalHistory')}
                placeholder="Enter relevant medical history, previous conditions, surgeries, allergies, etc."
                rows={3}
                className={`${errors.medicalHistory ? 'border-red-500' : 'border-gray-300'} focus:ring-blue-500 focus:border-blue-500`}
                disabled={isLoading}
              />
              {errors.medicalHistory && (
                <p className="text-xs text-red-600">{errors.medicalHistory.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="symptoms" className="text-sm font-medium text-gray-700">
                Current Symptoms
              </Label>
              <Textarea
                id="symptoms"
                {...register('symptoms')}
                placeholder="Describe current symptoms, pain level, duration, onset, etc."
                rows={3}
                className={`${errors.symptoms ? 'border-red-500' : 'border-gray-300'} focus:ring-blue-500 focus:border-blue-500`}
                disabled={isLoading}
              />
              {errors.symptoms && (
                <p className="text-xs text-red-600">{errors.symptoms.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="examinationNotes" className="text-sm font-medium text-gray-700">
                Clinical Examination Notes
              </Label>
              <Textarea
                id="examinationNotes"
                {...register('examinationNotes')}
                placeholder="Physical examination findings, vital signs, clinical observations, etc."
                rows={3}
                className={`${errors.examinationNotes ? 'border-red-500' : 'border-gray-300'} focus:ring-blue-500 focus:border-blue-500`}
                disabled={isLoading}
              />
              {errors.examinationNotes && (
                <p className="text-xs text-red-600">{errors.examinationNotes.message}</p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
            <Button
              type="submit"
              disabled={!isValid || isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save Patient Information</span>
                </div>
              )}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
            )}
          </div>

          {/* Form Status */}
          <div className="text-xs text-gray-500 text-center">
            * Required fields must be completed for diagnostic analysis
          </div>
        </form>
      </CardContent>
    </Card>
  );
}