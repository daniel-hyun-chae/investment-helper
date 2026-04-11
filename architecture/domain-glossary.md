# Domain Glossary

| Term | Definition |
|---|---|
| watchlist | The set of company identifiers a user follows for investment updates. |
| disclosure | A public filing or market-relevant announcement from an upstream source API. |
| filing event | A normalized internal event derived from a disclosure payload. |
| connector | A source-specific adapter that fetches, validates, and normalizes external data. |
| subscription | A durable user preference linking a Telegram user to one or more watchlist entries. |
| analysis job | An asynchronous task that transforms filing events into investor-facing summaries. |
| company directory | A durable local cache of OpenDART corpCode records used for search and company lookup. |
| summary trend point | A normalized metric point used by company summary charts across yearly, quarterly, and TTM views. |
| refresh state | Per-company metadata tracking the last disclosure check and last synchronized summary dataset. |
| sync-first search | Search mode where company lookup requires explicit directory synchronization before queries are served. |
| local fixture seed | Development-only deterministic data injection used for repeatable e2e validation without external API calls. |
