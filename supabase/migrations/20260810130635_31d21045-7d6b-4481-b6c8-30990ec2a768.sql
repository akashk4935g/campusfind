ALTER TABLE public.lost_items ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.found_items ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.resource_listings ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

UPDATE public.lost_items SET is_sample = true;
UPDATE public.found_items SET is_sample = true;
UPDATE public.resource_listings SET is_sample = true;

CREATE INDEX IF NOT EXISTS lost_items_is_sample_idx ON public.lost_items (is_sample);
CREATE INDEX IF NOT EXISTS found_items_is_sample_idx ON public.found_items (is_sample);
CREATE INDEX IF NOT EXISTS resource_listings_is_sample_idx ON public.resource_listings (is_sample);