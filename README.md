# @rvettori/elysia-broadcast

Broadcast and Server-Sent Events (SSE) system for Elysia with multi-channel per-user support.

## 🚀 Features

- ✅ **Multiple channels per user** - Each user can connect to multiple channels simultaneously
- ✅ **Type-safe** - Fully typed with TypeScript
- ✅ **SSE out-of-the-box** - Ready-to-use Server-Sent Events plugin with client library
- ✅ **Alpine.js compatible** - Works seamlessly with Alpine.morph and x-sync
- ✅ **JSON events** - Dispatches native `CustomEvent` on `document` for JSON-only broadcasts
- ✅ **Flexible** - Use `BroadcastManager` standalone or as an Elysia plugin
- ✅ **Lightweight** - Zero dependencies besides Elysia
- ✅ **Tested** - Complete test coverage

## 📦 Installation

```bash
bun add @rvettori/elysia-broadcast
```

## 🎯 Basic Usage

### Server Setup

```typescript
import { Elysia } from 'elysia';
import { broadcastPlugin, streamPlugin } from '@rvettori/elysia-broadcast';

const app = new Elysia()
  .use(broadcastPlugin())
  .use(streamPlugin({
    authMiddleware: yourAuthMiddleware,
    getUserId: (ctx) => ctx.store.user.userId
  }))
  .post('/todos', ({ store }) => {
    // Create todo...
    
    // Broadcast to user's 'todos' channel
    store.broadcast.broadcast('todos', userId, {
      type: 'todo.created',
      data: { id: 1, task: 'New task' },
      html: '<div x-sync id="todo-list">...</div>' // Alpine-compatible
    });
    
    return { success: true };
  })
  .listen(3000);
```

### Client Setup

The `streamPlugin` automatically provides a client library at `/vendor/elysia-sse.js`:

```html
<!-- Load the client library -->
<script src="/vendor/elysia-sse.js"></script>

<!-- Connect to a channel -->
<script>
  ElysiaSSE.connect('todos');
</script>

<!-- Elements with x-sync and id will be auto-updated -->
<div x-sync id="todo-list">
  <!-- Content here will be updated via SSE -->
</div>
```

### BroadcastManager Standalone

```typescript
import { BroadcastManager } from '@rvettori/elysia-broadcast';

const manager = new BroadcastManager();

// Subscribe
const unsubscribe = manager.subscribe('notifications', 123, (event) => {
  console.log('Event received:', event.type, event.data);
});

// Broadcast to specific user
manager.broadcast('notifications', 123, {
  type: 'notification.new',
  data: { message: 'Hello!' }
});

// Broadcast to ALL users in channel
manager.broadcast('notifications', {
  type: 'system.announcement',
  data: { message: 'System maintenance at 3pm' }
});

// Cleanup
unsubscribe();
```

## 📚 API

### `broadcastPlugin(options?)`

Elysia plugin that injects `BroadcastManager` into the store.

**Options:**
- `stateName?: string` - State name (default: `'broadcast'`)

**Example:**
```typescript
app.use(broadcastPlugin({ stateName: 'events' }));

app.get('/trigger', ({ store }) => {
  store.events.broadcast('channel', userId, { ... });
});
```

### `streamPlugin(options?)`

Plugin that creates a generic SSE route.

**Options:**
```typescript
interface StreamPluginOptions {
  basePath?: string;              // Default: '/stream'
  userStoreName?: string;         // Default: 'user'
  userIdField?: string;           // Default: 'userId'
  getUserId?: (context) => number | string;
  authMiddleware?: any;
}
```

**Example:**
```typescript
app.use(streamPlugin({
  basePath: '/events',
  authMiddleware: sessionAuth,
  getUserId: (ctx) => ctx.store.currentUser.id
}));

// Client: GET /events/todos
```

### `BroadcastManager`

Main event management class.

#### Methods

**`subscribe(channel, userId, callback)`**

Register a listener.

```typescript
const unsubscribe = manager.subscribe('todos', 123, (event) => {
  console.log(event.type, event.data);
});
```

**`broadcast(channel, userId, event)`** | **`broadcast(channel, event)`**

Send event to all listeners on the channel/user. Omit userId to broadcast to all users in the channel.

```typescript
// Broadcast to specific user
manager.broadcast('todos', 123, {
  type: 'update',
  data: { id: 1 },
  html: '<div>...</div>' // Optional
});

// Broadcast to ALL users in channel (no userId)
manager.broadcast('todos', {
  type: 'system.announcement',
  data: { message: 'New feature available!' }
});
```

**`getConnectionCount(channel, userId)`**

Returns number of active connections for channel/user.

**`getTotalConnections()`**

Returns total number of connections.

**`getActiveChannels()`**

Lists all active channels.

