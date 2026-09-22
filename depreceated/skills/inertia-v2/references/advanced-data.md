# Advanced Data Loading (Inertia v2)

Inertia v2 introduces powerful new capabilities for managing data loading, including deferred props, polling, lazy loading, and prefetching.

## 1. Deferred Props

Defer fetching expensive data until after the specific page has rendered. This improves perceived performance.

### Server Side
Use `Inertia::defer()` to wrap expensive data calls.

```php
// Laravel
return Inertia::render('Dashboard', [
    'users' => User::all(), // Loaded immediately
    'stats' => Inertia::defer(fn () => Stats::expensiveCalculation()), // Deferred
    'history' => Inertia::defer(fn () => History::get(), 'group_name'), // Grouped
]);
```

### Client Side
Use the `<Deferred>` component to wrap UI that depends on deferred data.

```javascript
// Vue
import { Deferred } from '@inertiajs/vue3'

<Deferred data="stats">
  <template #fallback>
    <div>Loading stats...</div>
  </template>

  <StatsCard :stats="stats" />
</Deferred>
```

```javascript
// React
import { Deferred } from '@inertiajs/react'

<Deferred data="stats" fallback={<div>Loading stats...</div>}>
  <StatsCard stats={stats} />
</Deferred>
```

---

## 2. Polling

Automatically poll the server for fresh data.

### Usage
Use the `usePoll` hook.

```javascript
// Vue
import { usePoll } from '@inertiajs/vue3'

usePoll(5000)

// React
import { usePoll } from '@inertiajs/react'

usePoll(5000)
```

---

## 3. Load When Visible (Lazy Loading)

Load data only when a specific element enters the viewport. Ideal for infinite scrolls or heavy lists.

### Usage
Use the `<WhenVisible>` component.

```javascript
// Vue
import { WhenVisible } from '@inertiajs/vue3'

<WhenVisible data="permissions" :buffer="500">
  <template #fallback>
    <div>Loading permissions...</div>
  </template>

  <PermissionList :items="permissions" />
</WhenVisible>
```

```javascript
// React
import { WhenVisible } from '@inertiajs/react'

<WhenVisible data="permissions" buffer={500} fallback={<div>Loading permissions...</div>}>
  <PermissionList items={permissions} />
</WhenVisible>
```

**Props:**
- `data`: The prop name to load.
- `buffer`: Pixels before visibility to start loading.
- `always`: Reload every time it becomes visible (good for infinite scroll triggers).
- `as`: Render as specific element (default `div`).

---

## 4. Prefetching

Prefetch data for future navigations to make them instant.

### Link Prefetching
Add the `prefetch` prop to `<Link>`.

```javascript
// Prefetch on hover (default 75ms delay)
<Link href="/users" prefetch>Users</Link>

// Prefetch on mount
<Link href="/users" prefetch="mount">Users</Link>

// Prefetch on click (mousedown)
<Link href="/users" prefetch="click">Users</Link>
```

### Caching
Control how long prefetched data stays fresh using `cache-for` (default 30s).

```javascript
// Vue
<Link href="/users" prefetch cache-for="1m">Users</Link>

// React
<Link href="/users" prefetch cacheFor="1m">Users</Link>
```

### Programmatic Prefetching

```javascript
// Vue
import { router } from '@inertiajs/vue3'

router.prefetch('/users', { method: 'get' }, { cacheFor: '10s' })

// React
import { router } from '@inertiajs/react'

router.prefetch('/users', { method: 'get' }, { cacheFor: '10s' })
```

---

## 5. Merging Props

When reloading data provided by the server, you might want to merge it with existing data (e.g., infinite scroll) instead of replacing it.

### Server Side
Use `Inertia::merge()` (if supported by adapter, or return array that client knows to merge).
*Note: Typically merging is handled by the client resetting behavior, but v2 has specific merge patterns.*

### Client Side
When making a visit, you can specify `only` to partial reload.
To append data (like infinite scroll), the server should return the new chunk, and you might need custom logic or use the `merge` prop feature if available in specific adapters or handle it in `onSuccess`.

*Note: Check specific adapter docs for `merge` behavior on props.*
