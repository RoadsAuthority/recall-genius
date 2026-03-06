import { serve } from "std/http/server.ts"
import { createClient } from "supabase"

const PADDLE_API_URL = Deno.env.get("PADDLE_ENVIRONMENT") === "sandbox"
  ? "https://sandbox-api.paddle.com"
  : "https://api.paddle.com";
const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY");
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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
      headers: { "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    const { productId, priceId, quantity = 1 } = await req.json();

    if (!productId || !priceId) {
      return new Response(
        JSON.stringify({ error: "Product ID and Price ID are required." }),
        { headers: { "Content-Type": "application/json" }, status: 400 },
      );
    }

    if (!PADDLE_API_KEY) {
      throw new Error("PADDLE_API_KEY is not set.");
    }

    // Example of creating a Paddle checkout
    // This is a simplified example. You might need to adjust based on your Paddle setup
    // For more complex scenarios, you'd use Paddle's server-side API to create a transaction/checkout.
    // For initial setup, we can direct users to a product page or use Paddle.js directly on the frontend.
    // For a backend checkout, you'd typically create a "transaction" via the Paddle API.

    // This part assumes you want to create a checkout URL from the backend.
    // You would use the Paddle API to create a one-time checkout or subscription.
    // Documentation: https://developer.paddle.com/api/v2/transactions/create-transaction
    const transactionData = {
      items: [{
        price_id: priceId,
        quantity: quantity,
      }],
      customer_id: user.id, // Associate with Supabase user ID if applicable
      // You can add more fields like "billing_details", "collection_mode", "discounts", "custom_data", etc.
    };

    const response = await fetch(`${PADDLE_API_URL}/transactions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PADDLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transactionData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Paddle API Error:", errorData);
      throw new Error(
        `Failed to create Paddle checkout: ${errorData.detail || response.statusText}`,
      );
    }

    const { data } = await response.json();
    const checkoutUrl = data.checkout.url; // Assuming the Paddle API returns a checkout URL

    return new Response(JSON.stringify({ checkoutUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating Paddle checkout:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
