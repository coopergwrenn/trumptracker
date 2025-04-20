import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import OpenAI from "npm:openai@4.28.0";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const newsApiKey = Deno.env.get("NEWS_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const apiKey = Deno.env.get("API_KEY");

if (!newsApiKey || !supabaseUrl || !supabaseServiceKey || !apiKey) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function neutralizeText(text: string): Promise<string> {
  if (!text) return "";
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a neutral news editor. Rewrite the given text in a strictly neutral, factual tone, removing any bias or emotional language. Keep the same key information but present it objectively. Format important details as bullet points after the main summary.",
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 250,
    });

    return completion.choices[0].message.content || text;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return text;
  }
}

async function fetchLatestNews() {
  // Get the timestamp of the most recent article
  const { data: latestArticle } = await supabase
    .from("news_headlines")
    .select("published_at")
    .order("published_at", { ascending: false })
    .limit(1)
    .single();

  // Set the from parameter to the latest article's date or 24 hours ago
  const fromDate = latestArticle
    ? new Date(latestArticle.published_at)
    : new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Construct the NewsAPI URL with search terms for Trump and his cabinet
  const searchQuery = encodeURIComponent(
    'Trump OR "Donald Trump" OR "Trump administration" OR "Mike Pence" OR "William Barr" OR "Mike Pompeo" OR "Steven Mnuchin"'
  );

  const newsApiUrl = new URL("https://newsapi.org/v2/everything");
  newsApiUrl.searchParams.append("q", searchQuery);
  newsApiUrl.searchParams.append("language", "en");
  newsApiUrl.searchParams.append("sortBy", "publishedAt");
  newsApiUrl.searchParams.append("pageSize", "100");
  newsApiUrl.searchParams.append("from", fromDate.toISOString());

  const response = await fetch(newsApiUrl.toString(), {
    headers: {
      "X-Api-Key": newsApiKey,
      "User-Agent": "Supabase Edge Function",
    },
  });

  if (!response.ok) {
    throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.articles || [];
}

async function processArticles(articles: any[]) {
  const results = {
    processed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const article of articles) {
    try {
      if (!article.title || !article.url) {
        results.skipped++;
        continue;
      }

      // Check for duplicate URL
      const { data: existing } = await supabase
        .from("news_headlines")
        .select("id")
        .eq("url", article.url)
        .single();

      if (existing) {
        results.skipped++;
        continue;
      }

      // Neutralize content
      const [neutralTitle, neutralDescription] = await Promise.all([
        neutralizeText(article.title),
        article.description ? neutralizeText(article.description) : Promise.resolve(null),
      ]);

      // Insert into database
      const { error: insertError } = await supabase
        .from("news_headlines")
        .insert({
          original_title: article.title,
          neutral_title: neutralTitle,
          original_description: article.description || null,
          neutral_description: neutralDescription,
          url: article.url,
          published_at: article.publishedAt,
          source_name: article.source.name,
        });

      if (insertError) {
        throw insertError;
      }

      results.processed++;
    } catch (error) {
      results.errors.push(`Error processing article: ${error.message}`);
    }
  }

  return results;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify API key
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch and process news
    const articles = await fetchLatestNews();
    const results = await processArticles(articles);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});