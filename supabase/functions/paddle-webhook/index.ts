import { serve } from "std/http/server.ts";
import { createClient } from "supabase";

const PADDLE_WEBHOOK_SECRET = Deno.env.get("PADDLE_WEBHOOK_SECRET");

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!PADDLE_WEBHOOK_SECRET) {
    console.error("PADDLE_WEBHOOK_SECRET is not set.");
    return new Response(JSON.stringify({ error: "Server configuration error." }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("Paddle-Signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "No signature" }), { status: 400 });
    }

    // Modern Web Crypto verification
    const [tsPart, hmacPart] = signature.split(";");
    const ts = tsPart.split("=")[1];
    const hmac = hmacPart.split("=")[1];
    const payload = `${ts}:${rawBody}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(PADDLE_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const verified = await crypto.subtle.verify(
      "HMAC",
      key,
      // Convert hex string to Uint8Array
      new Uint8Array(hmac.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))),
      encoder.encode(payload)
    );

    if (!verified) {
      console.warn("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 403 });
    }

    const event = JSON.parse(rawBody);
    console.log("Received Paddle event:", event.event_type);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (event.event_type === "transaction.completed") {
      const userId = event.data.custom_data?.user_id;

      if (userId) {
        console.log(`Upgrading user ${userId} to premium`);
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ plan_type: "premium" })
          .eq("id", userId);

        if (error) {
          console.error("Database update error:", error);
          throw error;
        }
      } else {
        console.warn("No user_id found in custom_data");
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook processing error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
