import { NextRequest, NextResponse } from 'next/server';
import { extractPDF, chunkText, processImagesWithOCR } from '@/lib/extract';
import { buildGraph } from '@/lib/graph';
import { generateEmbedding } from '@/lib/groq';
import { storeGraphNodes } from '@/lib/supermemory';

export async function POST(req: NextRequest) {
  try {
    const { fileId, userId } = await req.json();

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId is required' },
        { status: 400 }
      );
    }

    const defaultUserId = userId || 'default-user';

    // Extract PDF
    const extractionResult = await extractPDF(fileId);

    // Process images with OCR
    const processedImages = await processImagesWithOCR(extractionResult.images);

    // Chunk text
    const chunks = chunkText(extractionResult.fullText);

    // Generate embeddings for chunks
    const chunksWithEmbeddings = await Promise.all(
      chunks.map(async (chunk) => ({
        content: chunk,
        embedding: await generateEmbedding(chunk),
      }))
    );

    // Build graph
    const graph = buildGraph(
      fileId,
      extractionResult.pages,
      chunks,
      processedImages
    );

    // Generate embeddings for graph nodes
    const nodesWithEmbeddings = await Promise.all(
      graph.nodes.map(async (node) => ({
        ...node,
        embedding: node.embedding || await generateEmbedding(node.content),
      }))
    );

    // Store in Supermemory
    await storeGraphNodes(
      defaultUserId,
      nodesWithEmbeddings.map((node) => ({
        id: node.id,
        content: node.content,
        embedding: node.embedding,
        metadata: node.metadata,
      }))
    );

    return NextResponse.json({
      success: true,
      summary: {
        documentId: fileId,
        totalPages: extractionResult.totalPages,
        totalChunks: chunks.length,
        totalImages: processedImages.length,
        totalNodes: graph.nodes.length,
        totalEdges: graph.edges.length,
      },
    });
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
}

