import { createClient } from "@supabase/supabase-js";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
const PAYSTACK_PREMIUM_AMOUNT_KOBO = Number(Deno.env.get("PAYSTACK_PREMIUM_AMOUNT_KOBO") ?? "0");
const PAYSTACK_CURRENCY = Deno.env.get("PAYSTACK_CURRENCY") ?? "NGN";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  if (!PAYSTACK_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "PAYSTACK_SECRET_KEY is not set." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
  if (!Number.isFinite(PAYSTACK_PREMIUM_AMOUNT_KOBO) || PAYSTACK_PREMIUM_AMOUNT_KOBO <= 0) {
    return new Response(
      JSON.stringify({ error: "PAYSTACK_PREMIUM_AMOUNT_KOBO is not set or invalid." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const plan = (body?.plan ?? "premium") as string;
    const returnUrl = (body?.returnUrl ?? req.headers.get("Origin") ?? "") as string;

    if (plan !== "premium") {
      return new Response(JSON.stringify({ error: "Unknown plan." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: PAYSTACK_PREMIUM_AMOUNT_KOBO,
        currency: PAYSTACK_CURRENCY,
        callback_url: returnUrl,
        metadata: {
          user_id: user.id,
          plan,
        },
      }),
    });

    const initJson = await initRes.json().catch(() => null);
    if (!initRes.ok || !initJson?.status) {
      const msg = initJson?.message ?? initRes.statusText ?? "Paystack initialize failed";
      throw new Error(msg);
    }

    return new Response(
      JSON.stringify({
        authorization_url: initJson.data.authorization_url,
        reference: initJson.data.reference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("Paystack checkout init error:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

