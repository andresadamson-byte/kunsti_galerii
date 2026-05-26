import { supabase } from "@/integrations/supabase/client";

export type Category = {
  id: string;
  name: string;
  type: "course" | "circle";
  sort_order: number;
  cta_url: string | null;
};

export type Artwork = {
  id: string;
  category_id: string;
  title: string;
  author_name: string;
  age: number | null;
  technique: string;
  year: number | null;
  teacher: string;
  image_path: string;
  featured: boolean;
  sort_order: number;
};

export function imageUrl(path: string) {
  return supabase.storage.from("artworks").getPublicUrl(path).data.publicUrl;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("type")
    .order("sort_order");
  if (error) throw error;
  return data as Category[];
}

export async function fetchArtworks(): Promise<Artwork[]> {
  const { data, error } = await supabase
    .from("artworks")
    .select("*")
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data as Artwork[];
}
