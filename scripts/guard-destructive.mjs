#!/usr/bin/env node
// PreToolUse guard for the Zoho Desk Antigravity plugin. Asks for
// confirmation before Zoho Desk tools that permanently remove or detach
// data. Never blocks on bad input; always exits 0.
//
// hooks.json uses the named-hook schema from
// https://antigravity.google/docs/hooks/ . Antigravity sends
// {"toolCall":{"name":"call_mcp_tool","args":{"ServerName","ToolName","Arguments"}}}.
// Zoho Desk MCP executes a tool through ZohoMCP_executeTool. The Desk action
// is Arguments.body.tool_name, for example ZohoDesk_getDepartments.
// decision "allow" leaves the normal approval policy in place. "force_ask"
// prompts even when the user previously chose Always Allow.

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Action segment, not a substring. "delete" matches delete_ticket and
// deleteTicket, and does not match get_deleted_tickets. Move-to-trash is
// separate because its verb is "move".
export const DESTRUCTIVE_TOOL_PATTERN_SOURCE =
  '(?:^|_)(?:delete|trash|deactivate|disassociate|dissociate|remove|unlink)(?:_|[A-Z]|$)|move_(?:[a-z0-9_]*_)?to_trash|move[A-Za-z0-9]*ToTrash';

export const DESTRUCTIVE_TOOL_PATTERN = new RegExp(DESTRUCTIVE_TOOL_PATTERN_SOURCE);

// isObject({ "body": { "tool_name": "ZohoDesk_getDepartments" } }) => true
// isObject("ZohoDesk_getDepartments") => false
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

// nonEmptyString("ZohoDesk_getDepartments") => "ZohoDesk_getDepartments"
// nonEmptyString("") => undefined
const nonEmptyString = (value) => (typeof value === 'string' && value.length > 0 ? value : undefined);

const EXECUTE_TOOL = 'ZohoMCP_executeTool';

// isDeskServer("zoho-desk-antigravity-zoho-desk-mcp") => true
// isDeskServer("zoho-crm") => false
const isDeskServer = (serverName) => typeof serverName === 'string' && /zoho[-_]?desk/i.test(serverName);

// isDeskTool("ZohoDesk_deleteTicket") => true
// isDeskTool("ZohoMCP_listTools") => false
const isDeskTool = (toolName) => typeof toolName === 'string' && /ZohoDesk_/.test(toolName);

// parsePayload('{"body":{"tool_name":"ZohoDesk_getDepartments","arguments":{"query_params":{"isEnabled":false}}}}')
// => { body: { tool_name: "ZohoDesk_getDepartments", arguments: { query_params: { isEnabled: false } } } }
// parsePayload({ body: { tool_name: "ZohoDesk_getDepartments", arguments: {} } }) returns that object.
// parsePayload("not-json") => undefined
function parsePayload(value) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  return isObject(value) ? value : undefined;
}

// executedToolName({
//   ServerName: "zoho-desk-antigravity-zoho-desk-mcp",
//   ToolName: "ZohoMCP_executeTool",
//   Arguments: {
//     body: {
//       tool_name: "ZohoDesk_getDepartments",
//       arguments: { query_params: { isEnabled: false } }
//     }
//   }
// }) => "ZohoDesk_getDepartments"
//
// Direct tool args, with no Arguments wrapper, use the same body:
// executedToolName({
//   body: {
//     tool_name: "ZohoDesk_deleteTicket",
//     arguments: {}
//   }
// }) => "ZohoDesk_deleteTicket"
function executedToolName(args) {
  if (!isObject(args)) return undefined;
  const payload = parsePayload(args.Arguments) ?? parsePayload(args.arguments) ?? args;
  if (!isObject(payload)) return undefined;
  const body = isObject(payload.body) ? payload.body : payload;
  return nonEmptyString(body.tool_name) ?? nonEmptyString(body.toolName);
}

// deskActionName("ZohoDesk_deleteTicket", "zoho-desk-mcp") => "ZohoDesk_deleteTicket"
// deskActionName("ZohoDesk_getDepartments", undefined) => "ZohoDesk_getDepartments"
// deskActionName("ZohoCRM_deleteRecords", "zoho-crm") => undefined
// deskActionName("ZohoMCP_listTools", undefined) => undefined
function deskActionName(toolName, serverName) {
  if (!toolName) return undefined;
  if (serverName && !isDeskServer(serverName) && !isDeskTool(toolName)) return undefined;
  if (!serverName && !isDeskTool(toolName)) return undefined;
  return toolName;
}

