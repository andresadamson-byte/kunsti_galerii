import { supabase } from "@/integrations/supabase/client";

export type PageSection = "ringid" | "pohikursus" | "opetajad";

export type PageRow = {
  id: string;
  slug: string;
  title: string;
  content: string;
  section: PageSection;
  sort_order: number;
};

export async function fetchPages(): Promise<PageRow[]> {
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .order("section")
    .order("sort_order");
  if (error) throw error;
  return data as PageRow[];
}
