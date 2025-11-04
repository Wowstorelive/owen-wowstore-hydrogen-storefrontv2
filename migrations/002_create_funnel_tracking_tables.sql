-- Create funnel tracking tables for AI-powered conversion optimization

-- 1. Funnel Visits (track every stage of customer journey)
CREATE TABLE IF NOT EXISTS funnel_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id VARCHAR(100) NOT NULL,
  visitor_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255),
  stage VARCHAR(100) NOT NULL,
  source VARCHAR(100),
  utm_campaign VARCHAR(255),
  utm_medium VARCHAR(100),
  utm_source VARCHAR(100),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  country VARCHAR(10),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Funnel Conversions (track successful conversions)
CREATE TABLE IF NOT EXISTS funnel_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id VARCHAR(100) NOT NULL,
  visitor_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255),
  stage VARCHAR(100) NOT NULL,
  previous_stage VARCHAR(100),
  conversion_value DECIMAL(10, 2),
  order_id VARCHAR(255),
  product_id VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  converted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Content Performance (track AI-generated content effectiveness)
CREATE TABLE IF NOT EXISTS content_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  page_url TEXT NOT NULL,
  views INT DEFAULT 0,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  bounce_rate DECIMAL(5, 2),
  avg_time_on_page INT,
  ai_generated BOOLEAN DEFAULT false,
  ai_score DECIMAL(3, 2),
  variant VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. AI Generation Jobs (track AI content generation status)
CREATE TABLE IF NOT EXISTS ai_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(100) NOT NULL,
  content_type VARCHAR(100),
  target_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  prompt TEXT,
  result TEXT,
  model VARCHAR(100),
  tokens_used INT,
  cost DECIMAL(10, 4),
  error_message TEXT,
  n8n_execution_id VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  requested_by VARCHAR(255),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_funnel_visits_funnel_id ON funnel_visits(funnel_id);
CREATE INDEX idx_funnel_visits_visitor_id ON funnel_visits(visitor_id);
CREATE INDEX idx_funnel_visits_created_at ON funnel_visits(created_at DESC);
CREATE INDEX idx_funnel_visits_stage ON funnel_visits(stage);

CREATE INDEX idx_funnel_conversions_funnel_id ON funnel_conversions(funnel_id);
CREATE INDEX idx_funnel_conversions_visitor_id ON funnel_conversions(visitor_id);
CREATE INDEX idx_funnel_conversions_converted_at ON funnel_conversions(converted_at DESC);
CREATE INDEX idx_funnel_conversions_order_id ON funnel_conversions(order_id);

CREATE INDEX idx_content_performance_content_id ON content_performance(content_id);
CREATE INDEX idx_content_performance_content_type ON content_performance(content_type);
CREATE INDEX idx_content_performance_ai_generated ON content_performance(ai_generated);
CREATE INDEX idx_content_performance_created_at ON content_performance(created_at DESC);

CREATE INDEX idx_ai_jobs_status ON ai_generation_jobs(status);
CREATE INDEX idx_ai_jobs_job_type ON ai_generation_jobs(job_type);
CREATE INDEX idx_ai_jobs_created_at ON ai_generation_jobs(created_at DESC);
CREATE INDEX idx_ai_jobs_n8n_execution_id ON ai_generation_jobs(n8n_execution_id);

-- Create updated_at trigger for content_performance
CREATE TRIGGER update_content_performance_updated_at BEFORE UPDATE
  ON content_performance FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE funnel_visits IS 'Tracks every customer touchpoint in the conversion funnel';
COMMENT ON TABLE funnel_conversions IS 'Records successful conversions at each funnel stage';
COMMENT ON TABLE content_performance IS 'Measures effectiveness of content, especially AI-generated';
COMMENT ON TABLE ai_generation_jobs IS 'Tracks AI content generation jobs triggered via n8n';

COMMENT ON COLUMN funnel_visits.funnel_id IS 'Identifier for funnel type (product, category, landing page)';
COMMENT ON COLUMN funnel_visits.stage IS 'Funnel stage: view, add_to_cart, checkout, purchase';
COMMENT ON COLUMN content_performance.ai_score IS 'AI quality score from 0.00 to 1.00';
COMMENT ON COLUMN ai_generation_jobs.n8n_execution_id IS 'Links to n8n workflow execution for debugging';
