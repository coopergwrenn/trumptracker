import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useInfiniteNews } from '../hooks/useInfiniteNews';
import { useXApiStatus } from '../hooks/useXApiStatus';
import { LogOut, AlertCircle, RefreshCcw, ExternalLink, Clock, Building2, Scale, ChevronDown, ChevronUp, CheckCircle2, MessageSquare, Share2, Info as InfoIcon } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import FilterToolbar from './FilterToolbar';
import LoadingSpinner from './LoadingSpinner';
import CommentsSection from './CommentsSection';
import type { Database } from '../types/database';
import { calculateNeutralityScore, getNeutralityLabel, getNeutralityColor } from '../utils/neutralityScore';

type NewsHeadline = Database['public']['Tables']['news_headlines']['Row'] & {
  isExpanded?: boolean;
};

const exampleHeadlines: NewsHeadline[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
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
  }
];

function formatDescription(description: string): string[] {
  return description.split('\n').filter(line => line.trim());
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
    return publishedDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const { headlines, loading: loadingNews, error: newsError, hasMore, fetchMore, reset, setHeadlines } = useInfiniteNews();
  const [filteredHeadlines, setFilteredHeadlines] = useState<NewsHeadline[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [sources, setSources] = useState<string[]>(['Associated Press', 'Reuters', 'Bloomberg']);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const { status: xApiStatus, error: xApiError } = useXApiStatus();

  const observer = useRef<IntersectionObserver>();
  const lastHeadlineRef = useCallback((node: HTMLDivElement | null) => {
    if (loadingNews) return;

    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchMore();
      }
    });

    if (node) observer.current.observe(node);
  }, [loadingNews, hasMore, fetchMore]);

  useEffect(() => {
    if (user) {
      fetchMore();
    }
  }, [user, fetchMore]);

  useEffect(() => {
    filterHeadlines();
  }, [headlines, searchTerm, startDate, endDate, selectedSource]);

  useEffect(() => {
    if (headlines.length > 0) {
      const uniqueSources = Array.from(new Set(headlines.map(h => h.source_name))).sort();
      setSources(uniqueSources);
    }
  }, [headlines]);

  useEffect(() => {
    let timeout: number;
    if (showShareTooltip) {
      timeout = window.setTimeout(() => {
        setShowShareTooltip(false);
      }, 2000);
    }
    return () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
    };
  }, [showShareTooltip]);

  const filterHeadlines = () => {
    let filtered = [...headlines];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(headline => 
        headline.neutral_title?.toLowerCase().includes(searchLower) ||
        headline.original_title.toLowerCase().includes(searchLower) ||
        headline.neutral_description?.toLowerCase().includes(searchLower) ||
        headline.original_description?.toLowerCase().includes(searchLower)
      );
    }

    if (startDate) {
      filtered = filtered.filter(headline => 
        new Date(headline.published_at) >= new Date(startDate)
      );
    }
    if (endDate) {
      filtered = filtered.filter(headline => 
        new Date(headline.published_at) <= new Date(endDate)
      );
    }

    if (selectedSource !== 'all') {
      filtered = filtered.filter(headline => 
        headline.source_name === selectedSource
      );
    }

    const hasActiveFilters = searchTerm || startDate || endDate || selectedSource !== 'all';
    setFilteredHeadlines(
      filtered.length > 0 || hasActiveFilters ? filtered : exampleHeadlines
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSelectedSource('all');
  };

  const toggleExpand = (id: string) => {
    setFilteredHeadlines(prev => 
      prev.map(headline => 
        headline.id === id 
          ? { ...headline, isExpanded: !headline.isExpanded }
          : headline
      )
    );
  };

  const handleShare = async (headline: NewsHeadline) => {
    const shareUrl = `${window.location.origin}/share/${headline.id}`;
    const shareData = {
      title: headline.neutral_title || headline.original_title,
      text: 'Check out this AI-neutralized news article from Trump Tracker',
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareUrl(shareUrl);
        setShowShareTooltip(true);
      }
    } catch (err) {
      console.error('Failed to share:', err);
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareUrl(shareUrl);
        setShowShareTooltip(true);
      } catch (clipboardErr) {
        console.error('Failed to copy to clipboard:', clipboardErr);
      }
    }
  };

  const refreshNews = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-news`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMessage = `Failed to refresh news: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use the default error message
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      setError(null);
      reset();
      await fetchMore();
    } catch (err) {
      console.error('Error refreshing news:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh news. Please try again.';
      
      if (errorMessage.includes('session has expired')) {
        await signOut();
        return;
      }
      
      setError(errorMessage);
    } finally {
      setRefreshing(false);
    }
  };

  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!subscription?.is_active) {
    return <Navigate to="/pricing" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="text-xl font-bold text-gray-900">
              Trump Tracker
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                to="/chat"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                AI Assistant
              </Link>
              <button
                onClick={signOut}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-black hover:bg-opacity-90 hover:ring-2 hover:ring-green-100 hover:ring-opacity-50 transition-all duration-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="space-y-6">
            {xApiStatus === 'error' && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-red-800 font-medium">X API Error</h3>
                    <p className="mt-1 text-red-700">
                      {xApiError || 'Unable to connect to X API. Some features may be limited.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Latest Headlines</h2>
              <button
                onClick={refreshNews}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors duration-200"
              >
                <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Neutralizing...' : 'Refresh'}
              </button>
            </div>

            <FilterToolbar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              selectedSource={selectedSource}
              setSelectedSource={setSelectedSource}
              sources={sources}
              onClearFilters={clearFilters}
            />

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                  <div className="text-red-700">{error}</div>
                </div>
              </div>
            )}

            {loadingNews && filteredHeadlines.length === 0 ? (
              <div className="text-center py-12">
                <LoadingSpinner />
                <div className="text-gray-600 mt-2">Loading headlines...</div>
              </div>
            ) : filteredHeadlines.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-600">
                  No headlines match your filters. Try adjusting your search criteria.
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredHeadlines.map((headline, index) => {
                  const neutralityMetrics = calculateNeutralityScore(
                    headline.original_title + (headline.original_description || ''),
                    (headline.neutral_title || '') + (headline.neutral_description || '')
                  );

                  const isLastElement = index === filteredHeadlines.length - 1;
                  const descriptionParagraphs = headline.neutral_description 
                    ? formatDescription(headline.neutral_description)
                    : [];

                  return (
                    <div
                      key={headline.id}
                      ref={isLastElement ? lastHeadlineRef : null}
                      className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200"
                      data-testid="headline"
                    >
                      <div className="flex flex-col space-y-3">
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

                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                          {headline.neutral_title || headline.original_title}
                        </h3>

                        <div className="text-gray-600 space-y-2">
                          {descriptionParagraphs.map((paragraph, i) => (
                            <p key={i} className="text-gray-600">
                              {paragraph}
                            </p>
                          ))}
                        </div>

                        {descriptionParagraphs.length > 1 && (
                          <button
                            onClick={() => toggleExpand(headline.id)}
                            className="w-full text-left py-2 flex items-center justify-between text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200"
                          >
                            <span>
                              {headline.isExpanded ? 'Show less' : 'Show detailed summary'}
                            </span>
                            {headline.isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        )}

                        {headline.isExpanded && descriptionParagraphs.length > 1 && (
                          <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                            <div className="prose prose-sm max-w-none">
                              {descriptionParagraphs.slice(1).map((paragraph, i) => (
                                <p key={i} className="text-gray-600">
                                  {paragraph}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-100">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                            <div className="flex items-center">
                              <Scale className="h-4 w-4 text-green-600" />
                              <span className={`ml-2 text-sm font-medium ${getNeutralityColor(neutralityMetrics.finalScore)}`}>
                                {getNeutralityLabel(neutralityMetrics.finalScore)} ({neutralityMetrics.finalScore}%)
                              </span>
                              <button
                                className="ml-1 text-gray-400 hover:text-gray-600"
                                title="View neutrality metrics"
                                onClick={() => {
                                  console.log('Neutrality metrics:', neutralityMetrics);
                                }}
                              >
                                <InfoIcon className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                AI Neutralized
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Fact Checked
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => handleShare(headline)}
                              className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 relative group"
                            >
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                              {showShareTooltip && shareUrl && (
                                <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 text-xs bg-black text-white rounded whitespace-nowrap">
                                  Link copied!
                                </span>
                              )}
                            </button>
                            <a
                              href={headline.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm font-medium text-black hover:text-gray-700"
                            >
                              Read full article
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                          </div>
                        </div>

                        <CommentsSection headlineId={headline.id} />
                      </div>
                    </div>
                  );
                })}
                {loadingNews && (
                  <LoadingSpinner />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}