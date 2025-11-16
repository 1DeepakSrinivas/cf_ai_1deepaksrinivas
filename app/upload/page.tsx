'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FileUploader from '@/components/FileUploader';

export default function UploadPage() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleUploadSuccess = async (uploadedFileId: string) => {
    setFileId(uploadedFileId);
    setError(null);
    setProcessing(true);

    try {
      // Automatically trigger processing
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId: uploadedFileId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Processing failed');
      }

      const data = await response.json();
      setSuccess(true);
      setProcessing(false);

      // Optionally redirect to query page after a delay
      setTimeout(() => {
        router.push('/query');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
      setProcessing(false);
    }
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
    setSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Upload PDF Document
        </h1>

        <FileUploader
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />

        {processing && (
          <div className="mt-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Processing document...</p>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">
              Document processed successfully! Redirecting to query page...
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/query')}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Go to Query Page
          </button>
        </div>
      </div>
    </div>
  );
}

