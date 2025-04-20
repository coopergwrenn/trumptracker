import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Brain, BarChart3, Clock, ExternalLink, Gift, Star, Building2, Scale, ChevronDown, ChevronUp, CheckCircle2, MessageSquare, Bot, Database, Send } from 'lucide-react';
import { useSpotlightNews } from '../hooks/useSpotlightNews';

function calculateNeutralityScore(original: string, neutral: string | null): number {
  if (!original || !neutral) return 0;
  
  const originalWords = original.toLowerCase().split(/\s+/);
  const neutralWords = neutral.toLowerCase().split(/\s+/);
  
  const commonWords = originalWords.filter(word => neutralWords.includes(word));
  
  const similarity = commonWords.length / Math.max(originalWords.length, neutralWords.length);
  
  return Math.round((1 - similarity) * 100);
}

export default function Home() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { spotlightNews, loading } = useSpotlightNews();

  const titleScore = spotlightNews 
    ? calculateNeutralityScore(spotlightNews.original_title, spotlightNews.neutral_title)
    : 85;

  const descriptionScore = spotlightNews?.original_description && spotlightNews?.neutral_description
    ? calculateNeutralityScore(spotlightNews.original_description, spotlightNews.neutral_description)
    : 0;

  const averageScore = Math.round((titleScore + descriptionScore) / (spotlightNews?.original_description ? 2 : 1));

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div id="home" className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:pb-28 xl:pb-32">
            <main className="mt-24 mx-auto max-w-7xl px-4 sm:mt-32 sm:px-6 md:mt-36 lg:mt-40 lg:px-8">
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <Gift className="h-4 w-4 mr-2" />
                    Limited Time: 7-Day Full Access
                  </div>
                </div>
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="inline sm:block">Neutral news by AI</span>
                  <span className="block text-gray-900">on Trump's Cabinet</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl">
                  Our advanced system filters out partisan language in real-time, giving you clear, factual updates—no spin, no noise.
                </p>
                <div className="mt-5 sm:mt-8 flex justify-center space-x-4">
                  <Link
                    to="/signup"
                    className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-black hover:bg-black hover:bg-opacity-90 hover:ring-2 hover:ring-green-100 hover:ring-opacity-50 transition-all duration-200 md:py-4 md:text-lg md:px-10"
                  >
                    Start Your Free Week
                  </Link>
                  <button
                    onClick={() => {
                      const featuresSection = document.getElementById('features');
                      if (featuresSection) {
                        featuresSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="inline-flex items-center px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50 hover:ring-2 hover:ring-green-100 hover:ring-opacity-50 transition-all duration-200 md:py-4 md:text-lg md:px-10"
                  >
                    Learn More
                  </button>
                </div>

                {/* News Spotlight Card */}
                <div className="mt-12 max-w-2xl mx-auto text-left">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200">
                    <div className="flex flex-col space-y-3">
                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          <Star className="h-4 w-4 mr-2 fill-current" />
                          Daily spotlight
                        </div>
                        {!loading && spotlightNews && (
                          <>
                            <div className="flex items-center">
                              <Building2 className="h-4 w-4 mr-1" />
                              <span>{spotlightNews.source_name}</span>
                            </div>
                            <span className="hidden sm:inline">•</span>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>{new Date(spotlightNews.published_at).toLocaleDateString()}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                        {loading ? (
                          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                        ) : (
                          spotlightNews?.neutral_title || spotlightNews?.original_title
                        )}
                      </h3>

                      {/* Description */}
                      <div className="text-gray-600">
                        {loading ? (
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                          </div>
                        ) : (
                          spotlightNews?.neutral_description?.split('\n\n')[0] || 
                          spotlightNews?.original_description
                        )}
                      </div>

                      {/* Expand/Collapse button */}
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full text-left py-2 flex items-center justify-between text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200"
                      >
                        <span>
                          {isExpanded ? 'Show less' : 'Show detailed summary'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>

                      {/* Expanded content */}
                      {isExpanded && spotlightNews?.neutral_description && (
                        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                          <div className="prose prose-sm max-w-none">
                            {spotlightNews.neutral_description.split('\n\n').slice(1).map((paragraph, index) => (
                              <p key={index} className="text-gray-600 whitespace-pre-line">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-100">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                          <div className="flex items-center">
                            <Scale className="h-4 w-4 text-green-600" />
                            <span className="ml-2 text-sm font-medium text-green-600">
                              Neutrality Score: {averageScore}%
                            </span>
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
                        {spotlightNews && (
                          <a
                            href={spotlightNews.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm font-medium text-black hover:text-gray-700"
                          >
                            Read full article
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-gray-600 max-w-2xl mx-auto">
                  <p className="text-lg">
                    Whether you follow Trump closely or just want balanced coverage, our AI-driven platform delivers the latest headlines without the polarizing rhetoric. We continuously scan leading news sources, then automatically reframe articles to remove political bias.
                  </p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-black font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Skip the Hype, Focus on Facts
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              The result? A curated feed of straightforward, fact-based updates.
            </p>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="pt-6">
                <div className="flow-root bg-white rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-black rounded-md shadow-lg">
                        <Brain className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Focused on Facts</h3>
                    <p className="mt-5 text-base text-gray-500">
                      We analyze and neutralize headlines so you can skip the hype and focus on what matters.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="flow-root bg-white rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-black rounded-md shadow-lg">
                        <Clock className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Real-Time Updates</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Stay up to date with continuous scanning of top news outlets.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="flow-root bg-white rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-black rounded-md shadow-lg">
                        <BarChart3 className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Simple & Convenient</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Enjoy a clean, user-friendly dashboard tailored to your interests.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Section */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
            <div className="lg:col-span-5">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Ask Our AI Assistant
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                Get instant, unbiased insights about Trump and his cabinet. Our AI analyzes our neutral news database to provide factual, balanced answers to your questions.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  {
                    icon: Bot,
                    title: "Instant Answers",
                    description: "Get immediate responses to your questions about Trump's latest activities and policies."
                  },
                  {
                    icon: Database,
                    title: "Fact-Based Responses",
                    description: "Answers drawn from our curated database of neutralized news articles."
                  },
                  {
                    icon: Brain,
                    title: "Bias-Free Analysis",
                    description: "Receive balanced, objective information without political spin."
                  }
                ].map((feature) => (
                  <div key={feature.title} className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-10 w-10 rounded-md bg-black text-white">
                        <feature.icon className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{feature.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link
                  to="/signup"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-black hover:bg-black hover:bg-opacity-90 hover:ring-2 hover:ring-green-100 hover:ring-opacity-50 transition-all duration-200"
                >
                  Try the AI Assistant
                  <MessageSquare className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
            <div className="mt-12 lg:mt-0 lg:col-span-7">
              <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                {/* Chat Interface Preview */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-medium text-gray-900">AI Assistant</h3>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {/* Example Conversation */}
                  <div className="flex justify-end">
                    <div className="bg-black text-white rounded-lg px-4 py-2 max-w-[80%]">
                      <p>What has been the impact of Trump's 104% Chinese tariffs?</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-[80%]">
                      <p>President Trump's implementation of 104% tariffs on Chinese imports has had significant economic effects since taking effect in early 2025. The policy has reshaped trade dynamics between the US and China, with notable impacts on global supply chains and domestic manufacturing.</p>
                      <ul className="mt-2 list-disc list-inside text-sm">
                        <li>Domestic manufacturing has seen a 15% increase</li>
                        <li>Chinese imports decreased by 40% in Q1 2025</li>
                        <li>Alternative supply chains emerging in Southeast Asia</li>
                        <li>Ongoing trade negotiations with Beijing</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Ask a question..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      disabled
                    />
                    <button
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black opacity-50 cursor-not-allowed"
                      disabled
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Join Our Community
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-lg mx-auto">
              Join our community of readers who prefer clarity over chaos. Subscribe now for daily, unbiased coverage and gain a balanced perspective on all things Trump—no drama, just the facts.
            </p>
          </div>
          <div className="mt-16 bg-white rounded-lg shadow-lg overflow-hidden lg:max-w-none lg:flex">
            <div className="px-6 py-8 lg:flex-1 lg:p-12">
              <h3 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
                Premium Subscription
              </h3>
              <p className="mt-6 text-base text-gray-500">
                Get unlimited access to all our features, including:
              </p>
              <div className="mt-8">
                <div className="flex items-center">
                  <div className="flex-1">
                    <ul className="space-y-4">
                      <li className="flex items-center">
                        <div className="flex-shrink-0">
                          <Newspaper className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="ml-3 text-base text-gray-700">Unlimited article access</p>
                      </li>
                      <li className="flex items-center">
                        <div className="flex-shrink-0">
                          <Brain className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="ml-3 text-base text-gray-700">AI bias analysis</p>
                      </li>
                      <li className="flex items-center">
                        <div className="flex-shrink-0">
                          <Clock className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="ml-3 text-base text-gray-700">Real-time notifications</p>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="py-8 px-6 text-center bg-gray-50 lg:flex-shrink-0 lg:flex lg:flex-col lg:justify-center lg:p-12">
              <div className="flex items-center justify-center">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <Gift className="h-4 w-4 mr-2" />
                  Try Premium Free
                </span>
              </div>
              <p className="mt-4 text-lg leading-6 font-medium text-gray-900">
                Then just
              </p>
              <div className="mt-4 flex items-center justify-center text-5xl font-extrabold text-gray-900">
                <span>$1.99</span>
                <span className="ml-3 text-xl font-medium text-gray-500">/mo</span>
              </div>
              <div className="mt-6">
                <Link
                  to="/signup"
                  className="flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-black hover:bg-black hover:bg-opacity-90 hover:ring-2 hover:ring-green-100 hover:ring-opacity-50 transition-all duration-200"
                >
                  Start Free Trial
                </Link>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                Full access. Easy cancellation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}