// getToolName({
//   toolCall: {
//     name: "call_mcp_tool",
//     args: {
//       ServerName: "zoho-desk-antigravity-zoho-desk-mcp",
//       ToolName: "ZohoMCP_executeTool",
//       Arguments: {
//         body: {
//           tool_name: "ZohoDesk_getDepartments",
//           arguments: { query_params: { isEnabled: false } }
//         }
//       }
//     }
//   }
// }) => "ZohoDesk_getDepartments"
//
// getToolName({
//   toolCall: {
//     name: "ZohoMCP_executeTool",
//     args: {
//       body: {
//         tool_name: "ZohoDesk_deleteTicket",
//         arguments: {}
//       }
//     }
//   }
// }) => "ZohoDesk_deleteTicket"
//
// getToolName({
//   toolCall: {
//     name: "call_mcp_tool",
//     args: {
//       ServerName: "zoho-desk-mcp",
//       ToolName: "ZohoMCP_listTools",
//       Arguments: { query_params: { page: 1 } }
//     }
//   }
// }) => undefined
export function getToolName(event) {
  if (!isObject(event) || !isObject(event.toolCall)) return undefined;
  const call = event.toolCall;
  const callName = nonEmptyString(call.name);
  const args = isObject(call.args) ? call.args : undefined;

  if (callName === 'call_mcp_tool' && args) {
    const toolName = nonEmptyString(args.ToolName) ?? nonEmptyString(args.toolName);
    const serverName = nonEmptyString(args.ServerName) ?? nonEmptyString(args.serverName);
    if (toolName === EXECUTE_TOOL) return deskActionName(executedToolName(args), serverName);
    return deskActionName(toolName, serverName);
  }

  if (callName === EXECUTE_TOOL) return deskActionName(executedToolName(args), undefined);
  return deskActionName(callName, undefined);
}

// evaluate({
//   toolCall: {
//     name: "ZohoMCP_executeTool",
//     args: {
//       body: {
//         tool_name: "ZohoDesk_getDepartments",
//         arguments: { query_params: { isEnabled: false } }
//       }
//     }
//   }
// }) => { decision: "allow" }
//
// evaluate({
//   toolCall: {
//     name: "ZohoMCP_executeTool",
//     args: {
//       body: {
//         tool_name: "ZohoDesk_deleteTicket",
//         arguments: {}
//       }
//     }
//   }
// }) => {
//   decision: "force_ask",
//   reason: "ZohoDesk_deleteTicket permanently removes or detaches Zoho Desk data. Confirm the exact records and the change before allowing it."
// }
export function evaluate(event) {
  const toolName = getToolName(event);
  if (!toolName || !DESTRUCTIVE_TOOL_PATTERN.test(toolName)) return { decision: 'allow' };
  return {
    decision: 'force_ask',
    reason:
      `${toolName} permanently removes or detaches Zoho Desk data. ` +
      'Confirm the exact records and the change before allowing it.',
  };
}

// parseEvent('{"toolCall":{"name":"ZohoMCP_executeTool","args":{"body":{"tool_name":"ZohoDesk_getDepartments","arguments":{"query_params":{"isEnabled":false}}}}}}')
// => { toolCall: { name: "ZohoMCP_executeTool", args: { body: { tool_name: "ZohoDesk_getDepartments", arguments: { query_params: { isEnabled: false } } } } } }
// parseEvent("not-json") => undefined
function parseEvent(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// readStdin() reads the hook event Antigravity writes to stdin. No arguments.
// The text is the same JSON string passed to parseEvent.
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

// main() takes no arguments. Antigravity runs: node "${PLUGIN_ROOT}/scripts/guard-destructive.mjs"
// stdin is the parseEvent string above. stdout is one line, then exit 0:
// {"decision":"allow"}
// or
// {"decision":"force_ask","reason":"ZohoDesk_deleteTicket permanently removes or detaches Zoho Desk data. Confirm the exact records and the change before allowing it."}
async function main() {
  let result = { decision: 'allow' };
  try {
    result = evaluate(parseEvent(await readStdin()));
  } catch {
    result = { decision: 'allow' };
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = 0;
}

// isDirectRun() takes no arguments.
// node scripts/guard-destructive.mjs => true, so main() runs.
// import { evaluate } from "./scripts/guard-destructive.mjs" => false, so main() does not run.
function isDirectRun() {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main();
}
