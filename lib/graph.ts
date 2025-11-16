export type NodeType = 'Document' | 'Page' | 'Section' | 'TextChunk' | 'Image' | 'Entity';

export interface GraphNode {
  id: string;
  type: NodeType;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'contains' | 'mentions' | 'visual_of' | 'references';
  weight?: number;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Build graph from extracted PDF data
 */
export function buildGraph(
  documentId: string,
  pages: Array<{ pageNumber: number; text: string; images: Array<{ imageId: string; ocrText?: string }> }>,
  chunks: string[],
  images: Array<{ imageId: string; pageNumber: number; ocrText?: string }>
): Graph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Document node
  const docNode: GraphNode = {
    id: `doc-${documentId}`,
    type: 'Document',
    content: `Document ${documentId}`,
    metadata: { documentId },
  };
  nodes.push(docNode);

  // Page nodes
  pages.forEach((page) => {
    const pageNode: GraphNode = {
      id: `page-${documentId}-${page.pageNumber}`,
      type: 'Page',
      content: `Page ${page.pageNumber}`,
      metadata: { pageNumber: page.pageNumber, documentId },
    };
    nodes.push(pageNode);

    // Document contains Page
    edges.push({
      id: `edge-doc-${documentId}-page-${page.pageNumber}`,
      source: docNode.id,
      target: pageNode.id,
      type: 'contains',
    });

    // TextChunk nodes for this page
    const pageChunks = chunks.filter((_, idx) => {
      // Simplified: assign chunks to pages based on position
      return idx % pages.length === page.pageNumber - 1;
    });

    pageChunks.forEach((chunk, chunkIdx) => {
      const chunkNode: GraphNode = {
        id: `chunk-${documentId}-${page.pageNumber}-${chunkIdx}`,
        type: 'TextChunk',
        content: chunk,
        metadata: { pageNumber: page.pageNumber, chunkIndex: chunkIdx, documentId },
      };
      nodes.push(chunkNode);

      // Page contains TextChunk
      edges.push({
        id: `edge-page-${documentId}-${page.pageNumber}-chunk-${chunkIdx}`,
        source: pageNode.id,
        target: chunkNode.id,
        type: 'contains',
      });
    });

    // Image nodes for this page
    page.images.forEach((image) => {
      const imageNode: GraphNode = {
        id: `image-${image.imageId}`,
        type: 'Image',
        content: image.ocrText || '',
        metadata: { imageId: image.imageId, pageNumber: page.pageNumber, documentId },
      };
      nodes.push(imageNode);

      // Page contains Image
      edges.push({
        id: `edge-page-${documentId}-${page.pageNumber}-image-${image.imageId}`,
        source: pageNode.id,
        target: imageNode.id,
        type: 'contains',
      });

      // If image has OCR text, create visual_of relationship with chunks
      if (image.ocrText) {
        pageChunks.forEach((chunk, chunkIdx) => {
          if (chunk.toLowerCase().includes(image.ocrText!.toLowerCase().substring(0, 20))) {
            edges.push({
              id: `edge-image-${image.imageId}-chunk-${chunkIdx}`,
              source: imageNode.id,
              target: `chunk-${documentId}-${page.pageNumber}-${chunkIdx}`,
              type: 'visual_of',
            });
          }
        });
      }
    });
  });

  // Create references between chunks (simplified: based on content similarity)
  nodes
    .filter((n) => n.type === 'TextChunk')
    .forEach((chunk1, idx1) => {
      nodes
        .filter((n) => n.type === 'TextChunk' && n.id !== chunk1.id)
        .forEach((chunk2) => {
          // Simple keyword-based reference detection
          const words1 = chunk1.content.toLowerCase().split(/\s+/);
          const words2 = chunk2.content.toLowerCase().split(/\s+/);
          const commonWords = words1.filter((w) => words2.includes(w) && w.length > 4);

          if (commonWords.length > 2) {
            edges.push({
              id: `edge-ref-${chunk1.id}-${chunk2.id}`,
              source: chunk1.id,
              target: chunk2.id,
              type: 'references',
              weight: commonWords.length,
            });
          }
        });
    });

  return { nodes, edges };
}

/**
 * Expand graph from seed nodes using graph relations
 */
export function expandGraph(
  seedNodeIds: string[],
  graph: Graph,
  maxDepth: number = 2
): GraphNode[] {
  const expanded: Set<string> = new Set(seedNodeIds);
  const queue: Array<{ nodeId: string; depth: number }> = seedNodeIds.map((id) => ({
    nodeId: id,
    depth: 0,
  }));

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;

    if (depth >= maxDepth) continue;

    // Find all edges connected to this node
    const connectedEdges = graph.edges.filter(
      (e) => e.source === nodeId || e.target === nodeId
    );

    for (const edge of connectedEdges) {
      const nextNodeId = edge.source === nodeId ? edge.target : edge.source;
      if (!expanded.has(nextNodeId)) {
        expanded.add(nextNodeId);
        queue.push({ nodeId: nextNodeId, depth: depth + 1 });
      }
    }
  }

  return graph.nodes.filter((n) => expanded.has(n.id));
}

