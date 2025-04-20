import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import OpenAI from "npm:openai@4.28.0";

const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
const X_API_KEY = Deno.env.get("X_API_KEY");
const X_API_SECRET = Deno.env.get("X_API_SECRET");
const NEWS_API_KEY = Deno.env.get("NEWS_API_KEY");

if (!openaiApiKey || !X_API_KEY || !X_API_SECRET || !NEWS_API_KEY) {
  throw new Error("Missing required API keys");
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// X API Authentication
async function getXAccessToken() {
  try {
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
  } catch (error) {
    console.error('X API auth error:', error);
    return null;
  }
}

// Extract key terms and entities from question
function extractKeyTerms(question: string) {
  // Convert to lowercase and remove special characters
  const text = question.toLowerCase().replace(/[^\w\s]/g, ' ');
  
  // Split into words
  const words = text.split(/\s+/).filter(word => word.length > 2);
  
  // Extract potential entities (capitalized words)
  const entities = question.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  
  // Common stop words to filter out
  const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'about']);
  
  // Filter out stop words and get unique terms
  const terms = [...new Set(words.filter(word => !stopWords.has(word)))];
  
  return {
    terms,
    entities: [...new Set(entities)],
  };
}

// Calculate relevance score for content
function calculateRelevanceScore(content: string, terms: string[], entities: string[]) {
  const text = content.toLowerCase();
  
  // Term matching score
  const termScore = terms.reduce((score, term) => {
    const count = (text.match(new RegExp(term, 'g')) || []).length;
    return score + (count * 0.5); // 0.5 points per term match
  }, 0);
  
  // Entity matching score (weighted higher)
  const entityScore = entities.reduce((score, entity) => {
    const count = (content.match(new RegExp(entity, 'gi')) || []).length;
    return score + (count * 2); // 2 points per entity match
  }, 0);
  
  return termScore + entityScore;
}

