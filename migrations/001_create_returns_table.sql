-- Create returns table for storing return requests
CREATE TABLE IF NOT EXISTS returns (
  return_id VARCHAR(255) PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL,
  order_name VARCHAR(100) NOT NULL,
  shopify_return_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  return_line_items JSONB NOT NULL,
  image_urls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_returns_order_id ON returns(order_id);
CREATE INDEX idx_returns_order_name ON returns(order_name);
CREATE INDEX idx_returns_created_at ON returns(created_at DESC);
CREATE INDEX idx_returns_status ON returns(status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_returns_updated_at BEFORE UPDATE
    ON returns FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE returns IS 'Stores customer return requests with image references';
COMMENT ON COLUMN returns.return_id IS 'Unique identifier for the return';
COMMENT ON COLUMN returns.order_id IS 'Shopify order ID (gid format)';
COMMENT ON COLUMN returns.order_name IS 'Human-readable order name (e.g., #1001)';
COMMENT ON COLUMN returns.shopify_return_id IS 'Shopify return request ID';
COMMENT ON COLUMN returns.status IS 'Return status (REQUESTED, APPROVED, DECLINED, etc.)';
COMMENT ON COLUMN returns.return_line_items IS 'Array of return line items with reasons';
COMMENT ON COLUMN returns.image_urls IS 'Array of GCS image URLs for the return';
