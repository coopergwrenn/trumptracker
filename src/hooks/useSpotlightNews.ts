import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database';

type NewsHeadline = Database['public']['Tables']['news_headlines']['Row'];

// Example headline for initial state and fallback
const exampleHeadline: NewsHeadline = {
  id: 'example-1',
  original_title: 'Trump Announced 104% Tariffs on Chinese Imports in Campaign Speech',
  neutral_title: 'Trump Detailed Trade Policy with Proposed 104% China Tariffs',
  original_description: 'In a major campaign announcement that impacted global markets, Trump declared he would impose massive 104% tariffs on Chinese goods if he wins the upcoming election.',
  neutral_description: 'Former President Trump outlined a trade policy proposal regarding China.\n\nCampaign announcement detailed proposed 104% tariff on Chinese imports.\nPolicy implementation contingent on election victory.\nMarkets responded to the announcement.\nInternational trade implications discussed.',
  url: 'https://example.com/news/1',
  published_at: new Date().toISOString(),
  source_name: 'Reuters',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  neutralization_status: 'completed',
  neutral_summary: null,
  error_log: null
};

// Prioritized news sources
const PRIORITY_SOURCES = ['Reuters', 'Associated Press', 'Bloomberg', 'The Wall Street Journal'];

export function useSpotlightNews() {
  const [spotlightNews, setSpotlightNews] = useState<NewsHeadline>(exampleHeadline);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSpotlightNews() {
      try {
        const now = new Date();
        const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

        // First try: Get the most recent news from the last 6 hours
        const { data: veryRecentData, error: veryRecentError } = await supabase
          .from('news_headlines')
          .select('*')
          .gte('published_at', sixHoursAgo.toISOString())
          .eq('neutralization_status', 'completed')
          .not('neutral_title', 'is', null)
          .not('neutral_description', 'is', null)
          .order('published_at', { ascending: false })
          .limit(1);

        if (veryRecentError) throw veryRecentError;

        if (veryRecentData && veryRecentData.length > 0) {
          setSpotlightNews(veryRecentData[0]);
          return;
        }

        // Second try: Get news from priority sources in the last 24 hours
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const { data: recentPriorityData, error: recentPriorityError } = await supabase
          .from('news_headlines')
          .select('*')
          .gte('published_at', twentyFourHoursAgo.toISOString())
          .eq('neutralization_status', 'completed')
          .not('neutral_title', 'is', null)
          .not('neutral_description', 'is', null)
          .in('source_name', PRIORITY_SOURCES)
          .order('published_at', { ascending: false })
          .limit(1);

        if (recentPriorityError) throw recentPriorityError;

        if (recentPriorityData && recentPriorityData.length > 0) {
          setSpotlightNews(recentPriorityData[0]);
          return;
        }

        // Third try: Get any neutralized article from the last 24 hours
        const { data: recentData, error: recentError } = await supabase
          .from('news_headlines')
          .select('*')
          .gte('published_at', twentyFourHoursAgo.toISOString())
          .eq('neutralization_status', 'completed')
          .not('neutral_title', 'is', null)
          .order('published_at', { ascending: false })
          .limit(1);

        if (recentError) throw recentError;

        if (recentData && recentData.length > 0) {
          setSpotlightNews(recentData[0]);
          return;
        }

        // Final fallback: Get the most recent completed article
        const { data: anyData, error: anyError } = await supabase
          .from('news_headlines')
          .select('*')
          .eq('neutralization_status', 'completed')
          .not('neutral_title', 'is', null)
          .order('published_at', { ascending: false })
          .limit(1);

        if (anyError) throw anyError;

        if (anyData && anyData.length > 0) {
          setSpotlightNews(anyData[0]);
        }
      } catch (err) {
        console.error('Error fetching spotlight news:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch spotlight news');
      } finally {
        setLoading(false);
      }
    }

    fetchSpotlightNews();

    // Refresh spotlight news every 15 minutes
    const interval = setInterval(fetchSpotlightNews, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { spotlightNews, loading, error };
}