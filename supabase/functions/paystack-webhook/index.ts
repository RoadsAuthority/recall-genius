import { serve } from "std/http/server.ts";
import { createClient } from "supabase";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

function hexToBytes(hex: string) {
  const clean = hex.trim();
  const pairs = clean.match(/.{1,2}/g) ?? [];
  return new Uint8Array(pairs.map((b) => parseInt(b, 16)));
}

async function hmacSha512Hex(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  if (!PAYSTACK_SECRET_KEY) {
    console.error("PAYSTACK_SECRET_KEY is not set.");
    return new Response(JSON.stringify({ error: "Server configuration error." }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "No signature" }), { status: 400 });
    }

    const expected = await hmacSha512Hex(PAYSTACK_SECRET_KEY, rawBody);
    if (expected.toLowerCase() !== signature.toLowerCase()) {
      console.warn("Invalid Paystack webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 403 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event?.event as string | undefined;

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    if (eventType === "charge.success") {
      const userId = event?.data?.metadata?.user_id as string | undefined;
      const plan = (event?.data?.metadata?.plan as string | undefined) ?? "premium";
      if (userId && plan === "premium") {
        const { error } = await supabaseAdmin.from("profiles").update({ plan_type: "premium" }).eq("id", userId);
        if (error) {
          console.error("Database update error:", error);
          throw error;
        }
      } else {
        console.warn("charge.success missing metadata.user_id or plan mismatch");
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Paystack webhook processing error:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

