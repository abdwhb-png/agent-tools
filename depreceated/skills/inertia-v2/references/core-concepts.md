# Inertia v2 Core Concepts

## 1. Pages & Components

Inertia apps are single-page apps (SPAs), but you build them like classic server-side apps. Each page is a JavaScript component (Vue/React/Svelte).

### Creating Pages

Create components in `resources/js/Pages/` or `resources/js/pages/` (Laravel convention).

```javascript
// Vue
<script setup>
defineProps({ users: Array })
</script>

<template>
  <Layout>
    <h1>Users</h1>
    <div v-for="user in users" :key="user.id">
      {{ user.name }}
    </div>
  </Layout>
</template>
```

```javascript
// React
import Layout from '@/Layouts/Layout';

export default function Users({ users }) {
  return (
    <Layout>
      <h1>Users</h1>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </Layout>
  );
}
```

### Persistent Layouts
Use persistent layouts to keep state (like scroll position, audio players) across page visits.

```javascript
// Vue
import Layout from '@/Layouts/AppLayout.vue'

defineOptions({ layout: Layout })
```

```javascript
// React
import Layout from '@/Layouts/AppLayout';

Users.layout = page => <Layout children={page} title="Users" />
```

---

## 2. Server-Side Responses

Return Inertia responses from your controllers instead of JSON or HTML.

```php
// Laravel
use Inertia\Inertia;

public function index()
{
    return Inertia::render('Users/Index', [
        'users' => User::all(),
        // Data passed here becomes props in the page component
    ]);
}
```

### Redirects
For form submissions or actions, redirect back to a `GET` route.

```php
public function store()
{
    User::create([...]);
    return to_route('users.index'); // Standard redirect
}
```

---

## 3. Routing

Inertia relies on server-side routing. You define routes in your backend framework (e.g., `web.php` in Laravel).

```php
Route::get('/users', [UserController::class, 'index']);
Route::post('/users', [UserController::class, 'store']);
```

For client-side navigation between these routes, use `<Link>` or `router`.

```javascript
import { router } from '@inertiajs/vue3'

router.visit('/users', { method: 'get' })
```

---

## 4. Shared Data

Share data across all pages (e.g., authenticated user, flash messages) using the `HandleInertiaRequests` middleware.

```php
// app/Http/Middleware/HandleInertiaRequests.php
public function share(Request $request)
{
    return array_merge(parent::share($request), [
        'auth' => [
            'user' => $request->user(),
        ],
        'flash' => [
            'message' => fn () => $request->session()->get('message')
        ],
    ]);
}
```

Access shared data in any component via `$page.props`.

```javascript
// Vue
{{ $page.props.auth.user.name }}
```

```javascript
// React
import { usePage } from '@inertiajs/react'

const { auth } = usePage().props
return <div>{auth.user.name}</div>
```

---

## 5. Partial Reloads

Improve performance by reloading only specific data props.

```javascript
// Vue
import { router } from '@inertiajs/vue3'

router.reload({ only: ['users'] })
```

```javascript
// React
import { router } from '@inertiajs/react'

router.reload({ only: ['users'] })
```

In `<Link>`:

```javascript
<Link href="/users" :only="['users']">Refresh Users</Link>
```

This tells the server to only re-evaluate and return the 'users' prop, skipping others.
