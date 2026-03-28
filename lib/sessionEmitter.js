const GLOBAL_KEY = "__craftit_session_subscribers__";

if (!global[GLOBAL_KEY]) {
  global[GLOBAL_KEY] = new Map(); // Map<userId, Set<ReadableStreamDefaultController>>
}

const subscribers = global[GLOBAL_KEY];
const encoder = new TextEncoder();

export function subscribeUser(userId, controller) {
  const key = userId.toString();
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key).add(controller);
}

export function unsubscribeUser(userId, controller) {
  const key = userId.toString();
  const room = subscribers.get(key);
  if (!room) return;
  room.delete(controller);
  if (room.size === 0) subscribers.delete(key);
}

export function publishSessionEvent(userId, data) {
  const key = userId.toString();
  const room = subscribers.get(key);
  if (!room || room.size === 0) return;

  const chunk = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  for (const ctrl of room) {
    try {
      ctrl.enqueue(chunk);
    } catch {
      room.delete(ctrl);
    }
  }

  if (room.size === 0) subscribers.delete(key);
}