**`clearChannel(channel, userId)`**

Removes all connections from a channel.

**`clearAll()`**

Removes all connections.

## 🎨 Frontend Integration

### Alpine.js + SSE (Recommended)

```html
<!-- 1. Load libraries -->
<script src="/vendor/elysia-sse.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"></script>

<!-- 2. Connect to SSE channel -->
<script>
  ElysiaSSE.connect('todos');
</script>

<!-- 3. Elements with x-sync and id will be auto-updated -->
<div x-sync id="todo-list" x-data="{ todos: [] }">
  <template x-for="todo in todos">
    <div x-text="todo.task"></div>
  </template>
</div>

<!-- Multiple elements can be updated simultaneously -->
<div x-sync id="todo-stats">Total: 5</div>
<div x-sync id="user-badge">👤 John</div>
```

### Vanilla JavaScript

```html
<script src="/vendor/elysia-sse.js"></script>
<script>
  // Basic connection
  ElysiaSSE.connect('notifications');
  
  // With custom handler (receives the full event object)
  ElysiaSSE.connect('messages', {
    onUpdate: (data) => {
      console.log('New message:', data);
      // Custom DOM manipulation
    },
    onConnect: () => console.log('Connected!'),
    onError: (err) => console.error('Error:', err)
  });
</script>
```

### JSON Events (CustomEvent)

When a broadcast includes a `data` payload, the client automatically dispatches a native `CustomEvent` on `document` with the name `sse:<type>`. This works regardless of whether `html` is also present.

**Server:**
```typescript
store.broadcast.broadcast('notifications', userId, {
  type: 'notification.new',
  data: { title: 'New comment', message: 'Someone replied to your post' }
});
```

**Client — Vanilla JS:**
```html
<script src="/vendor/elysia-sse.js"></script>
<script>
  ElysiaSSE.connect('notifications');

  document.addEventListener('sse:notification.new', (e) => {
    const { title, message } = e.detail.data;
    console.log(title, message);
  });
</script>
```

**Client — Alpine.js:**
```html
<div x-data="{ count: 0 }" @sse:notification.new.document="count++">
  <span x-text="count"></span> unread
</div>
```

When `html` and `data` are sent together, both are processed: the DOM is updated via Alpine.morph **and** the `CustomEvent` is dispatched.

```typescript
// Both html update and CustomEvent will fire
store.broadcast.broadcast('todos', userId, {
  type: 'todo.created',
  data: { id: 1, task: 'New task' },
  html: '<div x-sync id="todo-list">...</div>'
});
```

### HTMX + SSE

```html
<div x-data="{ todos: [] }" x-sync id="todo-list">
  <template x-for="todo in todos">
    <div x-text="todo.task"></div>
  </template>
</div>

<script>
  const eventSource = new EventSource('/stream/todos');
  
  eventSource.onmessage = (event) => {
    const { type, html, data } = JSON.parse(event.data);
    
    // With Alpine AJAX: updates elements by ID
    if (html) {
      Alpine.morph(document.getElementById('todo-list'), html);
    }
  };
</script>
```

### HTMX + SSE

```html
<div hx-ext="sse" sse-connect="/stream/todos">
  <div id="todo-list" sse-swap="message">
    <!-- Todo list -->
  </div>
</div>
```

## 🔧 Use Cases

### Real-time Dashboard

```typescript
app.post('/analytics/track', ({ store, body }) => {
  // Process event...
  
  store.broadcast.broadcast('dashboard', userId, {
    type: 'metric.updated',
    data: { visitors: 1234, sales: 5678 }
  });
});
```

### Notifications

```typescript
// Send to specific user
app.post('/notifications/send', ({ store, body }) => {
  store.broadcast.broadcast('notifications', recipientId, {
    type: 'notification.new',
    data: { 
      title: 'New comment',
      message: 'Someone commented on your post'
    }
  });
});

// Send to all users (system announcement)
app.post('/admin/announce', ({ store, body }) => {
  store.broadcast.broadcast('notifications', {
    type: 'system.announcement',
    data: { 
      title: 'System Update',
      message: 'New features available!'
    }
  });
});
```

### Chat/Messages

```typescript
app.post('/messages', ({ store, body }) => {
  // Save message...
  
  // Notify recipient
  store.broadcast.broadcast('messages', recipientId, {
    type: 'message.new',
    data: { from: senderId, text: body.text }
  });
});
```

## 🧪 Testing

```bash
bun test
```

## 📝 Types

```typescript
interface BroadcastEvent {
  type: string;
  data: any;
  html?: string;
}

type BroadcastCallback = (event: BroadcastEvent) => void;
type UnsubscribeFunction = () => void;
```

## 🛠️ Build

```bash
bun run build
```

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Open an issue or PR.
