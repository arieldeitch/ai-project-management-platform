# Control Tower — Live Activity Pipeline One Pager

## Problem
The time wall UI is correct, but its source is stale. Projects.Last Meaningful Progress is curated and lags real execution.

## North Star
Real GitHub/Drive/agent activity reaches Control Tower within ~15 minutes; explicit heartbeats arrive immediately. No manual timestamp maintenance.

## Architecture
ActivitySources -> poll/heartbeat -> ActivityLedger -> gateway effective activity -> existing Android time wall.

## Signal order
heartbeat > structured run report > GitHub > Drive modifiedTime > curated Last Meaningful Progress. Never Last Control Check.

## Must preserve
Curated RAG/milestone/next action remain separate. Activity evidence must not mutate status conclusions.

## Key acceptance
Existing Android 0.7 benefits from gateway-side effective last_meaningful_progress even before a new mobile release.

## Gate
Engineering GREEN after tests + CombinedCode + poller + endpoint.
Product AMBER until physical device shows fresh real events.
