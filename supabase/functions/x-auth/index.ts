import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const X_API_KEY = Deno.env.get("X_API_KEY");
const X_API_SECRET = Deno.env.get("X_API_SECRET");

if (!X_API_KEY || !X_API_SECRET) {
  throw new Error("Missing X API credentials");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache for X access token
let cachedToken: { token: string; expires: number } | null = null;

async function getXAccessToken() {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expires > Date.now()) {
    return cachedToken.token;
  }

  const credentials = btoa(`${X_API_KEY}:${X_API_SECRET}`);
  
  const response = await fetch('https://api.twitter.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get X access token');
  }

  const data = await response.json();
  
  // Cache the token with expiration (1 hour before actual expiration)
  cachedToken = {
    token: data.access_token,
    expires: Date.now() + ((data.expires_in - 3600) * 1000),
  };

  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = await getXAccessToken();
    
    return new Response(
      JSON.stringify({ token }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("X auth error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to authenticate with X",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});