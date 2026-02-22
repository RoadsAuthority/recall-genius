
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { term, level } = await req.json()

        let explanation = "";
        if (level === "beginner") {
            explanation = `Imagine "${term}" is like a simple tool... [Simplified AI Explanation]`;
        } else {
            explanation = `"${term}" involves complex mechanisms such as... [Academic-level AI Explanation]`;
        }

        return new Response(
            JSON.stringify({ explanation }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
