import React, { useState } from 'react';
import { MessageCircle, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { useComments } from '../hooks/useComments';
import LoadingSpinner from './LoadingSpinner';

interface CommentsSectionProps {
  headlineId: string;
}

export default function CommentsSection({ headlineId }: CommentsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [anonymousName, setAnonymousName] = useState('');

  const {
    comments,
    loading,
    error,
    addComment,
    isPosting,
    successMessage
  } = useComments(headlineId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isPosting) return;

    try {
      await addComment(newComment, anonymousName);
      setNewComment('');
      setAnonymousName('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        <span>
          {loading ? (
            <LoadingSpinner size="sm" />
          ) : (
            `${comments.length} Comments`
          )}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="Optional nickname (e.g., Guest123)"
                value={anonymousName}
                onChange={(e) => setAnonymousName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                maxLength={50}
                disabled={isPosting}
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Share your thoughts..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                maxLength={500}
                disabled={isPosting}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isPosting}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-black hover:bg-opacity-90 disabled:opacity-50 transition-opacity duration-200"
              >
                {isPosting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>

          {successMessage && (
            <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-md">
              <CheckCircle className="h-4 w-4" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {loading ? (
              <LoadingSpinner />
            ) : comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-4 text-sm">
                  <div className="text-gray-900">{comment.comment_text}</div>
                  <div className="mt-2 text-xs text-gray-500">
                    Posted by {comment.anonymous_name} • {formatDate(comment.created_at)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 text-sm py-4">
                No comments yet. Be the first to share your thoughts!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}