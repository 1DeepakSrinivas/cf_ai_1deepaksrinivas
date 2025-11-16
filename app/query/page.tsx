'use client';

import { useState } from 'react';
import QueryBox from '@/components/QueryBox';
import ResultBlock from '@/components/ResultBlock';

interface QueryResult {
  answer: string;
  provenance?: Array<{ source: string; type: string; pageNumber?: number }>;
  contextNodes?: number;
  usedSearchAgent?: boolean;
}

export default function QueryPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async (query: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Query failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Query Your Documents
        </h1>

        <QueryBox onQuery={handleQuery} loading={loading} />

        {loading && (
          <div className="mt-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Searching and analyzing...</p>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg max-w-2xl mx-auto">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <ResultBlock
            answer={result.answer}
            provenance={result.provenance}
            contextNodes={result.contextNodes}
            usedSearchAgent={result.usedSearchAgent}
          />
        )}

        <div className="mt-8 text-center">
          <a
            href="/upload"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Upload Another Document
          </a>
        </div>
      </div>
    </div>
  );
}

