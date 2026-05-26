
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('course','circle')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.artworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  author_name text NOT NULL DEFAULT '',
  age int,
  technique text NOT NULL DEFAULT '',
  year int,
  teacher text NOT NULL DEFAULT '',
  image_path text NOT NULL,
  featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_settings (
  id int PRIMARY KEY DEFAULT 1,
  password_hash text NOT NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.admin_settings (id, password_hash)
VALUES (1, encode(digest('6pint5lit', 'sha256'), 'hex'));

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "artworks_public_read" ON public.artworks FOR SELECT USING (true);
-- admin_settings: no public access (server-side only via service role)

-- Seed categories
INSERT INTO public.categories (name, type, sort_order) VALUES
  ('Kursus 1', 'course', 1),
  ('Kursus 2', 'course', 2),
  ('Kursus 3', 'course', 3),
  ('Kursus 4', 'course', 4),
  ('Kursus 5', 'course', 5),
  ('Fotograafia', 'circle', 1),
  ('3D modelleerimine', 'circle', 2),
  ('Keraamika', 'circle', 3),
  ('Animatsioon', 'circle', 4),
  ('Julia lastering', 'circle', 5);

-- Storage bucket for artwork images
INSERT INTO storage.buckets (id, name, public) VALUES ('artworks', 'artworks', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "artworks_storage_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'artworks');
