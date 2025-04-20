import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Comment {
  id: string;
  comment_text: string;
  anonymous_name: string;
  created_at: string;
}

interface UseCommentsResult {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  addComment: (text: string, name?: string) => Promise<void>;
  isPosting: boolean;
  successMessage: string | null;
}

export function useComments(headlineId: string): UseCommentsResult {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('headline_comments')
        .select('*')
        .eq('headline_id', headlineId)
        .eq('status', 'visible')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [headlineId]);

  // Initial fetch
  useEffect(() => {
    if (headlineId) {
      fetchComments();
    }
  }, [headlineId, fetchComments]);

  // Add comment
  const addComment = async (text: string, name?: string) => {
    if (!text.trim() || isPosting) return;

    setIsPosting(true);
    setError(null);
    
    try {
      const newComment = {
        headline_id: headlineId,
        comment_text: text.trim(),
        anonymous_name: name?.trim() || 'Anonymous',
        status: 'visible'
      };

      const { error: insertError } = await supabase
        .from('headline_comments')
        .insert([newComment]);

      if (insertError) throw insertError;

      // Show success message
      setSuccessMessage('Comment posted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh comments
      await fetchComments();
    } catch (err) {
      console.error('Error posting comment:', err);
      setError('Failed to post comment. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  return {
    comments,
    loading,
    error,
    addComment,
    isPosting,
    successMessage
  };
}