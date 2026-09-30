-- Rows inserted before this migration have NULL for both columns
ALTER TABLE latencyData ADD COLUMN ping_order INTEGER;
ALTER TABLE latencyData ADD COLUMN regions_in_run INTEGER;
