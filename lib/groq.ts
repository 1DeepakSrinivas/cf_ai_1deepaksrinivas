import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export interface QueryContext {
  userQuery: string;
  userProfile: {
    userId: string;
    memories: Array<{ content: string; metadata: Record<string, any> }>;
  };
  graphNodes: Array<{
    id: string;
    type: string;
    content: string;
    metadata: Record<string, any>;
  }>;
  provenance: Array<{ source: string; type: string; pageNumber?: number }>;
}

/**
 * Generate embedding using Groq (if supported) or fallback
 * Note: Groq primarily provides chat completion, not embeddings
 * In production, you might need a separate embedding service
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Groq doesn't provide embeddings API directly
  // This is a placeholder - in production, use a dedicated embedding service
  // or call a model that supports embeddings
  
  // For now, return a simple hash-based vector (not a real embedding)
  // In production, replace with actual embedding API call
  const hash = text.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  
  // Generate a 384-dimensional vector (common embedding size)
  const vector: number[] = [];
  for (let i = 0; i < 384; i++) {
    vector.push(Math.sin(hash + i) * 0.1);
  }
  
  return vector;
}

/**
 * Call Kimi K2 model via Groq
 */
export async function callKimiK2(context: QueryContext): Promise<string> {
  const { userQuery, userProfile, graphNodes, provenance } = context;

  // Build structured prompt
  const prompt = buildPrompt(userQuery, userProfile, graphNodes, provenance);

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that answers questions based on the provided context from PDF documents. Always cite your sources using the provenance information provided.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'kimi-k2',
      temperature: 0.7,
      max_tokens: 2000,
    });

    return completion.choices[0]?.message?.content || 'No response generated';
  } catch (error) {
    console.error('Groq API error:', error);
    throw new Error('Failed to call Kimi K2 model');
  }
}

/**
 * Build structured prompt for Kimi K2
 */
function buildPrompt(
  userQuery: string,
  userProfile: QueryContext['userProfile'],
  graphNodes: QueryContext['graphNodes'],
  provenance: QueryContext['provenance']
): string {
  let prompt = `User Query: ${userQuery}\n\n`;

  // Add user profile context
  if (userProfile.memories.length > 0) {
    prompt += `User Profile Context:\n`;
    userProfile.memories.slice(0, 5).forEach((memory, idx) => {
      prompt += `${idx + 1}. ${memory.content}\n`;
    });
    prompt += '\n';
  }

  // Add graph node context
  if (graphNodes.length > 0) {
    prompt += `Relevant Document Context:\n`;
    graphNodes.forEach((node, idx) => {
      prompt += `[${node.type}] ${node.content.substring(0, 500)}${node.content.length > 500 ? '...' : ''}\n`;
      if (node.metadata.pageNumber) {
        prompt += `  (Page ${node.metadata.pageNumber})\n`;
      }
      prompt += '\n';
    });
  }

  // Add provenance
  if (provenance.length > 0) {
    prompt += `Sources:\n`;
    provenance.forEach((source, idx) => {
      prompt += `${idx + 1}. ${source.type}${source.pageNumber ? ` (Page ${source.pageNumber})` : ''} - ${source.source}\n`;
    });
  }

  prompt += `\nPlease answer the user's query based on the context provided above. If the information is not available in the context, say so clearly.`;

  return prompt;
}

