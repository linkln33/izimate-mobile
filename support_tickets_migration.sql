-- Support Tickets Feature Migration
-- This adds support for users to create support tickets and get help

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Ticket Information
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('technical', 'billing', 'account', 'feature_request', 'bug_report', 'other')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  
  -- Response Information
  admin_response TEXT,
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  
  -- Metadata
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of attachment URLs
  tags TEXT[] DEFAULT '{}', -- Tags for categorization
  related_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  related_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);

-- Create support_ticket_replies table for ticket conversations
CREATE TABLE IF NOT EXISTS public.support_ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  
  -- Reply Information
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for ticket replies
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_ticket_id ON public.support_ticket_replies(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_user_id ON public.support_ticket_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_created_at ON public.support_ticket_replies(created_at DESC);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can create their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can update their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON public.support_tickets;

DROP POLICY IF EXISTS "Users can view replies to their tickets" ON public.support_ticket_replies;
DROP POLICY IF EXISTS "Users can create replies to their tickets" ON public.support_ticket_replies;
DROP POLICY IF EXISTS "Admins can view all replies" ON public.support_ticket_replies;
DROP POLICY IF EXISTS "Admins can create replies to all tickets" ON public.support_ticket_replies;

-- RLS Policies for support_tickets
-- Users can view their own tickets
CREATE POLICY "Users can view their own tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own tickets
CREATE POLICY "Users can create their own tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tickets (only if status is 'open')
CREATE POLICY "Users can update their own tickets" ON public.support_tickets
  FOR UPDATE USING (auth.uid() = user_id AND status = 'open');

-- Admins can view all tickets (check if user has admin role - you'll need to implement this)
-- For now, we'll allow authenticated users to view all tickets if they have admin metadata
-- You can refine this based on your admin system
CREATE POLICY "Admins can view all tickets" ON public.support_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (raw_user_meta_data->>'is_admin')::boolean = true
    )
  );

-- Admins can update all tickets
CREATE POLICY "Admins can update all tickets" ON public.support_tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (raw_user_meta_data->>'is_admin')::boolean = true
    )
  );

-- RLS Policies for support_ticket_replies
-- Users can view replies to their tickets
CREATE POLICY "Users can view replies to their tickets" ON public.support_ticket_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = ticket_id 
      AND user_id = auth.uid()
    )
  );

-- Users can create replies to their tickets
CREATE POLICY "Users can create replies to their tickets" ON public.support_ticket_replies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = ticket_id 
      AND user_id = auth.uid()
    )
    AND auth.uid() = user_id
  );

-- Admins can view all replies
CREATE POLICY "Admins can view all replies" ON public.support_ticket_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (raw_user_meta_data->>'is_admin')::boolean = true
    )
  );

-- Admins can create replies to all tickets
CREATE POLICY "Admins can create replies to all tickets" ON public.support_ticket_replies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (raw_user_meta_data->>'is_admin')::boolean = true
    )
    AND is_admin = true
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

