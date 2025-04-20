import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import OpenAI from "npm:openai@4.28.0";

const X_API_KEY = Deno.env.get("X_API_KEY");
const X_API_SECRET = Deno.env.get("X_API_SECRET");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!X_API_KEY || !X_API_SECRET || !OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getXAccessToken() {
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
  return data.access_token;
}

async function searchXPosts(query: string, accessToken: string) {
  try {
    // Add relevant accounts to search from
    const accounts = ['realDonaldTrump', 'TeamTrump', 'DonaldJTrumpJr'];
    const searchQuery = `${query} (from:${accounts.join(' OR from:')})`;
    
    const searchUrl = new URL('https://api.twitter.com/2/tweets/search/recent');
    searchUrl.searchParams.append('query', searchQuery);
    searchUrl.searchParams.append('tweet.fields', 'created_at,author_id,entities,public_metrics');
    searchUrl.searchParams.append('expansions', 'author_id');
    searchUrl.searchParams.append('user.fields', 'name,username');
    searchUrl.searchParams.append('max_results', '10');

    const response = await fetch(searchUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`X API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("X Search error:", error);
    return [];
  }
}

async function neutralizeContent(content: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a neutral content processor. Rewrite the given text to:
            1. Remove bias and emotional language
            2. Present only verifiable facts
            3. Use clear, straightforward language
            4. Maintain proper context
            5. Format with bullet points for clarity
            Do not add opinions or speculation.`,
        },
        {
          role: "user",
          content,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return completion.choices[0].message.content || content;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return content;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // First, check Supabase for existing articles
    const { data: existingArticles } = await supabase
      .from("news_headlines")
      .select("*")
      .eq("neutralization_status", "completed")
      .order("published_at", { ascending: false })
      .limit(5);

    // Get X access token
    const accessToken = await getXAccessToken();

    // Then fetch posts from X
    const xPosts = await searchXPosts(query, accessToken);

    // Process and neutralize X posts
    const processedPosts = await Promise.all(
      xPosts.map(async (post: any) => {
        const neutralContent = await neutralizeContent(post.text);

        return {
          title: post.text.slice(0, 100) + '...',
          url: `https://twitter.com/user/status/${post.id}`,
          source: 'X (Twitter)',
          published: post.created_at,
          neutral_content: neutralContent,
          metrics: post.public_metrics,
        };
      })
    );

    // Combine results
    const combinedResults = {
      database_articles: existingArticles || [],
      fresh_articles: processedPosts,
    };

    return new Response(
      JSON.stringify(combinedResults),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in news search:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});