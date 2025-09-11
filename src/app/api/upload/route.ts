import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { DicomProcessor, medicalImageUtils } from '@/lib/dicom-utils';

// File upload API route
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const uploadedImages = [];
    const errors = [];

    for (const file of files) {
      try {
        // Validate file
        if (!medicalImageUtils.isSupportedMedicalImage(file)) {
          errors.push(`${file.name}: Unsupported file format`);
          continue;
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = file.name.split('.').pop();
        const uniqueFilename = `${timestamp}_${randomString}.${extension}`;
        
        // Save file
        const buffer = Buffer.from(await file.arrayBuffer());
        const filepath = join(uploadsDir, uniqueFilename);
        await writeFile(filepath, buffer);

        // Process file information
        const isDicom = DicomProcessor.isDicomFile(file);
        let dicomData = null;

        if (isDicom) {
          dicomData = await DicomProcessor.parseDicomFile(file);
        }

        uploadedImages.push({
          id: `upload_${timestamp}_${randomString}`,
          originalName: file.name,
          filename: uniqueFilename,
          path: filepath,
          size: file.size,
          type: file.type,
          isDicom,
          dicomData,
          uploadedAt: new Date().toISOString()
        });

      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`);
      }
    }

    return NextResponse.json({
      success: true,
      images: uploadedImages,
      errors
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get uploaded file
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename parameter required' },
        { status: 400 }
      );
    }

    const filepath = join(process.cwd(), 'uploads', filename);
    
    // Read file and return as response
    const { readFile } = await import('fs/promises');
    const fileBuffer = await readFile(filepath);
    
    // Determine content type based on file extension
    const extension = filename.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'tiff':
      case 'tif':
        contentType = 'image/tiff';
        break;
      case 'bmp':
        contentType = 'image/bmp';
        break;
      case 'dcm':
      case 'dicom':
        contentType = 'application/dicom';
        break;
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('File retrieval error:', error);
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  }
}