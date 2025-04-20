import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import LoadingSpinner from './LoadingSpinner';
import { CheckCircle2 } from 'lucide-react';

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'checking' | 'active' | 'error'>('checking');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    let isSubscribed = true;
    let timeoutId: number;

    const checkSubscription = async () => {
      try {
        const { data: subscription, error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (subscriptionError) throw subscriptionError;

        if (subscription?.is_active && 
            (subscription.subscription_status === 'active' || 
             subscription.subscription_status === 'trialing')) {
          if (isSubscribed) {
            setStatus('active');
            // Brief delay to show success message before redirect
            timeoutId = window.setTimeout(() => {
              if (isSubscribed) {
                navigate('/dashboard', { replace: true });
              }
            }, 1500);
          }
          return true;
        }
        return false;
      } catch (error) {
        console.error('Subscription check error:', error);
        return false;
      }
    };

    const pollSubscription = async () => {
      const maxAttempts = 10;
      const interval = 1000; // 1 second
      let attempts = 0;

      while (attempts < maxAttempts && isSubscribed) {
        const isActive = await checkSubscription();
        if (isActive) break;
        
        attempts++;
        if (attempts === maxAttempts) {
          if (isSubscribed) {
            setStatus('error');
            setError('Subscription activation is taking longer than expected. Please refresh the page or contact support.');
          }
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    };

    pollSubscription();

    return () => {
      isSubscribed = false;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [user, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="text-red-600 mb-4">
            {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-black hover:bg-opacity-90 hover:ring-2 hover:ring-green-100 hover:ring-opacity-50 transition-all duration-200"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          {status === 'checking' ? (
            <>
              <LoadingSpinner />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Setting up your subscription</h2>
              <p className="mt-2 text-gray-600">This will only take a moment...</p>
            </>
          ) : status === 'active' ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Subscription Active!</h2>
              <p className="text-gray-600">Redirecting you to your dashboard...</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}