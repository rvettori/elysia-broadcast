import { Elysia } from 'elysia';
import { broadcastPlugin } from './plugin';
import type { StreamPluginOptions, BroadcastEvent } from './types';

/**
 * Plugin that provides a generic SSE (Server-Sent Events) route
 * 
 * @param options - Configuration options
 * @returns Elysia Plugin configured with SSE route
 * 
 * @example
 * ```ts
 * import { Elysia } from 'elysia';
 * import { streamPlugin } from 'elysia-broadcast';
 * import { sessionAuth } from './auth';
 * 
 * const app = new Elysia()
 *   .use(streamPlugin({
 *     authMiddleware: sessionAuth,
 *     getUserId: (ctx) => ctx.store.user.userId
 *   }))
 *   .listen(3000);
 * 
 * // Client connects at: GET /stream/:channel
 * // Example: GET /stream/todos
 * ```
 */
export function streamPlugin(options: StreamPluginOptions = {}) {
  const {
    basePath = '/stream',
    userStoreName = 'user',
    userIdField = 'userId',
    getUserId,
    authMiddleware
  } = options;

  const plugin = new Elysia({ name: 'elysia-broadcast-stream' })
    .use(broadcastPlugin())
    // Public route to serve the JavaScript client
    .get('/vendor/elysia-sse.js', () =>
      Bun.file(new URL('./client.js', import.meta.url).pathname)
    );

  // Apply authentication middleware if provided
  if (authMiddleware) {
    plugin.onBeforeHandle(authMiddleware);
  }

  return plugin.get(`${basePath}/:channel`, async (context: any) => {
    const { params, store } = context;
    const { channel } = params;

    // Extract userId using custom function or fallback to store
    let userId: number | string;
    if (getUserId) {
      userId = getUserId(context);
    } else {
      const user = store[userStoreName];
      if (!user) {
        throw new Error(`User not found in store.${userStoreName}`);
      }
      userId = user[userIdField];
      if (userId === undefined) {
        throw new Error(`userId not found in user.${userIdField}`);
      }
    }

    // Optional log if pino is available
    if (store.pino) {
      store.pino.info({ userId, channel }, 'Client connected to SSE stream');
    }

    let unsubscribe: (() => void) | null = null;

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        // Send initial connection message
        controller.enqueue(encoder.encode(`: connected to ${channel}\n\n`));

        // Register listener for user channel events
        unsubscribe = store.broadcast.subscribe(channel, userId, (event: BroadcastEvent) => {
          try {
            const data = JSON.stringify({
              type: event.type,
              html: event.html,
              data: event.data
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } catch (error) {
            // Controller already closed, ignore
            if (store.pino) {
              store.pino.debug({ error, channel }, 'Error sending SSE event');
            }
          }
        });
      },
      cancel() {
        // Cleanup when connection closes
        if (store.pino) {
          store.pino.info({ userId, channel }, 'Client disconnected from SSE stream');
        }
        if (unsubscribe) {
          unsubscribe();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  });
}
