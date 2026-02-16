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
 * import { broadcastPlugin } from '@rvettori/elysia-broadcast';
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
 * import { broadcastManager } from '@rvettori/elysia-broadcast';
 * 
 * // Use in background jobs, cron tasks, etc.
 * broadcastManager.broadcast('notifications', userId, {
 *   type: 'notification',
 *   data: { message: 'Background job completed!' }
 * });
 * ```
 */
export const broadcastManager = new BroadcastManager();



/**
 * Plugin para detectar requisições Alpine AJAX
 * Verifica headers específicos enviados pelo Alpine AJAX
 * 
 * Injeta `isAlpineRequest: boolean` no contexto do Elysia via derive
 * 
 * Headers verificados:
 * - x-alpine-request: 'true' (enviado pelo Alpine AJAX)
 * - x-alpine-target: ID do elemento alvo (opcional)
 * 
 * Usage:
 * ```ts
 * new Elysia()
 *   .use(alpineRequest)
 *   .get('/search', ({ isAlpineRequest }) => {
 *     if (isAlpineRequest) {
 *       return <SearchFragment />;  // Retorna fragmento HTML
 *     }
 *     return <FullPage />;  // Retorna página completa
 *   })
 * ```
 * 
 * @see {@link https://alpinejs.dev/plugins/ajax} - Alpine AJAX Plugin
 */
export const alpineRequest = new Elysia({ name: 'ajax-detection' })
  .derive({ as: 'global' }, ({ request, store }: any) => {
    const alpineHeader = request.headers.get('x-alpine-request');
    const alpineTarget = request.headers.get('x-alpine-target');

    // Alpine AJAX envia 'x-alpine-request' com valor 'true'
    const isAlpineRequest = alpineHeader === 'true';

    // Log detalhado para debug
    if (process.env.NODE_ENV !== 'production') {
      store.pino?.debug({
        isAlpineRequest,
        alpineHeader,
        alpineHeaderType: typeof alpineHeader,
        alpineTarget,
        allHeaders: Object.fromEntries(request.headers.entries()),
        url: request.url
      }, 'AJAX detection - Debug completo');
    }

    return {
      isAlpineRequest
    };
  });
