# Zoho Desk — Antigravity Plugin

A Google Antigravity plugin for Zoho Desk. The Ticket Prioritization Agent is one agent in this plugin. The connection is Zoho Desk MCP.

## Agents

### Ticket Prioritization Agent

- Analyzes a ticket's customer intent, urgency, and business impact.
- Recommends High, Medium, or Low priority with evidence.
- Uses the Zoho Desk MCP `getTicket` and `updateTicket` tools when available.
- Recommends team routing only when reliable routing rules and tool support exist.

## Bundle contents

```text
zoho-desk/
├── plugin.json
├── README.md
├── mcp_config.json
├── hooks.json
├── scripts/
│   └── guard-destructive.mjs
├── skills/
│   └── ticket-prioritization/
│       └── SKILL.md
└── agents/
    └── ticket-prioritization-agent.md
```

## Zoho Desk MCP

`mcp_config.json` registers the Zoho Desk MCP server as `zoho-desk-mcp`:

`https://desk.zohomcp.com/mcp/message`

Antigravity namespaces that server as `zoho-desk-zoho-desk-mcp`. The endpoint uses OAuth when the server supports dynamic client registration, so the config does not include a pasted token or authorization header. Tool names may be namespaced by the host.

Before running the Ticket Prioritization Agent:

1. Install or enable the plugin in Antigravity and authenticate Zoho Desk MCP.
2. Verify that the server exposes tools corresponding to `getTicket` and `updateTicket`.
3. Inspect the actual tool schemas, required arguments, accepted priority values, and available assignment or routing fields.
4. Ensure the connection has only the required permissions. Updating ticket priority mutates support data; follow your organization's approval policy.

## Install locally

From the directory containing this plugin, run:

```bash
agy plugin validate ./zoho-desk
agy plugin install ./zoho-desk
agy plugin list
```

Alternatively, use Antigravity's Customizations → Plugins UI and install from a local path.

Invoke the Ticket Prioritization Skill with:

```text
/ticket-prioritization
```

To request agent delegation, ask the parent agent to delegate ticket triage to `ticket-prioritization-agent`, and provide a ticket ID.

## Example prompt

```text
Use the ticket-prioritization-agent to triage ticket 12345.
Retrieve it with getTicket, assess intent and impact, choose High,
Medium, or Low, update priority if appropriate, and report the evidence
and confirmed update result. Do not modify unrelated fields.
```

## Marketplace metadata

- Display name: Zoho Desk
- MCP: Zoho Desk MCP
- Agent: Ticket Prioritization Agent
- Tags: Zia Agent, Zia, Zoho Agents, Zoho Desk Assistant, Ticket Prioritization Agent, Priority Ticket Routing, Zia Support Agent, AI Ticket Triage

## Destructive-action guard

`hooks.json` runs `scripts/guard-destructive.mjs` before Zoho Desk MCP calls. Desk actions run through `ZohoMCP_executeTool`, and the guard reads `body.tool_name`. Tools that delete, trash, deactivate, detach, or move records to the recycle bin return `force_ask`, so Antigravity prompts even after Always Allow. `ZohoMCP_listTools`, `ZohoMCP_getFeatures`, `ZohoMCP_getSchema`, and updates such as `updateTicket` return `allow`, which leaves the normal approval policy in place. Invalid hook input exits 0 and does not block the call.

## Important safety note

`enable_write_tools: false` disables general subagent write tools. It does not prevent Zoho Desk MCP from exposing a mutating `updateTicket` tool. Control update permissions at the MCP server and host approval layers.
