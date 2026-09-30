-- 1-based position this region was pinged in during its run, NULL for rows inserted before this migration
ALTER TABLE latencyData ADD COLUMN ping_order INTEGER;
