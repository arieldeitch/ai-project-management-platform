# Control Tower 0.8 — Real-Time Activity One Pager

## Goal
Stop showing stale project timestamps.

## What changes
PROJECT_CONTROL_BOARD remains status truth.
New append-only ActivityLedger records real events from agent heartbeats, GitHub and Drive.
Existing 15-minute scanner collects fallback signals.

## Core semantic rule
Never collapse these clocks:
- latest observed activity;
- latest meaningful progress;
- Control Tower verification;
- mobile snapshot sync.

Automation can be latest observed activity but never refreshes meaningful-progress freshness.

## Expected latency
- direct heartbeat: near immediate;
- GitHub/Drive fallback: <= ~15 minutes after observable activity, subject to provider availability.

## Gate
Engineering GREEN only after CI.
Product AMBER / USER TEST REQUIRED until physical phone acceptance.
