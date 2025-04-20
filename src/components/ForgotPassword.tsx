import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { TimerReset as KeyReset, AlertCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get the current domain, fallback to production URL if localhost
      const domain = window.location.hostname === 'localhost' 
        ? 'http://localhost:5173'
        : window.location.origin;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${domain}/reset-password`,
      });

      if (resetError) throw resetError;
      setSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-6 sm:p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <KeyReset className="mx-auto h-12 w-12 text-black" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Reset your password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="bg-green-50 text-green-700 p-4 rounded-md text-sm">
              If an account exists with that email, you'll receive a password reset link shortly.
              Please check your inbox and spam folder.
            </div>
            <Link
              to="/login"
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-black hover:bg-opacity-90 hover:ring-2 hover:ring-green-100 hover:ring-opacity-50 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to login
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-500 p-3 rounded-md text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="flex-grow">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-black hover:bg-opacity-90 hover:ring-2 hover:ring-green-100 hover:ring-opacity-50 transition-all duration-200 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>

              <Link
                to="/login"
                className="text-center text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}