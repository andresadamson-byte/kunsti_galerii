import { supabase } from "@/integrations/supabase/client";

export type Lesson = {
  id: string;
  day_of_week: number; // 1=E ... 6=L
  start_time: string;
  end_time: string;
  title: string;
  teacher: string;
  room: string;
  sort_order: number;
};

export const DAY_NAMES = ["", "Esmaspäev", "Teisipäev", "Kolmapäev", "Neljapäev", "Reede", "Laupäev"];

export async function fetchLessons(): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from("schedule_lessons")
    .select("*")
    .order("day_of_week")
    .order("start_time");
  if (error) throw error;
  return data as Lesson[];
}
