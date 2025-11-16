'use client';

interface Provenance {
  source: string;
  type: string;
  pageNumber?: number;
}

interface ResultBlockProps {
  answer: string;
  provenance?: Provenance[];
  contextNodes?: number;
  usedSearchAgent?: boolean;
}

export default function ResultBlock({ answer, provenance, contextNodes, usedSearchAgent }: ResultBlockProps) {
  return (
    <div className="w-full max-w-4xl mx-auto mt-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Answer</h3>
          {usedSearchAgent && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Enhanced with Search Agent
            </span>
          )}
        </div>
        <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
          {answer}
        </div>

        {provenance && provenance.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-600 mb-3">Sources</h4>
            <ul className="space-y-2">
              {provenance.map((source, idx) => (
                <li key={idx} className="text-sm text-gray-500">
                  <span className="font-medium">{source.type}</span>
                  {source.pageNumber && ` (Page ${source.pageNumber})`}
                  <span className="ml-2 text-xs text-gray-400">- {source.source}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {contextNodes !== undefined && (
          <div className="mt-4 text-xs text-gray-400">
            Retrieved {contextNodes} context node(s)
          </div>
        )}
      </div>
    </div>
  );
}

