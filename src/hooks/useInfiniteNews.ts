import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database';

type NewsHeadline = Database['public']['Tables']['news_headlines']['Row'] & {
  isExpanded?: boolean;
};

const PAGE_SIZE = 10;

export function useInfiniteNews() {
  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [subscription, setSubscription] = useState<ReturnType<typeof supabase.channel> | null>(null);

  // Unsubscribe from real-time updates during refresh
  const unsubscribe = useCallback(() => {
    if (subscription) {
      subscription.unsubscribe();
      setSubscription(null);
    }
  }, [subscription]);

  // Subscribe to real-time updates
  const subscribe = useCallback(() => {
    if (subscription) return;

    const newSubscription = supabase
      .channel('news_headlines_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'news_headlines',
          filter: 'neutralization_status=eq.completed'
        },
        (payload) => {
          if (isRefreshing) return;
          
          const newHeadline = payload.new as NewsHeadline;
          setHeadlines(prev => {
            // Add new headline at the beginning if it's not already present
            if (!prev.find(h => h.id === newHeadline.id)) {
              return [{ ...newHeadline, isExpanded: false }, ...prev];
            }
            return prev;
          });
          setTotalCount(prev => prev !== null ? prev + 1 : null);
        }
      )
      .subscribe();

    setSubscription(newSubscription);
  }, [isRefreshing]);

  const fetchHeadlines = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const from = isRefreshing ? 0 : page * PAGE_SIZE;

      const query = supabase
        .from('news_headlines')
        .select('*', { count: 'exact' })
        .eq('neutralization_status', 'completed')
        .order('published_at', { ascending: false });

      if (!isRefreshing) {
        query.range(from, from + PAGE_SIZE - 1);
      } else {
        query.limit(PAGE_SIZE);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      if (count !== null) {
        setTotalCount(count);
        setHasMore(from + PAGE_SIZE < count);
      }

      const headlinesWithExpanded = (data || []).map(h => ({ ...h, isExpanded: false }));
      
      setHeadlines(prev => {
        if (isRefreshing) {
          return headlinesWithExpanded;
        }
        const newHeadlines = [...prev];
        headlinesWithExpanded.forEach(headline => {
          if (!newHeadlines.find(h => h.id === headline.id)) {
            newHeadlines.push(headline);
          }
        });
        return newHeadlines;
      });

      if (!isRefreshing) {
        setPage(p => p + 1);
      }
    } catch (err) {
      console.error('Error fetching headlines:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch headlines');
      setHasMore(false);
    } finally {
      setLoading(false);
      if (isRefreshing) {
        setIsRefreshing(false);
        // Resubscribe to real-time updates after refresh
        subscribe();
      }
    }
  }, [page, loading, isRefreshing, subscribe]);

  // Initial subscription
  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  const reset = useCallback(() => {
    unsubscribe(); // Unsubscribe before refresh
    setHeadlines([]);
    setPage(0);
    setHasMore(true);
    setError(null);
    setTotalCount(null);
    setIsRefreshing(true);
  }, [unsubscribe]);

  return {
    headlines,
    loading,
    error,
    hasMore,
    fetchMore: fetchHeadlines,
    reset,
    setHeadlines
  };
}