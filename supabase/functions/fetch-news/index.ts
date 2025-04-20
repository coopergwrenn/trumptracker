import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import OpenAI from "npm:openai@4.28.0";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const newsApiKey = Deno.env.get("NEWS_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

if (!newsApiKey || !supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function neutralizeText(text: string, isTitle: boolean = false): Promise<string> {
  if (!text) return "";
  
  try {
    const systemPrompt = isTitle
      ? `You are a neutral news editor. Rewrite the given headline in a strictly neutral, factual tone:
         1. Remove any bias, loaded language, or emotional terms
         2. Preserve all key facts and details
         3. Use clear, straightforward language
         4. Maintain proper context
         5. Do not add any formatting or bullet points`
      : `You are a neutral news editor. Rewrite the given text in a strictly neutral, factual tone:
         1. Start with a concise overview paragraph that summarizes the key facts
         2. Follow with 3-5 detailed paragraphs, each focusing on a specific aspect:
            - Main event or announcement details
            - Context and background
            - Reactions or implications
            - Future developments or next steps (if applicable)
         3. Remove any bias, loaded language, or emotional terms
         4. Present only verifiable facts
         5. Use clear, straightforward language
         6. Separate paragraphs with line breaks
         7. Maintain proper chronology and context
         8. Do not use bullet points or special formatting`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 500, // Increased to allow for more detailed descriptions
    });

    return completion.choices[0].message.content || text;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return text;
  }
}

async function fetchAndProcessNews() {
  try {
    console.log("Starting news fetch...");
    
    const newsApiUrl = new URL('https://newsapi.org/v2/everything');
    newsApiUrl.searchParams.append('q', 'Donald Trump');
    newsApiUrl.searchParams.append('language', 'en');
    newsApiUrl.searchParams.append('pageSize', '20');
    newsApiUrl.searchParams.append('sortBy', 'publishedAt');

    console.log("Fetching from NewsAPI:", newsApiUrl.toString());

    const response = await fetch(newsApiUrl.toString(), {
      headers: {
        "X-Api-Key": newsApiKey,
        "User-Agent": "Supabase Edge Function"
      }
    });

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Fetched ${data.articles?.length || 0} articles from NewsAPI`);
    
    if (!data.articles?.length) {
      throw new Error("No articles returned from NewsAPI");
    }

    let processedCount = 0;
    const errors = [];
    
    for (const article of data.articles) {
      try {
        if (!article.title || !article.url) {
          console.log("Skipping article with missing required fields");
          continue;
        }

        // Check for existing article
        const { data: existing } = await supabase
          .from("news_headlines")
          .select("id")
          .eq("url", article.url)
          .single();

        if (existing) {
          console.log(`Article already exists: ${article.url}`);
          continue;
        }

        // Process article content with separate prompts for title and description
        const [neutralTitle, neutralDescription] = await Promise.all([
          neutralizeText(article.title, true),
          article.description ? neutralizeText(article.description, false) : Promise.resolve(null),
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
            neutralization_status: 'completed'
          });

        if (insertError) {
          throw new Error(`Error inserting article: ${insertError.message}`);
        }

        processedCount++;
        console.log(`Successfully processed article: ${article.url}`);
      } catch (articleError) {
        console.error(`Error processing article: ${articleError.message}`);
        errors.push(articleError.message);
        continue;
      }
    }

    return {
      success: true,
      message: `Successfully processed ${processedCount} new articles`,
      processedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Error in fetchAndProcessNews:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Request received:", req.method);
    console.log("Headers:", Object.fromEntries(req.headers.entries()));
    
    const result = await fetchAndProcessNews();
    
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json"
        },
      }
    );
  } catch (error) {
    console.error("Error in edge function:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});