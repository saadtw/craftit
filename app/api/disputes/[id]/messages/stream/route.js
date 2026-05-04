import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Dispute from "@/models/Dispute";
import "@/models/User";
import { subscribe, unsubscribe } from "@/lib/chatEmitter";
import { resolveRequestSession } from "@/lib/requestAuth";

export async function GET(request, context) {
  const { id } = await context.params;

  const session = await resolveRequestSession(request);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  await connectDB();

  const dispute = await Dispute.findById(id)
    .populate("customerId", "_id")
    .populate("manufacturerId", "_id")
    .lean();

  if (!dispute) {
    return new Response("Dispute not found", { status: 404 });
  }

  const uid = session.user.id;
  const role = session.user.role;

  if (role !== "admin") {
    const isCustomer =
      role === "customer" && dispute.customerId._id.toString() === uid;
    const isManufacturer =
      role === "manufacturer" && dispute.manufacturerId._id.toString() === uid;

    if (!isCustomer && !isManufacturer) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const encoder = new TextEncoder();
  let ctrl;
  let pingTimer;
  const roomId = `dispute_${id}`;

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
