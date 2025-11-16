import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { executeMCPTool } from '@/lib/mcp-server';

const WEBHOOK_SECRET = process.env.CLOUDFLARE_WEBHOOK_SECRET || '';

/**
 * Verify Cloudflare webhook signature
 */
function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    // If no secret configured, allow all (for development)
    return true;
  }

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Cloudflare Agents MCP Webhook
 * Handles MCP tool calls from Cloudflare Agents
 * https://developers.cloudflare.com/agents/model-context-protocol/
 */
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-cloudflare-signature') || '';
    const body = await req.text();

    // Verify signature if secret is configured
    if (WEBHOOK_SECRET && !verifySignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    
    // Handle MCP tool calls from Cloudflare Agents
    if (payload.method === 'tools/call' && payload.params) {
      try {
        const result = await executeMCPTool({
          name: payload.params.name,
          arguments: payload.params.arguments || {},
        });

        return NextResponse.json({
          success: true,
          result,
          tool: payload.params.name,
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: error instanceof Error ? error.message : 'Tool execution failed',
          },
          { status: 500 }
        );
      }
    }

    // Legacy webhook format support
    const { action, data } = payload;

    // Handle different Cloudflare Agent actions
    switch (action) {
      case 'reindex':
        // Trigger reindexing using MCP tool
        if (data?.fileId) {
          const result = await executeMCPTool({
            name: 'reindex_document',
            arguments: {
              fileId: data.fileId,
              userId: data.userId || 'default-user',
            },
          });
          return NextResponse.json({
            success: true,
            message: 'Reindexing triggered',
            action,
            result,
          });
        }
        return NextResponse.json({
          success: true,
          message: 'Reindexing triggered',
          action,
        });

      case 'summarize':
        // Trigger summarization using MCP tool
        if (data?.fileId) {
          const result = await executeMCPTool({
            name: 'summarize_document',
            arguments: {
              fileId: data.fileId,
              userId: data.userId || 'default-user',
            },
          });
          return NextResponse.json({
            success: true,
            message: 'Summarization triggered',
            action,
            result,
          });
        }
        return NextResponse.json({
          success: true,
          message: 'Summarization triggered',
          action,
        });

      case 'search':
        // Trigger search using MCP tool
        if (data?.query) {
          const result = await executeMCPTool({
            name: 'search_documents',
            arguments: {
              query: data.query,
              userId: data.userId || 'default-user',
              maxResults: data.maxResults || 5,
            },
          });
          return NextResponse.json({
            success: true,
            message: 'Search completed',
            action,
            result,
          });
        }
        return NextResponse.json({
          success: true,
          message: 'Search triggered',
          action,
        });

      case 'background_task':
        // Handle background tasks
        return NextResponse.json({
          success: true,
          message: 'Background task received',
          action,
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Cloudflare webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

