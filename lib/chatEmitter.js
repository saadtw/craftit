/**
 * In-memory SSE subscriber store for per-order chat rooms.
 *
 * Each SSE client that connects to /api/chat/[orderId]/stream registers a
 * ReadableStream controller here. When a new message is saved, the POST
 * handler calls publish() and every connected client receives the event
 * immediately — no polling required.
 *
 * Scalability note:
 *   This works correctly for a single Node.js process (standard Next.js
 *   deployment).  For horizontally-scaled, multi-instance deployments
 *   swap the Map for Redis Pub/Sub (e.g. ioredis + subscribe/publish).
 *
 * Hot-reload safety:
 *   The Map is attached to the global object so it survives Next.js dev-mode
 *   hot reloads without dropping active SSE connections.
 */

const GLOBAL_KEY = "__craftit_chat_subscribers__";

// Reuse across hot reloads in development
if (!global[GLOBAL_KEY]) {
  global[GLOBAL_KEY] = new Map(); // Map<orderId, Set<ReadableStreamDefaultController>>
}

const rooms = global[GLOBAL_KEY];
const encoder = new TextEncoder();

/**
 * Register a new SSE connection for the given order room.
 * @param {string} orderId
 * @param {ReadableStreamDefaultController} controller
 */
export function subscribe(orderId, controller) {
  const key = orderId.toString();
  if (!rooms.has(key)) rooms.set(key, new Set());
  rooms.get(key).add(controller);
}

/**
 * Remove an SSE connection (called on client disconnect or stream cancel).
 * @param {string} orderId
 * @param {ReadableStreamDefaultController} controller
 */
export function unsubscribe(orderId, controller) {
  const key = orderId.toString();
  const room = rooms.get(key);
  if (!room) return;
  room.delete(controller);
  if (room.size === 0) rooms.delete(key);
}

/**
 * Push a JSON payload to every connected client in the order's room.
 * Stale controllers (already-closed connections) are silently pruned.
 * @param {string} orderId
 * @param {object} data  — will be JSON-serialised as the SSE `data:` field
 */
export function publish(orderId, data) {
  const key = orderId.toString();
  const room = rooms.get(key);
  if (!room || room.size === 0) return;

  const chunk = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

  for (const ctrl of room) {
    try {
      ctrl.enqueue(chunk);
    } catch (_) {
      // Controller is already closed — prune it
      room.delete(ctrl);
    }
  }

  if (room.size === 0) rooms.delete(key);
}
