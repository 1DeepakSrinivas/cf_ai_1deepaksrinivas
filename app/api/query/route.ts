import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile, searchMemories } from '@/lib/supermemory';
import { expandGraph, GraphNode } from '@/lib/graph';
import { generateEmbedding, callKimiK2, QueryContext } from '@/lib/groq';
import { searchAgent, shouldUseSearchAgent } from '@/lib/agents/search';

export async function POST(req: NextRequest) {
  try {
    const { query, userId, fileId } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

    const defaultUserId = userId || 'default-user';

    // Load user profile
    const userProfile = await getUserProfile(defaultUserId);

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Stage 1: Vector similarity search
    const relevantMemories = await searchMemories(defaultUserId, queryEmbedding, 10);

    // Stage 2: Graph expansion (if we have graph structure)
    // For now, we'll use the memories directly
    let graphNodes: GraphNode[] = relevantMemories
      .filter((m) => m.metadata.nodeType === 'graph')
      .map((m) => ({
        id: m.id,
        type: (m.metadata.type as any) || 'TextChunk',
        content: m.content,
        metadata: m.metadata,
        embedding: m.embedding,
      }));

    // Stage 3: Use search agent to supplement query if needed
    if (shouldUseSearchAgent(query, graphNodes.length)) {
      try {
        const searchResults = await searchAgent(defaultUserId, query, 5);
        
        // Merge search results with graph nodes
        const searchNodes: GraphNode[] = searchResults.map((result) => ({
          id: result.source,
          type: (result.metadata.type as any) || 'TextChunk',
          content: result.content,
          metadata: result.metadata,
          embedding: undefined,
        }));

        // Combine and deduplicate
        const nodeMap = new Map<string, GraphNode>();
        [...graphNodes, ...searchNodes].forEach((node) => {
          if (!nodeMap.has(node.id)) {
            nodeMap.set(node.id, node);
          }
        });
        graphNodes = Array.from(nodeMap.values());
      } catch (error) {
        console.error('Search agent error:', error);
        // Continue without search agent results
      }
    }

    // Build provenance
    const provenance = graphNodes.map((node) => ({
      source: node.id,
      type: node.type,
      pageNumber: node.metadata.pageNumber,
    }));

    // Build context
    const context: QueryContext = {
      userQuery: query,
      userProfile: {
        userId: defaultUserId,
        memories: userProfile.memories
          .filter((m) => m.metadata.nodeType !== 'graph')
          .slice(0, 5)
          .map((m) => ({
            content: m.content,
            metadata: m.metadata,
          })),
      },
      graphNodes: graphNodes.slice(0, 10).map((node) => ({
        id: node.id,
        type: node.type,
        content: node.content,
        metadata: node.metadata,
      })),
      provenance,
    };

    // Call Kimi K2
    const answer = await callKimiK2(context);

    // Store interaction memory
    await import('@/lib/supermemory').then(({ upsertMemory }) =>
      upsertMemory(
        defaultUserId,
        `Query: ${query}\nAnswer: ${answer}`,
        undefined,
        { type: 'interaction', timestamp: Date.now() }
      )
    );

    return NextResponse.json({
      answer,
      provenance,
      contextNodes: graphNodes.length,
      usedSearchAgent: shouldUseSearchAgent(query, graphNodes.length),
    });
  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json(
      { error: 'Failed to process query' },
      { status: 500 }
    );
  }
}

