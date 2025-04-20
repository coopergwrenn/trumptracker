import React, { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Lock, ExternalLink, Building2, Clock, Scale, CheckCircle2, Brain, Shield, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { supabase } from '../lib/supabaseClient';
import LoadingSpinner from './LoadingSpinner';
import type { Database } from '../types/database';

type NewsHeadline = Database['public']['Tables']['news_headlines']['Row'];

function calculateNeutralityScore(original: string, neutral: string | null): number {
  if (!original || !neutral) return 0;
  
  const originalWords = original.toLowerCase().split(/\s+/);
  const neutralWords = neutral.toLowerCase().split(/\s+/);
  
  const commonWords = originalWords.filter(word => neutralWords.includes(word));
  
  const similarity = commonWords.length / Math.max(originalWords.length, neutralWords.length);
  
  return Math.round((1 - similarity) * 100);
}

function formatTimeAgo(date: string): string {
  const now = new Date();
  const publishedDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - publishedDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    return publishedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

export default function Share() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const [headline, setHeadline] = useState<NewsHeadline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHeadline() {
      if (!id) {
        setError('No article ID provided');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('news_headlines')
          .select('*')
          .eq('id', id)
          .eq('neutralization_status', 'completed')
          .single();

        if (fetchError) {
          throw fetchError;
        }

        if (!data) {
          throw new Error('Article not found');
        }

        setHeadline(data);
      } catch (err) {
        console.error('Error fetching headline:', err);
        setError('Article not found');
      } finally {
        setLoading(false);
      }
    }

    fetchHeadline();
  }, [id]);

  if (loading || authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !headline) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h2>
          <p className="text-gray-600 mb-8">
            The article you're looking for might have been removed or is no longer available.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-black hover:bg-opacity-90 hover:ring-2 hover:ring-green-100 hover:ring-opacity-50 transition-all duration-200"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // Preview for non-subscribers
  if (!user || !subscription?.is_active) {
    const titleScore = calculateNeutralityScore(headline.original_title, headline.neutral_title);
    const descriptionScore = headline.original_description && headline.neutral_description
      ? calculateNeutralityScore(headline.original_description, headline.neutral_description)
      : 0;
    const averageScore = Math.round((titleScore + descriptionScore) / (headline.original_description ? 2 : 1));

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Article Preview */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="space-y-6">
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 mr-1" />
                  <span>{headline.source_name}</span>
                </div>
                <span className="hidden sm:inline">•</span>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{formatTimeAgo(headline.published_at)}</span>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                {headline.neutral_title || headline.original_title}
              </h1>

              {/* Preview of description with blur */}
              <div className="relative">
                <div className="text-gray-600 space-y-4 blur-sm">
                  {headline.neutral_description?.split('\n\n').slice(0, 2).map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                <div className="flex items-center">
                  <Scale className="h-4 w-4 text-green-600" />
                  <span className="ml-2 text-sm font-medium text-green-600">
                    Neutrality Score: {averageScore}%
                  </span>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  AI Neutralized
                </span>
              </div>
            </div>
          </div>

          {/* Conversion Section */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-8">
              <div className="text-center max-w-2xl mx-auto">
                <Brain className="h-12 w-12 text-black mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Stay Informed, Not Influenced
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Get access to AI-neutralized news about Trump and his cabinet. Our advanced system removes bias and emotional language, helping you make informed decisions based on facts, not rhetoric.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="flex flex-col items-center p-4">
                    <Brain className="h-8 w-8 text-green-600 mb-3" />
                    <h3 className="font-semibold text-gray-900">AI-Powered Neutrality</h3>
                    <p className="text-sm text-gray-600 text-center">
                      Advanced AI removes bias and emotional language
                    </p>
                  </div>
                  <div className="flex flex-col items-center p-4">
                    <Shield className="h-8 w-8 text-green-600 mb-3" />
                    <h3 className="font-semibold text-gray-900">Fact-Focused</h3>
                    <p className="text-sm text-gray-600 text-center">
                      Pure facts without partisan spin
                    </p>
                  </div>
                  <div className="flex flex-col items-center p-4">
                    <BarChart3 className="h-8 w-8 text-green-600 mb-3" />
                    <h3 className="font-semibold text-gray-900">Real-time Updates</h3>
                    <p className="text-sm text-gray-600 text-center">
                      Latest news as it happens
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Link
                    to="/signup"
                    className="block w-full text-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-black hover:bg-black hover:bg-opacity-90 hover:ring-2 hover:ring-green-100 hover:ring-opacity-50 transition-all duration-200"
                  >
                    Start Your Free Trial
                  </Link>
                  <p className="text-sm text-gray-500">
                    Full access for 7 days. Cancel anytime.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Redirect authenticated users with active subscription to dashboard
  return <Navigate to="/dashboard" replace />;
}