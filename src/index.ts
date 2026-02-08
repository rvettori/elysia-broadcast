/**
 * elysia-broadcast
 * 
 * Broadcast and SSE (Server-Sent Events) system for Elysia
 * with support for multiple channels per user
 * 
 * @module elysia-broadcast
 */

export { BroadcastManager } from './manager';
export { broadcastPlugin, broadcastManager } from './plugin';
export { streamPlugin } from './stream';
export type {
  BroadcastEvent,
  BroadcastCallback,
  UnsubscribeFunction,
  BroadcastPluginOptions,
  StreamPluginOptions
} from './types';
