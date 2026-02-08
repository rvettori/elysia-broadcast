// @ts-nocheck
/**
 * Complete usage example of elysia-broadcast
 * 
 * This example demonstrates:
 * - Simple authentication
 * - Event broadcasting
 * - SSE stream
 * - Multiple channels
 */

import { Elysia } from 'elysia';
import { broadcastPlugin, streamPlugin } from 'elysia-broadcast';

// Database simulation
const users = new Map([
  [1, { id: 1, name: 'Alice' }],
  [2, { id: 2, name: 'Bob' }]
]);

const todos = new Map<number, Array<{ id: number; task: string; done: boolean }>>();

// Simple authentication middleware
const authMiddleware = ({ headers, store }: any) => {
  const userId = headers.get('x-user-id');
  if (!userId) {
    throw new Error('Unauthorized');
  }
  store.user = { userId: Number(userId) };
};

// Elysia Application
const app = new Elysia()
  // Broadcast plugins
  .use(broadcastPlugin())
  .use(streamPlugin({
    authMiddleware,
    getUserId: (ctx) => ctx.store.user.userId
  }))

  // Todos Routes
  .group('/todos', (app) => app
    .onBeforeHandle(authMiddleware)

    // List todos
    .get('/', ({ store }) => {
      const userId = store.user.userId;
      return todos.get(userId) || [];
    })

    // Create todo
    .post('/', ({ store, body }: any) => {
      const userId = store.user.userId;
      const userTodos = todos.get(userId) || [];

      const newTodo = {
        id: userTodos.length + 1,
        task: body.task,
        done: false
      };

      userTodos.push(newTodo);
      todos.set(userId, userTodos);

      // Broadcast to user's 'todos' channel
      store.broadcast.broadcast('todos', userId, {
        type: 'todo.created',
        data: newTodo
      });

      return newTodo;
    })

    // Update todo
    .patch('/:id', ({ store, params, body }: any) => {
      const userId = store.user.userId;
      const userTodos = todos.get(userId) || [];
      const todo = userTodos.find(t => t.id === Number(params.id));

      if (!todo) {
        throw new Error('Todo not found');
      }

      Object.assign(todo, body);

      // Broadcast update
      store.broadcast.broadcast('todos', userId, {
        type: 'todo.updated',
        data: todo
      });

      return todo;
    })

    // Delete todo
    .delete('/:id', ({ store, params }: any) => {
      const userId = store.user.userId;
      const userTodos = todos.get(userId) || [];
      const index = userTodos.findIndex(t => t.id === Number(params.id));

      if (index === -1) {
        throw new Error('Todo not found');
      }

      const [deleted] = userTodos.splice(index, 1);
      todos.set(userId, userTodos);

      // Broadcast deletion
      store.broadcast.broadcast('todos', userId, {
        type: 'todo.deleted',
        data: { id: deleted.id }
      });

      return { success: true };
    })
  )

  // Notifications Routes
  .group('/notifications', (app) => app
    .onBeforeHandle(authMiddleware)

    .post('/send', ({ store, body }: any) => {
      const { recipientId, message } = body;

      // Broadcast to recipient's notifications channel
      store.broadcast.broadcast('notifications', recipientId, {
        type: 'notification.new',
        data: {
          from: store.user.userId,
          message,
          timestamp: new Date().toISOString()
        }
      });

      return { success: true };
    })
  )

  // Admin Routes
  .group('/admin', (app) => app
    .onBeforeHandle(authMiddleware)

    // Broadcast announcement to ALL users
    .post('/announce', ({ store, body }: any) => {
      const { message, channel = 'notifications' } = body;

      // Broadcast to ALL users in the channel (no userId param)
      store.broadcast.broadcast(channel, {
        type: 'system.announcement',
        data: {
          message,
          timestamp: new Date().toISOString(),
          priority: 'high'
        }
      });

      return {
        success: true,
        broadcastTo: 'all users',
        channel
      };
    })
  )

  // Server status
  .get('/status', ({ store }) => {
    return {
      totalConnections: store.broadcast.getTotalConnections(),
      activeChannels: store.broadcast.getActiveChannels()
    };
  })

  .listen(3000);

console.log('🚀 Server running at http://localhost:3000');
console.log('');
console.log('📝 Usage examples:');
console.log('');
console.log('1. Connect to SSE (todos):');
console.log('   curl -H "x-user-id: 1" http://localhost:3000/stream/todos');
console.log('');
console.log('2. Create a todo:');
console.log('   curl -X POST -H "x-user-id: 1" -H "Content-Type: application/json" \\');
console.log('     -d \'{"task":"Buy bread"}\' http://localhost:3000/todos');
console.log('');
console.log('3. Send notification to specific user:');
console.log('   curl -X POST -H "x-user-id: 1" -H "Content-Type: application/json" \\');
console.log('     -d \'{"recipientId":2,"message":"Hello!"}\' http://localhost:3000/notifications/send');
console.log('');
console.log('4. Broadcast announcement to ALL users:');
console.log('   curl -X POST -H "x-user-id: 1" -H "Content-Type: application/json" \\');
console.log('     -d \'{"message":"System maintenance at 3pm"}\' http://localhost:3000/admin/announce');
console.log('');
console.log('5. View status:');
console.log('   curl http://localhost:3000/status');
