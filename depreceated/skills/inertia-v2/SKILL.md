---
name: inertia-v2
description: Use when building modern monoliths with Inertia.js v2, including setup, routing, forms, and advanced data loading patterns.
---

# Inertia v2 Development

## Overview

Inertia.js allows you to build single-page apps (SPAs) using classic server-side routing and controllers. It acts as the glue between your backend (Laravel, Rails, etc.) and your frontend framework (Vue, React, Svelte).

**Key Philosophy:** Build controllers and page views like a traditional server-side app, but get the smooth UX of an SPA. No client-side routing, no API to manage.

## When to Use

- **New Projects**: Start here for any new Inertia v2 project.
- **Refactoring**: When upgrading from Inertia v1 or adding features like deferred loading.
- **Complex UI**: When you need SPA-like interactivity without the complexity of a full API + SPA architecture.
- **Performance**: When implementing advanced data fetching (lazy loading, prefetching).

## Quick Reference

### Common Imports

```javascript
// Vue
import { Link, Head, useForm, router } from '@inertiajs/vue3'

// React
import { Link, Head, useForm, router } from '@inertiajs/react'
```

### Essential Components

| Component       | Description                     | Reference                                                                       |
| --------------- | ------------------------------- | ------------------------------------------------------------------------------- |
| `<Link>`        | SPA navigation (replaces `<a>`) | [Primitives](./references/primitives.md#1-the-link-component)                   |
| `<Head>`        | Manage document title & meta    | [Primitives](./references/primitives.md#3-the-head-component)                   |
| `<Form>`        | Automatic form handling         | [Primitives](./references/primitives.md#2-forms-form--useform)                  |
| `<Deferred>`    | Load data after initial render  | [Advanced Data](./references/advanced-data.md#1-deferred-props)                 |
| `<WhenVisible>` | Lazy load data on scroll        | [Advanced Data](./references/advanced-data.md#3-load-when-visible-lazy-loading) |

---

## Core Concepts

Understanding how Inertia handles pages, responses, and routing is crucial.

- **Pages**: Vue/React components stored in `resources/js/Pages`.
- **Responses**: Return `Inertia::render()` from controllers.
- **Routing**: Define routes in your backend framework (e.g., Laravel `web.php`).
- **Shared Data**: Use middleware to share data (user, flash messages) globally.

[View Core Concepts Guide](./references/core-concepts.md)

---

## Primitives

Deep dive into the core components that make Inertia work.

- **Links**: Navigation with `preserve-scroll`, `preserve-state`, `only`.
- **Forms**: Powerful form helper `useForm` with reactive state (`processing`, `errors`).
- **Head**: Dynamic title and meta management.

[View Primitives Guide](./references/primitives.md)

---

## Advanced Data Loading (v2 Features)

Inertia v2 introduces significant improvements for performance and user experience.

- **Deferred Props**: Load non-critical data after the initial page load.
- **Polling**: Automatically refresh data at intervals.
- **Lazy Loading**: Fetch data only when components enter the viewport used for infinite scroll.
- **Prefetching**: Preload data on hover/mount/click for instant navigation.

[View Advanced Data Guide](./references/advanced-data.md)

---

## Setup & Configuration

### Server-Side (Laravel Example)

1.  **Install**: `composer require inertiajs/inertia-laravel`
2.  **Root Template**: Ensure `app.blade.php` contains `@inertiaHead` and `@inertia`.
3.  **Middleware**: Publish and register `HandleInertiaRequests`.

### Client-Side (Vue Example)

1.  **Install**: `npm install @inertiajs/vue3`
2.  **Initialize**:
    ```javascript
    import { createApp, h } from 'vue'
    import { createInertiaApp } from '@inertiajs/vue3'

    createInertiaApp({
      resolve: name => {
        const pages = import.meta.glob('./Pages/**/*.vue', { eager: true })
        return pages[`./Pages/${name}.vue`]
      },
      setup({ el, App, props, plugin }) {
        createApp({ render: () => h(App, props) })
          .use(plugin)
          .mount(el)
      },
    })
    ```

### Client-Side (React Example)

1.  **Install**: `npm install @inertiajs/react`
2.  **Initialize**:
    ```javascript
    import { createInertiaApp } from '@inertiajs/react'
    import { createRoot } from 'react-dom/client'

    createInertiaApp({
      resolve: name => {
        const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true })
        return pages[`./Pages/${name}.jsx`]
      },
      setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />)
      },
    })
    ```

For full installation details, refer to the [official documentation](https://inertiajs.com/docs/v2/installation/server-side-setup).

---

## Common Mistakes

-   **Using `<a>` tags**: Always use `<Link>` for internal navigation to avoid full page reloads.
-   **Manually handling 422 errors**: Inertia handles validation errors automatically. Don't `catch` them manually in `axios`.
-   **Forgetting `layout`**: Use persistent layouts to keep state between page navigations.
-   **Over-fetching**: Use `deferred` props or `lazy` loading for heavy data instead of blocking the initial render.
