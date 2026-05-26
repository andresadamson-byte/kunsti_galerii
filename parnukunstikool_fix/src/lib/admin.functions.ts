import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHash } from "crypto";

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

async function verify(password: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_settings")
    .select("password_hash")
    .eq("id", 1)
    .single();
  if (error || !data) throw new Error("Vigane parool");
  if (data.password_hash !== sha256(password)) throw new Error("Vigane parool");
}

export const verifyPassword = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    await verify(data.password);
    return { ok: true };
  });

export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((d: { oldPassword: string; newPassword: string }) =>
    z.object({
      oldPassword: z.string().min(1).max(200),
      newPassword: z.string().min(4).max(200),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await verify(data.oldPassword);
    const { error } = await supabaseAdmin
      .from("admin_settings")
      .update({ password_hash: sha256(data.newPassword) })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const artworkSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  title: z.string().max(200).default(""),
  author_name: z.string().max(200).default(""),
  age: z.number().int().min(0).max(120).nullable().optional(),
  technique: z.string().max(200).default(""),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  teacher: z.string().max(200).default(""),
  image_path: z.string().min(1).max(500),
  featured: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

export const saveArtwork = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; artwork: unknown }) =>
    z.object({ password: z.string(), artwork: artworkSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    await verify(data.password);
    const { id, ...rest } = data.artwork;
    if (id) {
      const { error } = await supabaseAdmin.from("artworks").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    } else {
      const { data: row, error } = await supabaseAdmin
        .from("artworks")
        .insert(rest)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    }
  });

export const deleteArtwork = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) =>
    z.object({ password: z.string(), id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    await verify(data.password);
    const { data: row } = await supabaseAdmin
      .from("artworks")
      .select("image_path")
      .eq("id", data.id)
      .single();
    if (row?.image_path) {
      await supabaseAdmin.storage.from("artworks").remove([row.image_path]);
    }
    const { error } = await supabaseAdmin.from("artworks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderArtworks = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; orders: { id: string; sort_order: number }[] }) =>
    z.object({
      password: z.string(),
      orders: z.array(z.object({ id: z.string().uuid(), sort_order: z.number().int() })).max(1000),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await verify(data.password);
    for (const o of data.orders) {
      await supabaseAdmin.from("artworks").update({ sort_order: o.sort_order }).eq("id", o.id);
    }
    return { ok: true };
  });

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  type: z.enum(["course", "circle"]),
  sort_order: z.number().int().default(0),
  cta_url: z.string().url().max(500).nullable().optional(),
});

export const saveCategory = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; category: unknown }) =>
    z.object({ password: z.string(), category: categorySchema }).parse(d),
  )
  .handler(async ({ data }) => {
    await verify(data.password);
    const { id, ...rest } = data.category;
    if (id) {
      const { error } = await supabaseAdmin.from("categories").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    } else {
      const { data: row, error } = await supabaseAdmin
        .from("categories")
        .insert(rest)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    }
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) =>
    z.object({ password: z.string(), id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    await verify(data.password);
    // remove all artwork images for that category
    const { data: rows } = await supabaseAdmin
      .from("artworks")
      .select("image_path")
      .eq("category_id", data.id);
    if (rows && rows.length > 0) {
      await supabaseAdmin.storage.from("artworks").remove(rows.map((r) => r.image_path));
    }
    const { error } = await supabaseAdmin.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const uploadImage = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; filename: string; dataBase64: string; contentType: string }) =>
    z.object({
      password: z.string(),
      filename: z.string().min(1).max(200),
      dataBase64: z.string().min(1),
      contentType: z.string().min(1).max(100),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await verify(data.password);
    const buffer = Buffer.from(data.dataBase64, "base64");
    const ext = data.filename.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("artworks")
      .upload(path, buffer, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);
    return { path };
  });

const pageSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug: ainult väiketähed, numbrid, sidekriipsud"),
  title: z.string().min(1).max(200),
  content: z.string().max(20000).default(""),
  section: z.enum(["ringid", "pohikursus", "opetajad"]),
  sort_order: z.number().int().default(0),
});

export const savePage = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; page: unknown }) =>
    z.object({ password: z.string(), page: pageSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    await verify(data.password);
    const { id, ...rest } = data.page;
    if (id) {
      const { error } = await supabaseAdmin.from("pages").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    } else {
      const { data: row, error } = await supabaseAdmin
        .from("pages")
        .insert(rest)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    }
  });

export const deletePage = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) =>
    z.object({ password: z.string(), id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    await verify(data.password);
    const { error } = await supabaseAdmin.from("pages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const lessonSchema = z.object({
  id: z.string().uuid().optional(),
  day_of_week: z.number().int().min(1).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Aeg HH:MM kujul"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Aeg HH:MM kujul"),
  title: z.string().min(1).max(200),
  teacher: z.string().max(200).default(""),
  room: z.string().max(200).default(""),
  sort_order: z.number().int().default(0),
});

export const saveLesson = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; lesson: unknown }) =>
    z.object({ password: z.string(), lesson: lessonSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    await verify(data.password);
    const { id, ...rest } = data.lesson;
    if (id) {
      const { error } = await supabaseAdmin.from("schedule_lessons").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    } else {
      const { data: row, error } = await supabaseAdmin
        .from("schedule_lessons")
        .insert(rest)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    }
  });

export const deleteLesson = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) =>
    z.object({ password: z.string(), id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    await verify(data.password);
    const { error } = await supabaseAdmin.from("schedule_lessons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
