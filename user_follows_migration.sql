-- User Follows Feature Migration
-- This adds support for users to follow other users and get notified of new listings

-- Create user_follows table
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent users from following themselves
  CONSTRAINT check_not_self_follow CHECK (follower_id != following_id),
  
  -- Ensure unique follow relationships
  CONSTRAINT unique_follow UNIQUE (follower_id, following_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON public.user_follows(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own follows" ON public.user_follows;
DROP POLICY IF EXISTS "Users can view who follows them" ON public.user_follows;
DROP POLICY IF EXISTS "Users can create their own follows" ON public.user_follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.user_follows;

-- RLS Policy: Users can view follows they created (who they follow)
CREATE POLICY "Users can view their own follows" ON public.user_follows
  FOR SELECT USING (auth.uid() = follower_id);

-- RLS Policy: Users can view who follows them
CREATE POLICY "Users can view who follows them" ON public.user_follows
  FOR SELECT USING (auth.uid() = following_id);

-- RLS Policy: Users can create their own follows
CREATE POLICY "Users can create their own follows" ON public.user_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- RLS Policy: Users can delete their own follows (unfollow)
CREATE POLICY "Users can delete their own follows" ON public.user_follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Add notification type for new listings from followed users
-- This will be handled in the application code, but we ensure the type exists
-- The notification type 'followed_user_new_listing' will be added to the Notification type

