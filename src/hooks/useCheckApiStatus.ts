import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface ApiStatus {
  status: 'ok' | 'error' | 'loading';
  error: string | null;
}

export function useCheckApiStatus(): ApiStatus {
  const [status, setStatus] = useState<ApiStatus>({
    status: 'loading',
    error: null
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('news_headlines')
          .select('id')
          .limit(1);

        if (error) {
          throw error;
        }

        setStatus({
          status: 'ok',
          error: null
        });
      } catch (err) {
        setStatus({
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed to connect to the API'
        });
      }
    };

    checkStatus();

    // Check API status every 5 minutes
    const interval = setInterval(checkStatus, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return status;
}