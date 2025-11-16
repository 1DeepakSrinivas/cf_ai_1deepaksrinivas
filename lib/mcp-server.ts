/**
 * Model Context Protocol (MCP) Server Implementation
 * https://developers.cloudflare.com/agents/model-context-protocol/
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

/**
 * MCP Server Tools Registry
 */
export const mcpTools: MCPTool[] = [
  {
    name: 'search_documents',
    description: 'Search through uploaded documents using semantic search. Use this when the user query needs additional context or when initial search returns few results.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant document content',
        },
        userId: {
          type: 'string',
          description: 'User ID to scope the search',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'reindex_document',
    description: 'Reindex a processed document to update its graph structure and embeddings. Use this when documents need to be reprocessed.',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: {
          type: 'string',
          description: 'The file ID of the document to reindex',
        },
        userId: {
          type: 'string',
          description: 'User ID who owns the document',
        },
      },
      required: ['fileId'],
    },
  },
  {
    name: 'summarize_document',
    description: 'Generate a summary of a document or set of documents. Use this when the user asks for summaries or overviews.',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: {
          type: 'string',
          description: 'The file ID of the document to summarize',
        },
        userId: {
          type: 'string',
          description: 'User ID who owns the document',
        },
      },
      required: ['fileId'],
    },
  },
  {
    name: 'get_user_profile',
    description: 'Retrieve user profile and memories. Use this to understand user context and preferences.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID to retrieve profile for',
        },
      },
      required: ['userId'],
    },
  },
];

/**
 * Execute an MCP tool call
 */
export async function executeMCPTool(toolCall: MCPToolCall): Promise<any> {
  const { name, arguments: args } = toolCall;

  switch (name) {
    case 'search_documents': {
      const { searchAgent } = await import('./agents/search');
      return await searchAgent(
        args.userId || 'default-user',
        args.query,
        args.maxResults || 5
      );
    }

    case 'reindex_document': {
      // Call the process endpoint internally
      // Use environment variable if available, otherwise default to localhost
      // Bun supports process.env directly
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${appUrl}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: args.fileId,
          userId: args.userId || 'default-user',
        }),
      });
      return await response.json();
    }

    case 'summarize_document': {
      // Get document content and generate summary
      const { getUserProfile } = await import('./supermemory');
      const profile = await getUserProfile(args.userId || 'default-user');
      const documentMemories = profile.memories.filter(
        (m) => m.metadata.documentId === args.fileId
      );
      
      // In production, call LLM for summarization
      return {
        summary: `Document contains ${documentMemories.length} chunks across multiple pages.`,
        chunks: documentMemories.length,
      };
    }

    case 'get_user_profile': {
      const { getUserProfile } = await import('./supermemory');
      return await getUserProfile(args.userId || 'default-user');
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Get available MCP tools
 */
export function getMCPTools(): MCPTool[] {
  return mcpTools;
}

/**
 * Get MCP resources (for future use)
 */
export function getMCPResources(): MCPResource[] {
  return [
    {
      uri: 'documents://all',
      name: 'All Documents',
      description: 'Access to all uploaded documents',
      mimeType: 'application/json',
    },
  ];
}

/**
 * Get MCP prompts (for future use)
 */
export function getMCPPrompts(): MCPPrompt[] {
  return [
    {
      name: 'summarize_query_context',
      description: 'Generate a prompt template for summarizing query context',
      arguments: [
        {
          name: 'query',
          description: 'The user query',
          required: true,
        },
        {
          name: 'context',
          description: 'The retrieved context',
          required: true,
        },
      ],
    },
  ];
}

