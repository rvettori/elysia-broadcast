import { Elysia } from 'elysia';
import { BroadcastManager } from './manager';
import type { BroadcastPluginOptions } from './types';

/**
 * Elysia plugin that injects the BroadcastManager into the store
 * 
 * @param options - Configuration options
 * @returns Configured Elysia plugin
 * 
 * @example
 * ```ts
 * import { Elysia } from 'elysia';
 * import { broadcastPlugin } from 'elysia-broadcast';
 * 
 * const app = new Elysia()
 *   .use(broadcastPlugin())
 *   .get('/trigger', ({ store }) => {
 *     store.broadcast.broadcast('channel', userId, {
 *       type: 'update',
 *       data: { message: 'Hello!' }
 *     });
 *     return { success: true };
 *   });
 * ```
 */
export function broadcastPlugin(options: BroadcastPluginOptions = {}) {
  const { stateName = 'broadcast' } = options;
  const manager = new BroadcastManager();

  return new Elysia({ name: 'elysia-broadcast' })
    .state(stateName, manager);
}

/**
 * Singleton instance of BroadcastManager for cases where you need
 * to access the manager outside of the Elysia context
 * 
 * @example
 * ```ts
 * import { broadcastManager } from 'elysia-broadcast';
 * 
 * // Use in background jobs, cron tasks, etc.
 * broadcastManager.broadcast('notifications', userId, {
 *   type: 'notification',
 *   data: { message: 'Background job completed!' }
 * });
 * ```
 */
export const broadcastManager = new BroadcastManager();
