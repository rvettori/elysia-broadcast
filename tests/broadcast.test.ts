import { describe, it, expect, beforeEach } from 'bun:test';
import { BroadcastManager } from '../src/manager';

describe('BroadcastManager', () => {
  let manager: BroadcastManager;

  beforeEach(() => {
    manager = new BroadcastManager();
  });

  describe('subscribe', () => {
    it('should add a listener', () => {
      const callback = () => { };
      manager.subscribe('test', 1, callback);

      expect(manager.getConnectionCount('test', 1)).toBe(1);
    });

    it('should support multiple listeners on same channel', () => {
      const callback1 = () => { };
      const callback2 = () => { };

      manager.subscribe('test', 1, callback1);
      manager.subscribe('test', 1, callback2);

      expect(manager.getConnectionCount('test', 1)).toBe(2);
    });

    it('should return unsubscribe function', () => {
      const callback = () => { };
      const unsubscribe = manager.subscribe('test', 1, callback);

      expect(manager.getConnectionCount('test', 1)).toBe(1);

      unsubscribe();

      expect(manager.getConnectionCount('test', 1)).toBe(0);
    });

    it('should support string userId', () => {
      const callback = () => { };
      manager.subscribe('test', 'user-123', callback);

      expect(manager.getConnectionCount('test', 'user-123')).toBe(1);
    });
  });

  describe('broadcast', () => {
    it('should call listener with event', () => {
      let received: any = null;

      manager.subscribe('test', 1, (event) => {
        received = event;
      });

      const event = { type: 'update', data: { id: 123 } };
      manager.broadcast('test', 1, event);

      expect(received).toEqual(event);
    });

    it('should call multiple listeners', () => {
      let count = 0;

      manager.subscribe('test', 1, () => count++);
      manager.subscribe('test', 1, () => count++);
      manager.subscribe('test', 1, () => count++);

      manager.broadcast('test', 1, { type: 'test', data: {} });

      expect(count).toBe(3);
    });

    it('should not call listeners from different channels', () => {
      let called = false;

      manager.subscribe('channel1', 1, () => called = true);
      manager.broadcast('channel2', 1, { type: 'test', data: {} });

      expect(called).toBe(false);
    });

    it('should not call listeners from different users', () => {
      let called = false;

      manager.subscribe('test', 1, () => called = true);
      manager.broadcast('test', 2, { type: 'test', data: {} });

      expect(called).toBe(false);
    });

    it('should handle html property', () => {
      let received: any = null;

      manager.subscribe('test', 1, (event) => {
        received = event;
      });

      const event = {
        type: 'update',
        data: { id: 123 },
        html: '<div>Test</div>'
      };

      manager.broadcast('test', 1, event);

      expect(received.html).toBe('<div>Test</div>');
    });

    it('should broadcast to all users in channel without userId param', () => {
      let count = 0;

      manager.subscribe('test', 1, () => count++);
      manager.subscribe('test', 2, () => count++);
      manager.subscribe('test', 3, () => count++);
      manager.subscribe('other', 1, () => count++);

      manager.broadcast('test', { type: 'update', data: {} });

      expect(count).toBe(3);
    });

    it('should broadcast to all listeners of all users in channel', () => {
      let count = 0;

      manager.subscribe('test', 1, () => count++);
      manager.subscribe('test', 1, () => count++);
      manager.subscribe('test', 2, () => count++);

      manager.broadcast('test', { type: 'update', data: {} });

      expect(count).toBe(3);
    });

    it('should not broadcast to other channels when broadcasting to all', () => {
      let count = 0;

      manager.subscribe('channel1', 1, () => count++);
      manager.subscribe('channel1', 2, () => count++);
      manager.subscribe('channel2', 1, () => count++);

      manager.broadcast('channel1', { type: 'update', data: {} });

      expect(count).toBe(2);
    });

    it('should work with string userIds when broadcasting to all', () => {
      let count = 0;

      manager.subscribe('test', 'user-1', () => count++);
      manager.subscribe('test', 'user-2', () => count++);
      manager.subscribe('other', 'user-1', () => count++);

      manager.broadcast('test', { type: 'update', data: {} });

      expect(count).toBe(2);
    });
  });

  describe('getConnectionCount', () => {
    it('should return 0 for non-existent channel', () => {
      expect(manager.getConnectionCount('test', 1)).toBe(0);
    });

    it('should return correct count', () => {
      manager.subscribe('test', 1, () => { });
      manager.subscribe('test', 1, () => { });

      expect(manager.getConnectionCount('test', 1)).toBe(2);
    });
  });

  describe('getTotalConnections', () => {
    it('should return 0 initially', () => {
      expect(manager.getTotalConnections()).toBe(0);
    });

    it('should count all connections', () => {
      manager.subscribe('channel1', 1, () => { });
      manager.subscribe('channel1', 1, () => { });
      manager.subscribe('channel2', 1, () => { });
      manager.subscribe('channel1', 2, () => { });

      expect(manager.getTotalConnections()).toBe(4);
    });
  });

  describe('getActiveChannels', () => {
    it('should return empty array initially', () => {
      expect(manager.getActiveChannels()).toEqual([]);
    });

    it('should list all active channels', () => {
      manager.subscribe('channel1', 1, () => { });
      manager.subscribe('channel2', 1, () => { });
      manager.subscribe('channel1', 2, () => { });

      const channels = manager.getActiveChannels();

      expect(channels).toContain('channel1:1');
      expect(channels).toContain('channel2:1');
      expect(channels).toContain('channel1:2');
      expect(channels.length).toBe(3);
    });
  });

  describe('clearChannel', () => {
    it('should remove all connections from channel', () => {
      manager.subscribe('test', 1, () => { });
      manager.subscribe('test', 1, () => { });

      expect(manager.getConnectionCount('test', 1)).toBe(2);

      manager.clearChannel('test', 1);

      expect(manager.getConnectionCount('test', 1)).toBe(0);
    });

    it('should not affect other channels', () => {
      manager.subscribe('channel1', 1, () => { });
      manager.subscribe('channel2', 1, () => { });

      manager.clearChannel('channel1', 1);

      expect(manager.getConnectionCount('channel1', 1)).toBe(0);
      expect(manager.getConnectionCount('channel2', 1)).toBe(1);
    });
  });

  describe('clearAll', () => {
    it('should remove all connections', () => {
      manager.subscribe('channel1', 1, () => { });
      manager.subscribe('channel2', 1, () => { });
      manager.subscribe('channel1', 2, () => { });

      expect(manager.getTotalConnections()).toBe(3);

      manager.clearAll();

      expect(manager.getTotalConnections()).toBe(0);
      expect(manager.getActiveChannels()).toEqual([]);
    });
  });
});
