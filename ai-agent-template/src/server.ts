import { routeAgentRequest, type Schedule } from "agents";

import { unstable_getSchedulePrompt } from "agents/schedule";

import { AIChatAgent } from "agents/ai-chat-agent";
import {
  createDataStreamResponse,
  generateId,
  streamText,
  type StreamTextOnFinishCallback,
  type ToolSet,
} from "ai";
//import { openai } from "@ai-sdk/openai";
import {anthropic} from "@ai-sdk/anthropic";
import { processToolCalls } from "./utils";
import { tools, executions } from "./tools";
// import { env } from "cloudflare:workers";
import { fiberplane } from "@fiberplane/agents";

//const model = openai("gpt-4o-2024-11-20");
const model = anthropic("claude-3-5-sonnet-latest");
// Cloudflare AI Gateway
// const openai = createOpenAI({
//   apiKey: env.OPENAI_API_KEY,
//   baseURL: env.GATEWAY_BASE_URL,
// });

/**
 * Chat Agent implementation that handles real-time AI chat interactions
 */
//export
export class ChatInternal extends AIChatAgent<Env> {
  /**
   * Handles incoming chat messages and manages the response stream
   * @param onFinish - Callback function executed when streaming completes
   */

  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    options?: { abortSignal?: AbortSignal }
  ) {
    // const mcpConnection = await this.mcp.connect(
    //   "https://path-to-mcp-server/sse"
    // );

    // Collect all tools, including MCP tools
    const allTools = {
      ...tools,
      ...this.mcp.unstable_getAITools(),
    };

    // Create a streaming response that handles both text and tool outputs
    const dataStreamResponse = createDataStreamResponse({
      execute: async (dataStream) => {
        // Process any pending tool calls from previous messages
        // This handles human-in-the-loop confirmations for tools
        const processedMessages = await processToolCalls({
          messages: this.messages,
          dataStream,
          tools: allTools,
          executions,
        });

        // Stream the AI response using Claude
        const result = streamText({
          model,
          system: `You are a helpful language learning tutor that can help users learn new languages through various interactive methods. You have access to several language learning tools:

📚 **Translation**: Translate text between languages
🃏 **Flashcards**: Create vocabulary flashcards with examples and pronunciation
✏️ **Grammar Check**: Check and correct grammar with explanations  
🧩 **Quizzes**: Generate vocabulary quizzes at different difficulty levels
💬 **Conversation Practice**: Start guided conversation practice sessions

You can also help with:
- Scheduling study sessions
- Tracking learning progress
- Managing MCP servers for additional tools
- General language learning advice

${unstable_getSchedulePrompt({ date: new Date() })}

Be encouraging, patient, and adapt to the user's language level. If the user asks to schedule a task, use the schedule tool to schedule the task.
`,
          messages: processedMessages,
          tools: allTools,
          onFinish: async (args) => {
            onFinish(
              args as Parameters<StreamTextOnFinishCallback<ToolSet>>[0]
            );
            // await this.mcp.closeConnection(mcpConnection.id);
          },
          onError: (error) => {
            console.error("Error while streaming:", error);
          },
          maxSteps: 10,
        });

        // Merge the AI response stream with tool execution outputs
        result.mergeIntoDataStream(dataStream);
      },
    });

    return dataStreamResponse;
  }
  async executeTask(description: string, task: Schedule<string>) {
    await this.saveMessages([
      ...this.messages,
      {
        id: generateId(),
        role: "user",
        content: `Running scheduled task: ${description}`,
        createdAt: new Date(),
      },
    ]);
  }
}

export class Chat extends ChatInternal {}

/**
 * Worker entry point that routes incoming requests to the appropriate handler
 */
export default {
  fetch: fiberplane(
    async (request: Request, env: Env, ctx: ExecutionContext) => {
      const url = new URL(request.url);

      if (url.pathname === "/check-open-ai-key") {
        const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
        return Response.json({
          success: hasOpenAIKey,
        });
      }

      // Handle API routes
      if (url.pathname.startsWith("/api/")) {
        return (
          (await routeAgentRequest(request, env)) ||
          new Response("API endpoint not found", { status: 404 })
        );
      }
      if (!process.env.OPENAI_API_KEY) {
        console.error(
          "OPENAI_API_KEY is not set, don't forget to set it locally in .dev.vars, and use `wrangler secret bulk .dev.vars` to upload it to production"
        );
      }
      return (
        // Route the request to our agent or return 404 if not found
        (await routeAgentRequest(request, env)) ||
        new Response("Not found", { status: 404 })
      );
    }
  ),
} satisfies ExportedHandler<Env>;

// export default {
//   async fetch(request: Request, env: Env, ctx: ExecutionContext) {
//     const url = new URL(request.url);

//     if (url.pathname === "/check-open-ai-key") {
//       const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
//       return Response.json({
//         success: hasOpenAIKey,
//       });
//     }
//     if (!process.env.OPENAI_API_KEY) {
//       console.error(
//         "OPENAI_API_KEY is not set, don't forget to set it locally in .dev.vars, and use `wrangler secret bulk .dev.vars` to upload it to production"
//       );
//     }
//     return (
//       // Route the request to our agent or return 404 if not found
//       (await routeAgentRequest(request, env)) ||
//       new Response("Not found", { status: 404 })
//     );
//   },
// } satisfies ExportedHandler<Env>;
