import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, AlertCircle, ArrowLeft, Database, Brain, ExternalLink, Twitter as BrandTwitter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import LoadingSpinner from './LoadingSpinner';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  articles?: Array<{
    title: string;
    url: string;
    source: string;
    date: string;
  }>;
}

export default function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not configured');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ question: input.trim() }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const botMessage: Message = {
        id: crypto.randomUUID(),
        type: 'bot',
        content: data.answer,
        timestamp: new Date(),
        articles: data.articles,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const suggestedQuestions = [
    "What happened this week?",
    "What are Trump's recent statements about the economy?",
    "What are Trump's latest policy proposals?",
    "What news from this week might affect the economy?"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              to="/dashboard"
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Link>
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
            </div>
            <div className="w-24" /> {/* Spacer for balance */}
          </div>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Info Banner */}
          <div className="bg-blue-50 p-4 border-b border-blue-100">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-800">
                  AI-Powered Analysis from Multiple Sources
                </h3>
                <div className="mt-2 space-y-2 text-sm text-blue-600">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>Curated database of neutralized news articles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BrandTwitter className="h-4 w-4" />
                    <span>Real-time X (Twitter) posts from verified sources</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    <span>AI neutralization removes bias and emotional language</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="h-[calc(100vh-16rem)] overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <Brain className="h-12 w-12 text-gray-400" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Ask me anything about Trump and his cabinet
                  </p>
                  <p className="text-sm text-gray-600">
                    I analyze our neutral news database and real-time X posts to provide fact-based, unbiased answers.
                  </p>
                </div>
                <div className="max-w-sm mx-auto space-y-2">
                  <p className="text-sm text-gray-500">Try asking about:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestedQuestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.type === 'user'
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.articles && message.articles.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-2">Referenced Articles:</p>
                        <div className="space-y-2">
                          {message.articles.map((article, index) => (
                            <div key={index} className="text-sm">
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span>{article.title}</span>
                              </a>
                              <div className="text-xs text-gray-500 mt-1">
                                {article.source} • {article.date}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100">
                  <LoadingSpinner />
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-center">
                <div className="flex items-center space-x-2 text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200">
            <form onSubmit={handleSubmit} className="p-4">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    rows={1}
                    disabled={loading}
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    Press Enter to send, Shift + Enter for new line
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-black hover:bg-opacity-90 hover:ring-2 hover:ring-green-100 hover:ring-opacity-50 transition-all duration-200 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Disclaimer */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
            Answers are generated using our AI system, combining neutralized news articles and X posts for comprehensive, unbiased coverage.
          </div>
        </div>
      </div>
    </div>
  );
}