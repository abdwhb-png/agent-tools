---
name: laravel-realtime
description: Use when implementing realtime live-updating UIs, WebSockets, event broadcasting, or listening to server events via Reverb/Pusher in Laravel with React or Vue.
---

# Laravel Realtime Broadcasting

## Overview
Laravel event broadcasting allows you to share server-side events (`ShouldBroadcast`) with your client-side JavaScript application using WebSockets (e.g., Laravel Reverb). This enables live-updating user interfaces without polling.

## When to Use
- You need to update the UI instantly when other users take actions (e.g., chat apps, notifications).
- You want to track online presence (who is currently viewing a page).
- You need live data feeds (stocks, bidding, live delivery tracking).
- You see `Pusher`, `Reverb`, or WebSockets mentioned in the requirements.

## Quick Reference

| Action | React Hook (`@laravel/echo-react`) | Vue Composable (`@laravel/echo-vue`) |
|--------|------------------------------------|--------------------------------------|
| Setup / Init | `configureEcho(...)` before using hooks | `configureEcho(...)` before composables |
| Listen (Private) | `useEcho('channel', 'Event', callback)` | `useEcho('channel', 'Event', callback)` |
| Listen (Public) | `useEchoPublic('channel', 'Event', cb)`| `useEchoPublic('channel', 'Event', cb)`|
| Listen (Presence) | `useEchoPresence('channel', 'Event', cb)` | `useEchoPresence('channel', 'Event', cb)` |
| Model events | `useEchoModel('App.Models.X', id, ['Event'], cb)` | `useEchoModel('App.Models.X', id, ['Event'], cb)` |
| Connection state | `const status = useConnectionStatus()` | `const status = useConnectionStatus()` |

## Server-Side Implementation (Backend)

### 1. Installation
Install broadcasting and your preferred driver (e.g., Reverb):
```bash
php artisan install:broadcasting --reverb
```
*(This sets up `config/broadcasting.php`, `routes/channels.php`, and requires `.env` variables).*

### 2. Defining a Broadcast Event
Any event implementing `ShouldBroadcast` will be sent to the WebSockets.

```php
namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Queue\SerializesModels;

class OrderShipmentStatusUpdated implements ShouldBroadcast
{
    use SerializesModels;

    public function __construct(public Order $order) {}

    public function broadcastOn(): array
    {
        // Broadcast on a private channel specific to this order
        return [
            new PrivateChannel('orders.'.$this->order->id),
        ];
    }
}
```

### 3. Authorize Private Channels
In `routes/channels.php`:
```php
use App\Models\User;
use App\Models\Order;

Broadcast::channel('orders.{orderId}', function (User $user, int $orderId) {
    return $user->id === Order::findOrNew($orderId)->user_id;
});
```

*(You can also use Model Broadcasting via `BroadcastsEvents` trait on your models to skip creating dedicated Event classes).*

## Client-Side Implementation (Frontend)

Laravel 12 changed how Echo integrates with frontend frameworks. Instead of manually instantiating `window.Echo`, use the official `@laravel/echo-react` or `@laravel/echo-vue` packages.

### 1. Installation
Depending on your framework:
```bash
npm install @laravel/echo-react
# OR
npm install @laravel/echo-vue
```

### 2. Initial Configuration
Call `configureEcho` in your app's bootstrap **before** rendering components that use the hooks/composables (e.g., in `resources/js/bootstrap.js`, `resources/js/app.tsx`, or `resources/js/app.ts`).

```typescript
import { configureEcho } from "@laravel/echo-react"; // or "@laravel/echo-vue"

configureEcho({
    broadcaster: "reverb",
    // Options below auto-fill based on Reverb/Pusher conventions using your .env (VITE_REVERB_APP_KEY, etc.)
    // You only need to explicitly pass them if overriding defaults.
});
```

### 3. Listening to Events
Hooks/composables automatically handle subscribing, and they automatically unsubscribe (leave) the channel when the component unmounts.

#### React Example
```tsx
import { useConnectionStatus, useEcho } from "@laravel/echo-react";

export default function OrderTracker({ orderId }: { orderId: number }) {
    const status = useConnectionStatus(); // 'connected', 'connecting', 'disconnected', etc.

    useEcho(
        `orders.${orderId}`,
        "OrderShipmentStatusUpdated",
        (e: any) => {
            console.log("Order updated!", e.order);
        }
    );

    // Tip: Event payload public properties are available on the 'e' object.

    return <div>Connection: {status}</div>;
}
```

#### Vue Example
```vue
<script setup lang="ts">
import { useConnectionStatus, useEcho } from "@laravel/echo-vue";

const props = defineProps<{ orderId: number }>();
const status = useConnectionStatus();

useEcho(
    `orders.${props.orderId}`,
    "OrderShipmentStatusUpdated",
    (e: any) => {
        console.log("Order updated!", e.order);
    }
);
</script>

<template>
    <div>Connection: {{ status }}</div>
</template>
```

### Manual Control (Stop Listening / Leaving)
If you need imperative control over the subscription:
```typescript
const { leaveChannel, leave, stopListening, listen } = useEcho(
    `orders.${orderId}`,
    "OrderShipmentStatusUpdated",
    (e) => { console.log(e); }
);

// Programmatically stop listening
stopListening();
// Leave the channel entirely
leaveChannel();
```

## Common Mistakes

- **Forgetting `configureEcho`:** Using `useEcho` without configuring Echo will result in connection errors. Always configure it early in your bundle.
- **Prefixing names:** By default, backend events are broadcasted using their base class name. If `broadcastAs` is defined in the event to return a custom name (e.g. `server.created`), you must listen with a dot prefix (`.server.created`).
- **Manual leaving in unmount:** Echo hooks (`useEcho`, `useEchoPublic`, etc.) automatically manage cleanup when components unmount. Only manually call `leaveChannel()` if you need to leave the channel conditionally before unmount.
- **Queue Worker Missing:** Broadcast events are pushed to the queue. If you are developing locally and events aren't arriving, ensure `php artisan queue:work` is running.
- **Empty payload:** Ensure properties in your Laravel Event class are `public`. Only public properties are serialized to the frontend automatically.
