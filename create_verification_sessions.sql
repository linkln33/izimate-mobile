-- Create verification sessions table for Didit integration
CREATE TABLE IF NOT EXISTS verification_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE, -- Didit session ID
  type TEXT NOT NULL CHECK (type IN ('identity', 'business')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rejected')),
  verification_url TEXT,
  
  -- Didit verification results
  result_data JSONB,
  document_type TEXT,
  document_country TEXT,
  confidence DECIMAL(3,2),
  liveness_check BOOLEAN,
  face_match BOOLEAN,
  aml_status TEXT,
  
  -- Business specific fields
  business_name TEXT,
  registration_number TEXT,
  business_country TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_verification_sessions_user_id ON verification_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_session_id ON verification_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_type ON verification_sessions(type);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_status ON verification_sessions(status);

-- Enable RLS
ALTER TABLE verification_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read their own verification sessions" ON verification_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own verification sessions" ON verification_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update verification sessions" ON verification_sessions
  FOR UPDATE USING (true); -- Allow webhook updates

-- Grant permissions
GRANT ALL ON verification_sessions TO authenticated;

-- Function to update user verification status after Didit callback
CREATE OR REPLACE FUNCTION update_user_verification_status(
  p_user_id UUID,
  p_session_id TEXT,
  p_status TEXT,
  p_result_data JSONB
)
RETURNS VOID AS $$
DECLARE
  session_type TEXT;
BEGIN
  -- Get session type
  SELECT type INTO session_type 
  FROM verification_sessions 
  WHERE session_id = p_session_id AND user_id = p_user_id;
  
  -- Update verification session
  UPDATE verification_sessions SET
    status = p_status,
    result_data = p_result_data,
    completed_at = CASE WHEN p_status IN ('completed', 'failed', 'rejected') THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE session_id = p_session_id AND user_id = p_user_id;
  
  -- Update user verification status based on session type
  IF session_type = 'identity' AND p_status = 'completed' THEN
    UPDATE public.users SET
      identity_verified = true,
      identity_verification_status = 'verified',
      identity_verified_at = NOW()
    WHERE id = p_user_id;
  ELSIF session_type = 'identity' AND p_status IN ('failed', 'rejected') THEN
    UPDATE public.users SET
      identity_verification_status = p_status
    WHERE id = p_user_id;
  ELSIF session_type = 'business' AND p_status = 'completed' THEN
    UPDATE provider_profiles SET
      business_verified = true,
      business_verified_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;