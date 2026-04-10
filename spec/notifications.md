# Notifications Spec

## Scope

User-facing delivery of normalized filing updates through Telegram.

## Behaviors

- Notifications are sent only for active subscriptions.
- Duplicate filing events are not delivered multiple times to the same user.
- Notification content is concise and human-readable.
- Notification failures are retried with bounded backoff.
