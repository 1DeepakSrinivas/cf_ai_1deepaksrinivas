import { searchMemories, getUserProfile } from '@/lib/supermemory';
import { generateEmbedding } from '@/lib/groq';

export interface SearchResult {
  content: string;
  metadata: Record<string, any>;
  relevanceScore: number;
  source: string;
}

/**
 * Search agent that supplements user queries with additional context
 */
export async function searchAgent(
  userId: string,
  query: string,
  maxResults: number = 5
): Promise<SearchResult[]> {
  try {
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    // Search memories using vector similarity
    const memories = await searchMemories(userId, queryEmbedding, maxResults * 2);

    // Get user profile for additional context
    const profile = await getUserProfile(userId);

    // Filter and rank results
    const results: SearchResult[] = memories
      .filter((memory) => {
        // Filter out interaction memories and focus on document content
        return memory.metadata.nodeType === 'graph' || 
               (memory.metadata.type && memory.metadata.type !== 'interaction');
      })
      .slice(0, maxResults)
      .map((memory) => ({
        content: memory.content,
        metadata: memory.metadata,
        relevanceScore: 0.8, // Would be calculated from similarity in production
        source: memory.metadata.documentId || memory.id,
      }));

    // If we have few results, try semantic expansion
    if (results.length < maxResults) {
      // Extract key terms from query for expansion
      const keyTerms = extractKeyTerms(query);
      
      // Search for related content
      for (const term of keyTerms) {
        if (results.length >= maxResults) break;
        
        const termEmbedding = await generateEmbedding(term);
        const termMemories = await searchMemories(userId, termEmbedding, 3);
        
        for (const memory of termMemories) {
          if (results.length >= maxResults) break;
          if (!results.some((r) => r.source === memory.id)) {
            results.push({
              content: memory.content,
              metadata: memory.metadata,
              relevanceScore: 0.6,
              source: memory.metadata.documentId || memory.id,
            });
          }
        }
      }
    }

    return results.slice(0, maxResults);
  } catch (error) {
    console.error('Search agent error:', error);
    return [];
  }
}

/**
 * Extract key terms from query for semantic expansion
 */
function extractKeyTerms(query: string): string[] {
  // Simple keyword extraction (in production, use NLP library)
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose',
    'where', 'when', 'why', 'how', 'about', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off',
    'over', 'under', 'again', 'further', 'then', 'once',
  ]);

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .slice(0, 5);
}

/**
 * Determine if search agent should be used to supplement query
 */
export function shouldUseSearchAgent(query: string, contextNodes: number): boolean {
  // Use search agent if:
  // 1. Query is complex (multiple terms)
  // 2. Few context nodes found
  // 3. Query contains question words
  const questionWords = ['what', 'who', 'where', 'when', 'why', 'how', 'which'];
  const hasQuestionWord = questionWords.some((word) => 
    query.toLowerCase().includes(word)
  );
  const isComplex = query.split(/\s+/).length > 5;
  const needsMoreContext = contextNodes < 3;

  return hasQuestionWord || isComplex || needsMoreContext;
}