// Find relevant content from all sources
async function findRelevantContent(question: string) {
  try {
    const { terms, entities } = extractKeyTerms(question);
    console.log('Search terms:', { terms, entities });
    
    // Get X API access token
    const xAccessToken = await getXAccessToken();

    // Parallel fetch from all sources
    const [recentArticles, historicalArticles, xPosts, newsApiArticles] = await Promise.all([
      // Recent articles (last 24 hours)
      supabase
        .from("news_headlines")
        .select("*")
        .eq("neutralization_status", "completed")
        .gte("published_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("published_at", { ascending: false }),

      // Historical articles (last 7 days)
      supabase
        .from("news_headlines")
        .select("*")
        .eq("neutralization_status", "completed")
        .gte("published_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("published_at", { ascending: false }),

      // X posts
      supabase
        .from("x_posts")
        .select("*")
        .is("deleted_at", null)
        .order("posted_at", { ascending: false })
        .limit(20),

      // NewsAPI articles
      fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(question)}&apiKey=${NEWS_API_KEY}&language=en&sortBy=publishedAt`)
        .then(res => res.json())
        .then(data => data.articles || [])
        .catch(error => {
          console.error('NewsAPI error:', error);
          return [];
        })
    ]);

    // Process and score content
    const scoredContent = [
      ...(recentArticles.data || []).map(article => {
        const text = `${article.neutral_title} ${article.neutral_description || ''} ${article.neutral_summary || ''}`;
        const relevanceScore = calculateRelevanceScore(text, terms, entities);
        
        return {
          type: 'recent_news',
          title: article.neutral_title || article.original_title,
          content: article.neutral_description || article.original_description,
          summary: article.neutral_summary,
          url: article.url,
          source: article.source_name,
          date: article.published_at,
          baseScore: 5, // Recent articles get highest base score
          relevanceScore,
          finalScore: 5 + relevanceScore,
        };
      }),
      
      ...(historicalArticles.data || []).map(article => {
        const text = `${article.neutral_title} ${article.neutral_description || ''} ${article.neutral_summary || ''}`;
        const relevanceScore = calculateRelevanceScore(text, terms, entities);
        const daysOld = (Date.now() - new Date(article.published_at).getTime()) / (1000 * 60 * 60 * 24);
        
        return {
          type: 'historical_news',
          title: article.neutral_title || article.original_title,
          content: article.neutral_description || article.original_description,
          summary: article.neutral_summary,
          url: article.url,
          source: article.source_name,
          date: article.published_at,
          baseScore: 3, // Historical articles get medium base score
          relevanceScore,
          finalScore: 3 + relevanceScore - (daysOld * 0.2), // Penalty for older content
        };
      }),
      
      ...(xPosts.data || []).map(post => {
        const text = post.neutral_content || post.content;
        const relevanceScore = calculateRelevanceScore(text, terms, entities);
        const engagementScore = (post.likes_count + post.retweets_count) / 1000; // Engagement bonus
        
        return {
          type: 'x_post',
          title: `X Post from ${post.author_username}`,
          content: text,
          url: `https://twitter.com/i/web/status/${post.post_id}`,
          source: 'X (Twitter)',
          date: post.posted_at,
          metrics: {
            likes: post.likes_count,
            retweets: post.retweets_count,
            replies: post.replies_count,
          },
          baseScore: 4, // X posts get high base score
          relevanceScore,
          finalScore: 4 + relevanceScore + engagementScore,
        };
      }),

      // Process NewsAPI articles
      ...newsApiArticles.map((article: any) => {
        const text = `${article.title} ${article.description || ''}`;
        const relevanceScore = calculateRelevanceScore(text, terms, entities);
        
        return {
          type: 'newsapi',
          title: article.title,
          content: article.description,
          url: article.url,
          source: article.source.name,
          date: article.publishedAt,
          baseScore: 2, // NewsAPI articles get lower base score
          relevanceScore,
          finalScore: 2 + relevanceScore,
        };
      }),
    ];

    // Sort by final score and filter out low-relevance content
    const filteredContent = scoredContent
      .filter(item => item.finalScore > 2) // Remove low-relevance content
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 5); // Keep only top 5 most relevant items

    console.log('Found relevant content:', filteredContent.length, 'items');
    return filteredContent;
  } catch (error) {
    console.error("Error finding relevant content:", error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();

    if (!question) {
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Find relevant content
    const relevantContent = await findRelevantContent(question);
    
    // Format content for context
    const contentContext = relevantContent
      .map(item => {
        const date = new Date(item.date).toLocaleString();
        const metrics = item.metrics
          ? `\nEngagement: ${item.metrics.likes} likes, ${item.metrics.retweets} retweets`
          : '';
        
        return `[${date}] ${item.title}\n${item.content}${item.summary ? `\nSummary: ${item.summary}` : ''}${metrics}\nSource: ${item.source}\nURL: ${item.url}\nRelevance Score: ${item.finalScore.toFixed(2)}\n`;
      })
      .join('\n\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a neutral AI assistant specializing in Trump-related news analysis. Your purpose is to provide factual, unbiased information based on verified news sources.

Guidelines:
1. Use ONLY the provided context and widely known historical facts
2. If the context doesn't contain relevant information, acknowledge the limitations
3. Maintain strict neutrality in language and tone
4. Cite dates and sources when possible
5. Distinguish between verified facts and claims
6. If a topic is controversial, acknowledge multiple perspectives
7. Focus on factual reporting rather than interpretation
8. Keep responses concise and well-organized

Recent relevant context:
${contentContext}

If the context is insufficient, say: "Based on the available sources, I can only provide limited information about this topic. Here's what I know: [provide limited answer]"`
        },
        {
          role: "user",
          content: question
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const answer = completion.choices[0].message.content;

    // Format sources for the frontend
    const articles = relevantContent.map(item => ({
      title: item.title,
      url: item.url,
      source: item.source,
      date: new Date(item.date).toLocaleString()
    }));

    return new Response(
      JSON.stringify({ answer, articles }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Chat error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred processing your request";
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});