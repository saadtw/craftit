import connectDB from "@/lib/mongodb";
import Bid from "@/models/Bid";
import { subscribe, unsubscribe } from "@/lib/chatEmitter";
import { resolveRequestSession } from "@/lib/requestAuth";

async function canAccessBidChat(bidId, session) {
  const bid = await Bid.findById(bidId).populate("rfqId", "customerId").lean();
  if (!bid) return false;

  const uid = session.user.id;
  const isManufacturer =
    session.user.role === "manufacturer" &&
    bid.manufacturerId.toString() === uid;
  const isCustomer =
    session.user.role === "customer" &&
    bid.rfqId?.customerId?.toString() === uid;

  return isManufacturer || isCustomer;
}

export async function GET(request, context) {
  const { id } = await context.params;

  const session = await resolveRequestSession(request);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  await connectDB();

  if (!(await canAccessBidChat(id, session))) {
    return new Response("Forbidden", { status: 403 });
  }

  const roomId = `bid:${id}`;
  const encoder = new TextEncoder();
  let ctrl;
  let pingTimer;

  const cleanup = () => {
    clearInterval(pingTimer);
    if (ctrl) {
      unsubscribe(roomId, ctrl);
      try {
        ctrl.close();
      } catch (_) {}
    }
  };

  request.signal.addEventListener("abort", cleanup, { once: true });

  const stream = new ReadableStream({
    start(controller) {
      ctrl = controller;
      subscribe(roomId, ctrl);
      ctrl.enqueue(encoder.encode(": connected\n\n"));

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
      "X-Accel-Buffering": "no",
    },
  });
}
