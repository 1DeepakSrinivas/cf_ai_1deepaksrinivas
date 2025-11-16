import { NextRequest, NextResponse } from 'next/server';
import { getMCPTools, executeMCPTool, getMCPResources, getMCPPrompts } from '@/lib/mcp-server';

/**
 * MCP Server Endpoint
 * Implements Model Context Protocol for Cloudflare Agents
 * Supports HTTP/SSE transport for remote MCP connections
 * https://developers.cloudflare.com/agents/model-context-protocol/
 */

// GET: List available tools, resources, and prompts
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const requestType = searchParams.get('type');

  switch (requestType) {
    case 'tools':
      return NextResponse.json({
        tools: getMCPTools(),
      });

    case 'resources':
      return NextResponse.json({
        resources: getMCPResources(),
      });

    case 'prompts':
      return NextResponse.json({
        prompts: getMCPPrompts(),
      });

    default:
      return NextResponse.json({
        tools: getMCPTools(),
        resources: getMCPResources(),
        prompts: getMCPPrompts(),
      });
  }
}

// POST: Execute tool calls
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method, params } = body;

    switch (method) {
      case 'tools/list':
        return NextResponse.json({
          tools: getMCPTools(),
        });

      case 'tools/call':
        if (!params || !params.name) {
          return NextResponse.json(
            { error: 'Tool name is required' },
            { status: 400 }
          );
        }

        try {
          const result = await executeMCPTool({
            name: params.name,
            arguments: params.arguments || {},
          });

          return NextResponse.json({
            content: [
              {
                type: 'text',
                text: JSON.stringify(result),
              },
            ],
          });
        } catch (error) {
          return NextResponse.json(
            {
              error: error instanceof Error ? error.message : 'Tool execution failed',
            },
            { status: 500 }
          );
        }

      case 'resources/list':
        return NextResponse.json({
          resources: getMCPResources(),
        });

      case 'prompts/list':
        return NextResponse.json({
          prompts: getMCPPrompts(),
        });

      default:
        return NextResponse.json(
          { error: `Unknown method: ${method}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('MCP server error:', error);
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  }
}

// SSE endpoint for long-lived connections (for remote MCP)
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

