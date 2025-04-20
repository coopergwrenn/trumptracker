import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface NewsSearchResult {
  database_articles: any[];
  fresh_articles: any[];
}

export function useNewsSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchNews = async (query: string): Promise<NewsSearchResult | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/news-search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('News search error:', err);
      setError(err instanceof Error ? err.message : 'Failed to search news');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { searchNews, loading, error };
}