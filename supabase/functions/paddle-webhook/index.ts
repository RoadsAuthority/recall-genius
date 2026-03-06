import { serve } from "std/http/server.ts";
import { createClient } from "supabase";
import { HmacSha256 } from "std/hash/sha256.ts";
import { encode } from "std/encoding/hex.ts";

// Paddle Webhook Secret should be configured as a Supabase Secret or environment variable
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
      return new Response(JSON.stringify({ error: "No Paddle-Signature header found." }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Verify the webhook signature
    const [timestampPart, hmacPart] = signature.split(";");
    const timestamp = timestampPart.split("=")[1];
    const hmac = hmacPart.split("=")[1];

    if (!timestamp || !hmac) {
      return new Response(JSON.stringify({ error: "Invalid Paddle-Signature format." }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    const signedPayload = `${timestamp}:${rawBody}`;
    const key = new TextEncoder().encode(PADDLE_WEBHOOK_SECRET);
    const data = new TextEncoder().encode(signedPayload);

    const hmacSha256 = new HmacSha256(key);
    hmacSha256.update(data);
    const expectedHmac = encode(hmacSha256.arrayBuffer());

    if (expectedHmac !== hmac) {
      console.warn("Webhook signature mismatch.");
      return new Response(JSON.stringify({ error: "Webhook signature verification failed." }), {
        headers: { "Content-Type": "application/json" },
        status: 403,
      });
    }

    const event = JSON.parse(rawBody);

    // Initialize Supabase client for database operations (if needed)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", // Use service role key for backend operations
    );

    console.log("Received Paddle event:", event.event_type);

    // Handle different Paddle event types
    switch (event.event_type) {
      case "transaction.completed":
        // Example: Update user's subscription status in your database
        console.log("Transaction Completed Event:", event.data);
        const userId = event.data.customer_id; // Usually mapped or in custom_data

        const { error: updateError } = await supabaseAdmin
          .from('profiles') // Assuming a 'profiles' table with user data
          .update({ plan_type: 'premium' })
          .eq('id', userId);

        if (updateError) {
          console.error("Error updating user subscription status:", updateError);
        }
        break;
      case "subscription.activated":
        console.log("Subscription Activated Event:", event.data);
        // Handle subscription activation logic
        break;
      case "subscription.updated":
        console.log("Subscription Updated Event:", event.data);
        // Handle subscription updates (e.g., plan change, payment method update)
        break;
      case "subscription.canceled":
        console.log("Subscription Canceled Event:", event.data);
        // Handle subscription cancellation
        break;
      // Add more event types as needed based on your Paddle integration
      default:
        console.log(`Unhandled Paddle event type: ${event.event_type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing Paddle webhook:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
