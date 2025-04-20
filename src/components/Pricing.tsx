import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/signup');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ userId: user.id }),
        }
      );

      const { url, error } = await response.json();
      if (error) throw new Error(error);
      if (url) window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Start Your Premium Access
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Experience everything free for 7 days. Start your trial today.
          </p>
        </div>

        <div className="mt-16 bg-white rounded-lg shadow-xl overflow-hidden lg:max-w-none lg:flex mx-auto max-w-lg">
          <div className="px-6 py-8 lg:flex-1 lg:p-12">
            <h3 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Premium Subscription
            </h3>
            <div className="mt-8">
              <div className="flex items-center">
                <div className="flex-1">
                  <ul className="space-y-4">
                    {[
                      'Unlimited article access',
                      'AI bias analysis',
                      'Real-time notifications',
                      'Premium support',
                      'Early access to new features',
                    ].map((feature) => (
                      <li key={feature} className="flex items-center">
                        <Check className="h-5 w-5 text-green-500" />
                        <span className="ml-3 text-gray-700">{feature}</span>
                      </li>
                    ))}
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

            {error && (
              <div className="mt-4 text-sm text-red-500">
                {error}
              </div>
            )}

            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="mt-8 w-full flex justify-center py-3 px-5 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-black hover:bg-black hover:bg-opacity-90 hover:ring-2 hover:ring-green-100 hover:ring-opacity-50 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Start Free Trial'}
            </button>
            
            <p className="mt-4 text-sm text-gray-500">
              Full access. Easy cancellation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}