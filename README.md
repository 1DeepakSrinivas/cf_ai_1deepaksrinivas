# PDF Graph RAG System

An end-to-end PDF processing and Graph-based RAG (Retrieval Augmented Generation) system built with Next.js 14, Groq-hosted Kimi K2, Cloudflare Agents, and Supermemory.

## Features

- **PDF Upload & Processing**: Upload PDF documents and extract text, images, and metadata
- **Image OCR**: Automatic OCR processing of extracted images using Tesseract.js
- **Graph-Based Knowledge Representation**: Convert PDFs into knowledge graphs with nodes (Document, Page, Section, TextChunk, Image, Entity) and edges (contains, mentions, visual_of, references)
- **Two-Stage Retrieval**: Vector similarity search followed by graph expansion
- **AI-Powered Querying**: Query documents using Groq-hosted Kimi K2 model
- **User Memory Management**: Store and retrieve user profiles and memories via Supermemory
- **Cloudflare Agents (MCP) Integration**: Full Model Context Protocol (MCP) server implementation for Cloudflare Agents with tools, resources, and prompts
- **Search Agent**: Intelligent search agent that supplements user queries with additional context when needed
- **MCP Server**: Exposes tools for document search, reindexing, summarization, and user profile access

## Architecture

### Tech Stack

- **Frontend**: Next.js 14 App Router, React, TypeScript, Tailwind CSS
- **Backend**: Next.js Route Handlers (no FastAPI/Flask/Express)
- **LLM**: Groq-hosted Kimi K2
- **Storage**: Local file system (configurable to cloud storage)
- **OCR**: Tesseract.js
- **PDF Processing**: pdf-parse, pdfjs-dist

### Project Structure

```
├── app/
│   ├── api/
│   │   ├── upload/route.ts          # PDF upload endpoint
│   │   ├── process/route.ts          # PDF processing endpoint
│   │   ├── query/route.ts            # Query endpoint
│   │   ├── supermemory/
│   │   │   ├── upsert/route.ts       # Memory upsert endpoint
│   │   │   └── profile/route.ts      # User profile endpoint
│   │   └── webhook/
│   │       └── cloudflare/route.ts   # Cloudflare webhook
│   ├── upload/page.tsx               # Upload UI
│   ├── query/page.tsx                # Query UI
│   └── layout.tsx                    # Root layout
├── components/
│   ├── FileUploader.tsx              # File upload component
│   ├── QueryBox.tsx                  # Query input component
│   └── ResultBlock.tsx               # Results display component
├── lib/
│   ├── storage.ts                    # File storage utilities
│   ├── extract.ts                    # PDF and image extraction
│   ├── graph.ts                      # Graph building and expansion
│   ├── supermemory.ts                # Supermemory integration
│   ├── groq.ts                       # Groq/Kimi K2 integration
│   ├── mcp-server.ts                 # MCP server implementation
│   └── agents/
│       └── search.ts                 # Search agent for query supplementation
└── storage/                          # Local file storage (gitignored)
```

## Setup

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 18+ with npm/yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cf_ai_1deepaksrinivas
```

2. Install dependencies with Bun:
```bash
bun install
```

Or with npm:
```bash
npm install
```

3. Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Configure environment variables:
```env
GROQ_API_KEY=your_groq_api_key_here
SUPERMEMORY_API_KEY=your_supermemory_api_key_here
SUPERMEMORY_API_URL=https://api.supermemory.ai
CLOUDFLARE_WEBHOOK_SECRET=your_webhook_secret_here
STORAGE_PATH=./storage
STORAGE_TYPE=local
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. Run the development server:
```bash
bun run dev
```

Or with npm:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Upload a PDF

1. Navigate to `/upload`
2. Select or drag-and-drop a PDF file
3. The system will automatically:
   - Upload the file
   - Extract text and images
   - Perform OCR on images
   - Chunk the text
   - Generate embeddings
   - Build a knowledge graph
   - Store everything in Supermemory

### Query Documents

1. Navigate to `/query`
2. Enter your question in the query box
3. The system will:
   - Load your user profile from Supermemory
   - Perform vector similarity search
   - Expand the graph from relevant nodes
   - Build structured context
   - Query Kimi K2 with the context
   - Return the answer with provenance
   - Store the interaction as a memory

## API Endpoints

### POST /api/upload
Upload a PDF file.

**Request**: `multipart/form-data` with `file` field

**Response**:
```json
{
  "fileId": "string",
  "message": "File uploaded successfully"
}
```

### POST /api/process
Process an uploaded PDF.

**Request**:
```json
{
  "fileId": "string",
  "userId": "string (optional)"
}
```

