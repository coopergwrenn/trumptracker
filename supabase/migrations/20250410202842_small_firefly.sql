/*
  # Delete placeholder news articles

  1. Changes
    - Removes all placeholder news articles with example.com URLs
    - Preserves real articles from actual news sources
    - Safe deletion using URL pattern matching
*/

DELETE FROM news_headlines 
WHERE url LIKE 'https://example.com/news/%';