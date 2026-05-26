CREATE TABLE public.schedule_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  teacher TEXT NOT NULL DEFAULT '',
  room TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_public_read" ON public.schedule_lessons FOR SELECT USING (true);