**Response**:
```json
{
  "success": true,
  "summary": {
    "documentId": "string",
    "totalPages": number,
    "totalChunks": number,
    "totalImages": number,
    "totalNodes": number,
    "totalEdges": number
  }
}
```

### POST /api/query
Query documents using AI.

**Request**:
```json
{
  "query": "string",
  "userId": "string (optional)",
  "fileId": "string (optional)"
}
```

**Response**:
```json
{
  "answer": "string",
  "provenance": [
    {
      "source": "string",
      "type": "string",
      "pageNumber": number
    }
  ],
  "contextNodes": number
}
```

### POST /api/supermemory/upsert
Store or update a memory.

**Request**:
```json
{
  "userId": "string",
  "content": "string",
  "embedding": [number] (optional),
  "metadata": {} (optional)
}
```

### GET /api/supermemory/profile
Get user profile with memories.

**Query Parameters**: `userId` (optional, defaults to "default-user")

### POST /api/webhook/cloudflare
Cloudflare Agent webhook endpoint (supports both MCP and legacy formats).

**MCP Format Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "search_documents",
    "arguments": {
      "query": "string",
      "userId": "string",
      "maxResults": 5
    }
  }
}
```

**Legacy Format Request**:
```json
{
  "action": "reindex" | "summarize" | "search" | "background_task",
  "data": {}
}
```

### GET /api/mcp
Get available MCP tools, resources, and prompts.

**Query Parameters**: `type` (optional: "tools", "resources", "prompts")

**Response**:
```json
{
  "tools": [...],
  "resources": [...],
  "prompts": [...]
}
```

### POST /api/mcp
Execute MCP tool calls.

**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {}
  }
}
```

### GET /api/mcp/sse
Server-Sent Events endpoint for long-lived MCP connections.

### POST /api/mcp/sse
Execute MCP tools via SSE endpoint.

## Graph Structure

The system builds knowledge graphs with the following structure:

### Node Types
- **Document**: Root node representing the entire document
- **Page**: Individual pages
- **Section**: Document sections (if detected)
- **TextChunk**: Chunked text segments
- **Image**: Extracted images with OCR text
- **Entity**: Named entities (if extracted)

### Edge Types
- **contains**: Hierarchical relationships (Document → Page → TextChunk)
- **mentions**: Entity mentions in text
- **visual_of**: Relationship between images and related text
- **references**: Cross-references between chunks

## Development

### Code Style

- TypeScript for all server and client files
- Server components by default
- Client components only when needed (use `'use client'` directive)
- Minimal dependencies
- Clean, relative import paths
- Deterministic and simple code

### Adding New Features

When adding new code, ensure:
- ✅ Uses Next.js Route Handlers (not FastAPI/Flask)
- ✅ Written in TypeScript
- ✅ Integrates with Supermemory consistently
- ✅ Correctly calls Groq Kimi K2
- ✅ Preserves graph-based RAG design

## Cloudflare Agents (MCP) Integration

This project implements a full [Model Context Protocol (MCP)](https://developers.cloudflare.com/agents/model-context-protocol/) server that can be used by Cloudflare Agents. The MCP server exposes the following tools:

### Available MCP Tools

1. **search_documents**: Search through uploaded documents using semantic search
   - Parameters: `query` (required), `userId` (optional), `maxResults` (optional)
   
2. **reindex_document**: Reindex a processed document to update its graph structure
   - Parameters: `fileId` (required), `userId` (optional)
   
3. **summarize_document**: Generate a summary of a document
   - Parameters: `fileId` (required), `userId` (optional)
   
4. **get_user_profile**: Retrieve user profile and memories
   - Parameters: `userId` (required)

### Search Agent

The system includes an intelligent search agent (`lib/agents/search.ts`) that automatically supplements user queries when:
- The query is complex (multiple terms)
- Few context nodes are found initially
- The query contains question words (what, who, where, when, why, how, which)

The search agent performs semantic expansion by extracting key terms and searching for related content, ensuring comprehensive context for the LLM.

### MCP Server Endpoints

- **HTTP/JSON**: `/api/mcp` - Standard HTTP endpoint for MCP tool calls
- **SSE**: `/api/mcp/sse` - Server-Sent Events endpoint for long-lived connections
- **Webhook**: `/api/webhook/cloudflare` - Webhook endpoint that supports both MCP and legacy formats

## Notes

- The current implementation uses an in-memory store for Supermemory (for development). Replace with actual Supermemory API calls in production.
- Embedding generation uses a placeholder implementation. In production, use a dedicated embedding service or Groq's embedding API if available.
- PDF image extraction is simplified. For production, implement full image extraction using pdfjs-dist.
- The MCP server follows Cloudflare's MCP specification for remote connections using HTTP/SSE transport.

