---
name: laravel-invite-only
description: Use when you need to implement a user invitation system (single or bulk), handle invitation lifecycle events, or set up automatic reminders in a Laravel application.
---

# Laravel Invite Only

## Overview

A polymorphic, event-driven invitation system for Laravel. It handles the entire lifecycle of an invitation: creation, sending (email), claiming (token validation), and automated cleanup/reminders.

**Core Principle:** Invites are polymorphic (`invitable_type`, `invitable_id`), meaning you can invite users to *any* model (Teams, Events, Organizations) using the same system.

## When to Use

- **User Onboarding:** Inviting new users to the platform via email.
- **Team Management:** Adding members to a workspace or team.
- **Event RSVP:** Tracking pending/accepted status for event attendees.
- **Bulk Operations:** Sending mass invites with partial failure handling.

**Do NOT use when:**
- You just need a simple "Share Link" without tracking individual statuses.
- You need a referral system (this is for *access*, not *rewards*, though it can be adapted).

## Quick Reference

| Action          | Method/Command                                                                                                        | Result                                                 |
| :-------------- | :-------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------- |
| **Install**     | `composer require offload-project/laravel-invite-only`                                                                | Installs package                                       |
| **Publish**     | `php artisan vendor:publish --tag="invite-only-config"` & `php artisan vendor:publish --tag="invite-only-migrations"` | Config & Migrations                                    |
| **Invite One**  | `$model->invite($email, $options)`                                                                                    | Returns `Invitation` model                             |
| **Invite Many** | `$model->inviteMany($emails, $options)`                                                                               | Returns `UseInviteResult` (success/failed collections) |
| **Claim**       | `InviteOnly::get($token)`                                                                                             | Validates & returns `Invitation`                       |
| **Remind**      | `php artisan invite-only:send-reminders`                                                                              | Sends emails to pending invites                        |

## Core Patterns

### 1. Setup & Traits

Models that *send* invites (e.g., `Team`) use `HasInvitations`. Models that *can be invited* (e.g., `User`, although invitations often *create* users) use `CanBeInvited`.

```php
use OffloadProject\InviteOnly\Traits\HasInvitations;

class Team extends Model {
    use HasInvitations;
}
```

### 2. Implementation: Sending Invites

Use `metadata` for context (roles, permissions) to avoid schema changes.

```php
// Single Invite
$team->invite('jane@example.com', [
    'role' => 'editor', // stored in JSON column
    'invited_by' => auth()->id(),
    'metadata' => ['department' => 'marketing']
]);

// Bulk Invite (Safe Approach)
$batch = $team->inviteMany(['a@test.com', 'b@test.com'], ['role' => 'member']);

if ($batch->failed->isNotEmpty()) {
    // Check $batch->failed['email'] for error string
}
```

### 3. Implementation: Claiming & Events

The system is Event-Driven. Don't put business logic in the controller; put it in the Event Listener.

**Controller (The "Claim" Action):**
```php
public function accept($token) {
    try {
        $invite = InviteOnly::get($token); // Validates token expiry
        
        // ... Register user logic ...
        
        // This fires 'InvitationAccepted' event
        InviteOnly::claim($token, $newUser); 
        
        return redirect('/dashboard');
    } catch (InvitationException $e) {
        return back()->withError($e->getMessage());
    }
}
```

**Event Listener (The "Business Logic"):**
```php
// EventServiceProvider or Listener
Event::listen(InvitationAccepted::class, function ($event) {
    $team = $event->invitation->invitable;
    $user = $event->user;
    
    // Attach user to team using data stored in invite
    $team->members()->attach($user->id, [
        'role' => $event->invitation->role
    ]);
});
```

## Common Mistakes

| Mistake                   | Reality                                                            | Fix                                                                              |
| :------------------------ | :----------------------------------------------------------------- | :------------------------------------------------------------------------------- |
| **Ignoring Queue Config** | Emails are sent synchronously by default if queue not set.         | Ensure `QUEUE_CONNECTION=redis` (or database) is set and worker is running.      |
| **Logic in Controller**   | Placing attachment logic in the controller creates tight coupling. | Use the `InvitationAccepted` event listener.                                     |
| **Missing Scheduler**     | Reminders won't send themselves.                                   | Add `schedule->command('invite-only:send-reminders')->daily()` to `console.php`. |
| **Unprotected Metadata**  | Validation is loose on metadata.                                   | Validate input *before* calling `invite()`.                                      |

## Red Flags - STOP and Fix

- Manually querying the `invitations` table instead of using `InviteOnly` facade.
- "I'll just edit the vendor migration to add columns." -> **STOP.** Use `metadata` JSON column.
- Sending invites inside a loop instead of using `inviteMany` (performance killer).
