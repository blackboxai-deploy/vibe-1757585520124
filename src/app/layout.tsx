import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RadiologyAI - X-ray Diagnostic Platform',
  description: 'Professional AI-powered X-ray diagnostic reporting system for radiologists',
  keywords: ['radiology', 'x-ray', 'medical imaging', 'DICOM', 'AI diagnostics'],
  authors: [{ name: 'RadiologyAI Team' }],
  robots: 'noindex, nofollow', // Privacy for medical application
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="h-full bg-gradient-to-br from-slate-50 to-blue-50 antialiased font-sans">
        {/* Medical Header */}
        <header className="bg-white shadow-sm border-b border-blue-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo and Title */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">RadiologyAI</h1>
                  <p className="text-xs text-gray-500">X-ray Diagnostic Platform</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="hidden md:flex items-center space-x-6">
                <a href="/" className="text-blue-600 font-medium hover:text-blue-700 transition-colors">
                  Dashboard
                </a>
                <a href="/history" className="text-gray-600 hover:text-gray-900 transition-colors">
                  History
                </a>
                <a href="/help" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Help
                </a>
              </nav>

              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">Dr. Radiologist</p>
                  <p className="text-xs text-gray-500">Attending Physician</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <div className="flex items-center space-x-6">
                <span>© 2024 RadiologyAI Platform</span>
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>HIPAA Compliant</span>
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span>Version 1.0.0</span>
                <span>|</span>
                <span>Last Updated: {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}