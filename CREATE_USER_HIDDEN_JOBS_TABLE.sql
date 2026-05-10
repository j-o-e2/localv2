-- Create table for workers to hide jobs from their dashboard
CREATE TABLE IF NOT EXISTS user_hidden_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- Add RLS policies
ALTER TABLE user_hidden_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own hidden jobs
CREATE POLICY "Users can view their own hidden jobs" ON user_hidden_jobs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own hidden jobs
CREATE POLICY "Users can hide jobs" ON user_hidden_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own hidden jobs (unhide)
CREATE POLICY "Users can unhide jobs" ON user_hidden_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_hidden_jobs_user_id ON user_hidden_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hidden_jobs_job_id ON user_hidden_jobs(job_id);