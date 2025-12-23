-- Create affiliates and referrals tables with proper RLS policies
-- Run this SQL in your Supabase SQL Editor

-- Create affiliates table
CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard', 'premium', 'elite')),
  total_referrals INTEGER NOT NULL DEFAULT 0,
  active_referrals INTEGER NOT NULL DEFAULT 0,
  total_earnings DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  pending_earnings DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  paid_earnings DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  payout_method TEXT CHECK (payout_method IN ('bank_transfer', 'revolut', 'paypal')),
  payout_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique index on user_id to ensure one affiliate per user
CREATE UNIQUE INDEX IF NOT EXISTS affiliates_user_id_unique ON public.affiliates(user_id);

-- Create index on referral_code for fast lookups
CREATE INDEX IF NOT EXISTS affiliates_referral_code_idx ON public.affiliates(referral_code);

-- Enable RLS
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own affiliate record" ON public.affiliates;
DROP POLICY IF EXISTS "Users can create own affiliate record" ON public.affiliates;
DROP POLICY IF EXISTS "Users can update own affiliate record" ON public.affiliates;

-- RLS Policy: Users can view their own affiliate record
CREATE POLICY "Users can view own affiliate record" ON public.affiliates
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can create their own affiliate record
CREATE POLICY "Users can create own affiliate record" ON public.affiliates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own affiliate record
CREATE POLICY "Users can update own affiliate record" ON public.affiliates
  FOR UPDATE USING (auth.uid() = user_id);

-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  referred_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'converted', 'cancelled', 'expired')),
  plan_type TEXT CHECK (plan_type IN ('pro', 'business')),
  conversion_date TIMESTAMPTZ,
  subscription_id TEXT,
  subscription_status TEXT,
  one_time_commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  one_time_commission_paid BOOLEAN NOT NULL DEFAULT false,
  recurring_commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.10,
  recurring_commission_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  recurring_commission_months INTEGER NOT NULL DEFAULT 0,
  total_earned DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS referrals_affiliate_id_idx ON public.referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS referrals_referred_user_id_idx ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON public.referrals(status);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "System can create referrals" ON public.referrals;
DROP POLICY IF EXISTS "System can update referrals" ON public.referrals;

-- RLS Policy: Users can view referrals for their affiliate record
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (
    affiliate_id IN (
      SELECT id FROM public.affiliates WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: System can create referrals (for webhook/API usage)
CREATE POLICY "System can create referrals" ON public.referrals
  FOR INSERT WITH CHECK (true);

-- RLS Policy: System can update referrals (for webhook/API usage)
CREATE POLICY "System can update referrals" ON public.referrals
  FOR UPDATE USING (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_affiliates_updated_at ON public.affiliates;
CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_referrals_updated_at ON public.referrals;
CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.affiliates TO authenticated;
GRANT ALL ON public.referrals TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Note: This script assumes your users table is in the public schema (public.users)
-- This matches the app's usage patterns and types definitions