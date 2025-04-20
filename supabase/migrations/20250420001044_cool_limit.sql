-- Drop comments table and related functions
DROP TABLE IF EXISTS headline_comments CASCADE;
DROP FUNCTION IF EXISTS get_comments;
DROP FUNCTION IF EXISTS get_paginated_comments_v2;