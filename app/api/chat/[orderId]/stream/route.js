import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import "@/models/User";
import { subscribe, unsubscribe } from "@/lib/chatEmitter";
import { resolveRequestSession } from "@/lib/requestAuth";

/**
 * GET /api/chat/[orderId]/stream
 *
 * Server-Sent Events endpoint.  The client connects once; the server pushes
 * new-message events in real time via the shared chatEmitter pub/sub store.
 *
 * Event format:
 *   data: {"type":"message","message":{...ChatMessage doc...}}\n\n
 *
 * Keep-alive comments (":" lines) are sent every 25 s to prevent proxy /
 * load-balancer timeouts (most default to 30–60 s of idle).
 *
 * The browser's built-in EventSource will automatically reconnect if the
 * connection is interrupted, so no custom reconnect logic is needed on the
 * client side.
 */
export async function GET(request, context) {
  const { orderId } = await context.params;

  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await resolveRequestSession(request);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // ── Access control ────────────────────────────────────────────────────────
  await connectDB();

  const order = await Order.findById(orderId)
    .populate("customerId", "_id")
    .populate("manufacturerId", "_id")
    .lean();

  if (!order) {
    return new Response("Order not found", { status: 404 });
  }

  const uid = session.user.id;
  const role = session.user.role;

  if (role !== "admin") {
    const isCustomer =
      role === "customer" && order.customerId._id.toString() === uid;
    const isManufacturer =
      role === "manufacturer" && order.manufacturerId._id.toString() === uid;

    if (!isCustomer && !isManufacturer) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  // ── SSE stream ────────────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  let ctrl; // ReadableStreamDefaultController
  let pingTimer;

  const cleanup = () => {
    clearInterval(pingTimer);
    if (ctrl) {
      unsubscribe(orderId, ctrl);
      try {
        ctrl.close();
      } catch (_) {
        /* already closed */
      }
    }
  };

  // Fires when the client closes the tab / navigates away
  request.signal.addEventListener("abort", cleanup, { once: true });

  const stream = new ReadableStream({
    start(controller) {
      ctrl = controller;
      subscribe(orderId, ctrl);

      // Immediate keep-alive so the browser confirms the connection is open
      ctrl.enqueue(encoder.encode(": connected\n\n"));

      // Periodic keep-alive — prevents proxy timeouts on idle conversations
      pingTimer = setInterval(() => {
        try {
          ctrl.enqueue(encoder.encode(": ping\n\n"));
        } catch (_) {
          cleanup();
        }
      }, 25_000);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable response buffering in Nginx / reverse proxies
      "X-Accel-Buffering": "no",
    },
  });
}
