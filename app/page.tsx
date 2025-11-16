import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8 text-gray-800">
          PDF Graph RAG System
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Upload PDFs, process them into knowledge graphs, and query with AI
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/upload"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Upload Document
          </Link>
          <Link
            href="/query"
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Query Documents
          </Link>
        </div>
      </div>
    </div>
  );
}

