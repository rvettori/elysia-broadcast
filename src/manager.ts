import { EventEmitter } from 'node:events';
import type { BroadcastEvent, BroadcastCallback, UnsubscribeFunction } from './types';

/**
 * Generic event manager for SSE (Server-Sent Events)
 * Supports multiple channels per user (e.g., "todos", "users")
 * 
 * @example
 * ```ts
 * const manager = new BroadcastManager();
 * 
 * // Subscribe to events
 * const unsubscribe = manager.subscribe('todos', 123, (event) => {
 *   console.log('Received:', event);
 * });
 * 
 * // Broadcast event
 * manager.broadcast('todos', 123, {
 *   type: 'update',
 *   data: { id: 1, task: 'New task' }
 * });
 * 
 * // Cleanup
 * unsubscribe();
 * ```
 */
export class BroadcastManager extends EventEmitter {
  private connections = new Map<string, Set<BroadcastCallback>>();

  /**
   * Creates a unique key for channel + userId
   * @private
   */
  private getChannelKey(channel: string, userId: number | string): string {
    return `${channel}:${userId}`;
  }

  /**
   * Registers an SSE listener for a specific user channel
   * 
   * @param channel - Channel name (e.g., "todos", "users")
   * @param userId - User ID (number or string)
   * @param callback - Function to be called when there are events
   * @returns Cleanup function to remove the listener
   * 
   * @example
   * ```ts
   * const unsubscribe = manager.subscribe('todos', 123, (event) => {
   *   console.log('New event:', event.type, event.data);
   * });
   * 
   * // Later...
   * unsubscribe();
   * ```
   */
  subscribe(channel: string, userId: number | string, callback: BroadcastCallback): UnsubscribeFunction {
    const key = this.getChannelKey(channel, userId);

    if (!this.connections.has(key)) {
      this.connections.set(key, new Set());
    }
    this.connections.get(key)!.add(callback);

    // Return cleanup function
    return () => {
      const channelCallbacks = this.connections.get(key);
      if (channelCallbacks) {
        channelCallbacks.delete(callback);
        if (channelCallbacks.size === 0) {
          this.connections.delete(key);
        }
      }
    };
  }

  /**
   * Sends event to all listeners of a specific user channel
   * 
   * @param channel - Channel name
   * @param userId - User ID (number or string)
   * @param event - Event to be sent
   * 
   * @example
   * ```ts
   * manager.broadcast('todos', 123, {
   *   type: 'todo.created',
   *   data: { id: 1, task: 'New task', done: false },
   *   html: '<div id="todo-list">...</div>'
   * });
   * ```
   */
  broadcast(channel: string, userId: number | string, event: BroadcastEvent): void {
    const key = this.getChannelKey(channel, userId);
    const channelCallbacks = this.connections.get(key);

    if (channelCallbacks) {
      channelCallbacks.forEach(callback => callback(event));
    }
  }

  /**
   * Returns number of active connections for a channel/user
   * 
   * @param channel - Channel name
   * @param userId - User ID
   * @returns Number of active connections
   */
  getConnectionCount(channel: string, userId: number | string): number {
    const key = this.getChannelKey(channel, userId);
    return this.connections.get(key)?.size || 0;
  }

  /**
   * Returns total number of active connections across all channels
   * 
   * @returns Total number of connections
   */
  getTotalConnections(): number {
    let total = 0;
    this.connections.forEach(callbacks => total += callbacks.size);
    return total;
  }

  /**
   * Lists all active channels (format: "channel:userId")
   * 
   * @returns Array of active channel keys
   */
  getActiveChannels(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Removes all connections from a specific user channel
   * 
   * @param channel - Channel name
   * @param userId - User ID
   */
  clearChannel(channel: string, userId: number | string): void {
    const key = this.getChannelKey(channel, userId);
    this.connections.delete(key);
  }

  /**
   * Removes all connections from all channels
   */
  clearAll(): void {
    this.connections.clear();
  }
}
