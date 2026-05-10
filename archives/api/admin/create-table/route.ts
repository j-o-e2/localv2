import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const svc = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // Create the user_hidden_jobs table
    const { error } = await svc.rpc('exec_sql', {
      sql: `
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
        DROP POLICY IF EXISTS "Users can view their own hidden jobs" ON user_hidden_jobs;
        CREATE POLICY "Users can view their own hidden jobs" ON user_hidden_jobs
          FOR SELECT USING (auth.uid() = user_id);

        -- Users can insert their own hidden jobs
        DROP POLICY IF EXISTS "Users can hide jobs" ON user_hidden_jobs;
        CREATE POLICY "Users can hide jobs" ON user_hidden_jobs
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        -- Users can delete their own hidden jobs (unhide)
        DROP POLICY IF EXISTS "Users can unhide jobs" ON user_hidden_jobs;
        CREATE POLICY "Users can unhide jobs" ON user_hidden_jobs
          FOR DELETE USING (auth.uid() = user_id);

        -- Add indexes for performance
        CREATE INDEX IF NOT EXISTS idx_user_hidden_jobs_user_id ON user_hidden_jobs(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_hidden_jobs_job_id ON user_hidden_jobs(job_id);
      `
    })

    if (error) {
      console.error('Error creating table:', error)
      return NextResponse.json({ error: 'Failed to create table', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Table created successfully' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}