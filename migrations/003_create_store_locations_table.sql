-- Create store locations table with PostGIS support for geo queries

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Store Locations table
CREATE TABLE IF NOT EXISTS store_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  country VARCHAR(10) NOT NULL,
  postal_code VARCHAR(20),
  phone VARCHAR(50),
  email VARCHAR(255),
  website TEXT,
  -- Geospatial data
  location GEOGRAPHY(POINT, 4326),
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  -- Business hours (stored as JSONB for flexibility)
  hours JSONB DEFAULT '{}'::jsonb,
  -- Store metadata
  status VARCHAR(50) DEFAULT 'active',
  store_type VARCHAR(50),
  features TEXT[],
  images TEXT[],
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index for fast geo queries
CREATE INDEX idx_store_locations_location ON store_locations USING GIST (location);

-- Create indexes for common queries
CREATE INDEX idx_store_locations_city ON store_locations(city);
CREATE INDEX idx_store_locations_country ON store_locations(country);
CREATE INDEX idx_store_locations_status ON store_locations(status);
CREATE INDEX idx_store_locations_store_type ON store_locations(store_type);
CREATE INDEX idx_store_locations_slug ON store_locations(slug);

-- Create updated_at trigger
CREATE TRIGGER update_store_locations_updated_at BEFORE UPDATE
  ON store_locations FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically populate location from lat/lng
CREATE OR REPLACE FUNCTION update_store_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_store_location_trigger
  BEFORE INSERT OR UPDATE OF lat, lng ON store_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_store_location();

-- Add comments
COMMENT ON TABLE store_locations IS 'Physical store locations with PostGIS geospatial support';
COMMENT ON COLUMN store_locations.location IS 'PostGIS geography point for radius searches';
COMMENT ON COLUMN store_locations.hours IS 'Business hours in JSON format: {"monday": {"open": "09:00", "close": "18:00"}, ...}';
COMMENT ON COLUMN store_locations.features IS 'Array of features: ["parking", "wifi", "accessibility", ...]';
COMMENT ON COLUMN store_locations.metadata IS 'Additional store data (capacity, specialties, etc.)';

-- Example query helpers (documented in comments)
-- Find stores within 50km of a point:
-- SELECT * FROM store_locations
-- WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, 50000)
-- ORDER BY ST_Distance(location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography);

-- Find nearest store to coordinates:
-- SELECT *, ST_Distance(location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) as distance
-- FROM store_locations
-- WHERE status = 'active'
-- ORDER BY location <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
-- LIMIT 1;
