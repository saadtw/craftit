import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { subscribeUser, unsubscribeUser } from "@/lib/sessionEmitter";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      subscribeUser(userId, controller);

      // Initial event confirms stream is active.
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "CONNECTED", ts: Date.now() })}\n\n`,
        ),
      );

      // Keepalive to prevent proxies from closing idle SSE.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
          unsubscribeUser(userId, controller);
        }
      }, 25000);

      stream._heartbeat = heartbeat;
    },
    cancel() {
      if (stream._heartbeat) clearInterval(stream._heartbeat);
      // controller is unavailable in cancel; stale controllers are cleaned on publish.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
