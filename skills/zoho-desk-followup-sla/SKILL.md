---
name: zoho-desk-followup-sla
description: Find and prioritize Zoho Desk tickets that need follow-up - awaiting customer response, idle, overdue, approaching SLA or due dates, or blocked by unresolved dependencies - and recommend reminder and escalation timing. Use whenever the user asks which tickets are overdue, stale, pending, at risk of breaching SLA, waiting on customers, need reminders, or asks for a daily or weekly follow-up list.
---

# Zoho Desk Follow-up and SLA Management

Keep nothing from slipping. Produce a ranked, actionable list rather than a data dump.

## Workflow

1. **Define the scope**: whose tickets (the user, a team, a department), which statuses, and the time window. If not specified, default to the user's open tickets and say so.
2. **Pull candidate tickets** and fetch for each: status, priority, owner, due date, SLA/first-response/resolution deadlines, last customer message, last agent action, last follow-up sent.
3. **Classify each ticket** into one bucket (first match wins):
   - **Breached**: due date or SLA deadline passed.
   - **At risk**: deadline within the next 4 working hours, or within 20% of the total SLA window.
   - **Awaiting customer**: status Waiting on Customer, or last message is outbound.
   - **Awaiting internal/third party**: blocked on engineering, approval, vendor.
   - **Stale**: no activity from anyone beyond the team's threshold (default 3 working days).
   - **On track**: nothing needed now.
4. **Recommend an action and timing** per ticket using the table below.
5. **Rank** by: breached > at risk > high priority stale > awaiting internal > awaiting customer.

## Follow-up cadence (defaults, adjust to the org's policy)

| Situation | Action |
|---|---|
| Awaiting customer, 2 working days quiet | First reminder (use `zoho-desk-customer-communication`) |
| Still quiet 3 more working days | Second reminder, state the closure date |
| Still quiet 2 more working days | Propose closing as unresponsive, with confirmation |
| Blocked on internal team 2+ days, no update | Ping owner; escalate if priority is high |
| Approaching SLA with no first response | Respond now or reassign |

Always check that the customer did not reply recently, and that a reminder was not already sent today, before recommending another.

## Output format

```
Scope: <who/what, window>   As of: <date/time and timezone>

Needs action now
1. #<id> <subject> - <bucket> - <why, with dates> -> <action> (by <when>)
...
Coming up
...
Waiting (no action yet): <count and ids>

Drafts or changes I can prepare (need your confirmation to send/apply): <list>
```

## Guardrails

- Distinguish measured values (timestamps, configured SLA) from estimates (your risk judgment).
- Use business hours and the org's holiday calendar when the data is available; state if you assumed calendar time.
- Bulk reminders: show the recipient list and wording first; send only after explicit confirmation. Never auto-close tickets.
