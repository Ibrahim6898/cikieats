-- Create global_settings table
CREATE TABLE IF NOT EXISTS global_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone authenticated can view settings (needed by vendors/riders)
CREATE POLICY "Anyone can view global settings" 
  ON global_settings FOR SELECT 
  TO authenticated 
  USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can manage global settings" 
  ON global_settings FOR ALL 
  TO authenticated 
  USING (is_admin());

-- Initial seed
INSERT INTO global_settings (key, value, description)
VALUES ('support_email', 'support@cikieats.com', 'Primary support contact email for vendors and riders')
ON CONFLICT (key) DO NOTHING;
