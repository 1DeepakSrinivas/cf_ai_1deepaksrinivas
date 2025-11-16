import { NextRequest } from 'next/server';
import { getMCPTools, executeMCPTool } from '@/lib/mcp-server';

/**
 * Server-Sent Events (SSE) endpoint for MCP
 * Supports long-lived connections for remote MCP clients
 * https://developers.cloudflare.com/agents/model-context-protocol/transport/
 */

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({
        type: 'connection',
        message: 'MCP Server connected',
        tools: getMCPTools().map((t) => t.name),
      });

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        send({ type: 'heartbeat', timestamp: Date.now() });
      }, 30000); // Every 30 seconds

      // Handle client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tool, arguments: args } = body;

    if (!tool) {
      return new Response(
        JSON.stringify({ error: 'Tool name is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await executeMCPTool({
      name: tool,
      arguments: args || {},
    });

    return new Response(
      JSON.stringify({ result }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Tool execution failed',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

