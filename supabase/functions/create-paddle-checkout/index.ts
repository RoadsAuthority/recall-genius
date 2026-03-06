import { createClient } from "@supabase/supabase-js"

const PADDLE_API_URL = Deno.env.get("PADDLE_ENVIRONMENT") === "sandbox"
  ? "https://sandbox-api.paddle.com"
  : "https://api.paddle.com";
const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY");
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    },
  );

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    const { priceId } = await req.json();

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "Price ID is required." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    if (!PADDLE_API_KEY) {
      throw new Error("PADDLE_API_KEY is not set.");
    }

    // Create a transaction via Paddle Billing API (v3)
    // https://developer.paddle.com/api-reference/transactions/create-transaction
    const response = await fetch(`${PADDLE_API_URL}/transactions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PADDLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            price_id: priceId,
            quantity: 1,
          },
        ],
        custom_data: {
          user_id: user.id,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Paddle API Error:", errorData);
      throw new Error(
        `Failed to create Paddle transaction: ${errorData.error?.detail || response.statusText}`,
      );
    }

    const { data } = await response.json();

    return new Response(JSON.stringify({ transactionId: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating Paddle transaction:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
