# Inertia v2 Primitives

Inertia provides three core primitives for building applications: `<Link>`, `<Form>` (and `useForm`), and `<Head>`. These components abstract away the complexity of SPA navigation, form submission, and document head management.

## 1. The `<Link>` Component

The `<Link>` component is a light wrapper around a standard anchor `<a>` tag. It intercepts click events and prevents full page reloads, enabling SPA-like navigation.

### Basic Usage

```javascript
// Vue
import { Link } from '@inertiajs/vue3'
// React
import { Link } from '@inertiajs/react'

<Link href="/users">Users</Link>
```

### Key Props

| Prop              | Description                                                              | Example                                                                        |
| ----------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `href`            | The URL to visit.                                                        | `<Link href="/dashboard">`                                                     |
| `method`          | HTTP method (default: `get`). Supports `post`, `put`, `patch`, `delete`. | `<Link href="/logout" method="post">`                                          |
| `data`            | Data to include with the request (for `post`/`put`).                     | `<Link href="/users" method="post" :data="{ active: true }">`                  |
| `as`              | Render the link as a different element (e.g., `button`).                 | `<Link href="/logout" method="post" as="button">`                              |
| `preserve-scroll` | Prevent scroll reset on visit. (React: `preserveScroll`)                 | `<Link href="/" preserve-scroll>` / `<Link href="/" preserveScroll>`           |
| `preserve-state`  | Preserve component state on visit. (React: `preserveState`)              | `<Link href="/search" preserve-state>` / `<Link href="/search" preserveState>` |
| `replace`         | Replace the current history entry instead of pushing.                    | `<Link href="/" replace>`                                                      |
| `only`            | Partial reload: fetch only specific props.                               | `<Link href="/users" :only="['users']">`                                       |
| `headers`         | Custom headers for the request.                                          | `<Link href="/" :headers="{ 'X-Custom': 'value' }">`                           |

### Active State

Use the `$page` object to style active links.

```javascript
// Vue
<Link href="/users" :class="{ 'active': $page.url.startsWith('/users') }">Users</Link>

// React
import { usePage } from '@inertiajs/react'

const { url } = usePage()
<Link href="/users" className={url.startsWith('/users') ? 'active' : ''}>Users</Link>
```

---

## 2. Forms (`<Form>` / `useForm`)

Inertia offers two ways to handle forms: the `<Form>` component and the `useForm` hook. Both handle submission, validation errors, and progress without page reloads.

### The `<Form>` Component

Behaves like a standard HTML form but uses Inertia under the hood.

```javascript
// Vue
import { Form } from '@inertiajs/vue3'

<Form action="/users" method="post">
  <input type="text" name="name" />
  <button type="submit">Create</button>
</Form>
```

```javascript
// React
import { useForm } from '@inertiajs/react'

const { post, setData, data, processing, errors } = useForm({
  name: '',
})

function submit(e) {
  e.preventDefault()
  post('/users')
}

<form onSubmit={submit}>
  <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} />
  <button type="submit" disabled={processing}>Create</button>
</form>
```
*Note: In React, there isn't a direct `<Form>` component primitive like in Vue. You typically use standard `<form>` with `useForm`.*

### The `useForm` Helper (Recommended for programmatic control)

Provides reactive data binding and submission helpers.

```javascript
// Vue
import { useForm } from '@inertiajs/vue3'

const form = useForm({
  email: null,
  password: null,
  remember: false,
})

function submit() {
  form.post('/login', {
    onSuccess: () => form.reset('password'),
  })
}
```

```javascript
// React
import { useForm } from '@inertiajs/react'

const { data, setData, post, processing, errors } = useForm({
  email: '',
  password: '',
})

function submit(e) {
  e.preventDefault()
  post('/login')
}
```

### Form State & Methods

| Property/Method                         | Description                                     |
| --------------------------------------- | ----------------------------------------------- |
| `data`                                  | The form data object defined in initialization. |
| `isDirty`                               | Boolean, true if form data has changed.         |
| `errors`                                | Object containing validation errors.            |
| `processing`                            | Boolean, true while submission is in progress.  |
| `progress`                              | Upload progress object (if files are present).  |
| `submit(method, url, options)`          | General submission method.                      |
| `get`, `post`, `put`, `patch`, `delete` | HTTP method shortcuts.                          |
| `reset(...fields)`                      | Reset form data to defaults.                    |
| `clearErrors(...)`                      | Clear validation errors.                        |
| `setError(field, value)`                | Manually set an error.                          |
| `transform(callback)`                   | Modify data before submission.                  |

---

## 3. The `<Head>` Component

Used to manage the document `<head>` content (title, meta tags) dynamically from your pages.

### Basic Usage

```javascript
// Vue
import { Head } from '@inertiajs/vue3'
// React
import { Head } from '@inertiajs/react'

<Head title="Welcome">
  <meta name="description" content="My app description" />
</Head>
```

### Title Shorthand

```javascript
<Head title="Home Page" />
```
