const SUPERMEMORY_API_URL = process.env.SUPERMEMORY_API_URL || 'https://api.supermemory.ai';
const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY || '';

export interface Memory {
  id: string;
  userId: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  timestamp: number;
}

export interface UserProfile {
  userId: string;
  memories: Memory[];
  preferences: Record<string, any>;
  lastUpdated: number;
}

/**
 * Store or update a memory
 */
export async function upsertMemory(
  userId: string,
  content: string,
  embedding?: number[],
  metadata: Record<string, any> = {}
): Promise<Memory> {
  const memory: Memory = {
    id: `mem-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    userId,
    content,
    embedding,
    metadata,
    timestamp: Date.now(),
  };

  // In a real implementation, this would call Supermemory API
  // For now, we'll use a simplified in-memory store (should be replaced with actual API)
  if (!global.supermemoryStore) {
    global.supermemoryStore = new Map();
  }

  const userMemories = global.supermemoryStore.get(userId) || [];
  userMemories.push(memory);
  global.supermemoryStore.set(userId, userMemories);

  return memory;
}

/**
 * Store multiple memories (for document embeddings)
 */
export async function upsertMemories(memories: Memory[]): Promise<void> {
  for (const memory of memories) {
    await upsertMemory(
      memory.userId,
      memory.content,
      memory.embedding,
      memory.metadata
    );
  }
}

/**
 * Retrieve user profile with memories
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  // In a real implementation, this would call Supermemory API
  if (!global.supermemoryStore) {
    global.supermemoryStore = new Map();
  }

  const memories = global.supermemoryStore.get(userId) || [];

  return {
    userId,
    memories,
    preferences: {},
    lastUpdated: Date.now(),
  };
}

/**
 * Search memories by similarity (vector search)
 */
export async function searchMemories(
  userId: string,
  queryEmbedding: number[],
  limit: number = 10
): Promise<Memory[]> {
  const profile = await getUserProfile(userId);
  const memories = profile.memories.filter((m) => m.embedding);

  // Simple cosine similarity (in production, use proper vector DB)
  const scored = memories.map((memory) => {
    const similarity = cosineSimilarity(queryEmbedding, memory.embedding!);
    return { memory, similarity };
  });

  scored.sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, limit).map((s) => s.memory);
}

/**
 * Store graph nodes as memories
 */
export async function storeGraphNodes(
  userId: string,
  nodes: Array<{ id: string; content: string; embedding?: number[]; metadata: Record<string, any> }>
): Promise<void> {
  const memories: Memory[] = nodes.map((node) => ({
    id: node.id,
    userId,
    content: node.content,
    embedding: node.embedding,
    metadata: { ...node.metadata, nodeType: 'graph' },
    timestamp: Date.now(),
  }));

  await upsertMemories(memories);
}

/**
 * Cosine similarity helper
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Type augmentation for global store
declare global {
  var supermemoryStore: Map<string, Memory[]> | undefined;
}

