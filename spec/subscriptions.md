# Subscriptions Spec

## Scope

Subscription lifecycle for Telegram users and watchlist management.

## Behaviors

- Telegram users can create a subscription with `/watch <company_code>`.
- Repeating the same subscription request is idempotent.
- Users can remove subscriptions with `/unwatch <company_code>`.
- Subscriptions are durable and survive restarts.
- Listing subscriptions is available through command and/or admin surface.
