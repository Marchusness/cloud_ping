-- Rows inserted before this migration have NULL for both columns
-- ping_order: 1-based position this region was pinged in during the run
-- regions_in_run: number of regions attempted in the run (runs of every region ping 4 at a time,
-- so ping_order is only strictly sequential when regions_in_run is the sampled count)
ALTER TABLE latencyData ADD COLUMN ping_order INTEGER;
ALTER TABLE latencyData ADD COLUMN regions_in_run INTEGER;
