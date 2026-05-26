CREATE TABLE public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  section text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pages_public_read" ON public.pages FOR SELECT USING (true);

INSERT INTO public.pages (slug, title, content, section, sort_order) VALUES
  ('ringid', 'Ringid', 'Meie kunstikooli ringid pakuvad õpilastele võimalust süveneda erinevatesse loomingulistesse valdkondadesse. Vali huvipakkuv ring rippmenüüst.', 'ringid', 0),
  ('pohikursus', 'Põhikursus', 'Põhikursus on meie kunstikooli alusprogramm, mis annab õpilastele tervikliku ettevalmistuse joonistuses, maalis, kompositsioonis ja kunstiajaloos.', 'pohikursus', 0);