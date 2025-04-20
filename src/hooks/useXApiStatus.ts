import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface XApiStatus {
  status: 'ok' | 'error' | 'loading';
  error: string | null;
}

export function useXApiStatus(): XApiStatus {
  const [status, setStatus] = useState<XApiStatus>({
    status: 'loading',
    error: null
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/x-auth`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to authenticate with X API');
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        setStatus({
          status: 'ok',
          error: null
        });
      } catch (err) {
        setStatus({
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed to connect to X API'
        });
      }
    };

    checkStatus();

    // Check X API status every 5 minutes
    const interval = setInterval(checkStatus, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return status;
}