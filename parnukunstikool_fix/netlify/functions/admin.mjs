import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  },
  body: JSON.stringify(body),
});

function sha256(s) {
  return createHash("sha256").update(s).digest("hex");
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Puuduvad Netlify keskkonnamuutujad: SUPABASE_URL ja/või SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function verify(supabase, password) {
  if (!password || typeof password !== "string") throw new Error("Vigane parool");
  const { data, error } = await supabase
    .from("admin_settings")
    .select("password_hash")
    .eq("id", 1)
    .single();
  if (error || !data) throw new Error("Vigane parool");
  if (data.password_hash !== sha256(password)) throw new Error("Vigane parool");
}

function normalizeUrl(value) {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u.toString();
  } catch {
    throw new Error("Link peab algama kujul https:// või http://");
  }
}

function artworkInput(a) {
  if (!a || typeof a !== "object") throw new Error("Pildi andmed puuduvad");
  return {
    category_id: String(a.category_id || ""),
    title: String(a.title || "").slice(0, 200),
    author_name: String(a.author_name || "").slice(0, 200),
    age: a.age == null || a.age === "" ? null : Number(a.age),
    technique: String(a.technique || "").slice(0, 200),
    year: a.year == null || a.year === "" ? null : Number(a.year),
    teacher: String(a.teacher || "").slice(0, 200),
    image_path: String(a.image_path || ""),
    featured: Boolean(a.featured),
    sort_order: Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : 0,
  };
}

function categoryInput(c) {
  if (!c || typeof c !== "object") throw new Error("Kategooria andmed puuduvad");
  const type = c.type === "course" ? "course" : "circle";
  return {
    name: String(c.name || "").trim().slice(0, 100),
    type,
    sort_order: Number.isFinite(Number(c.sort_order)) ? Number(c.sort_order) : 0,
    cta_url: normalizeUrl(c.cta_url),
  };
}

function pageInput(p) {
  if (!p || typeof p !== "object") throw new Error("Lehe andmed puuduvad");
  const slug = String(p.slug || "").trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Slug: ainult väiketähed, numbrid ja sidekriipsud");
  const section = ["ringid", "pohikursus", "opetajad"].includes(p.section) ? p.section : "ringid";
  return {
    slug,
    title: String(p.title || "").trim().slice(0, 200),
    content: String(p.content || "").slice(0, 20000),
    section,
    sort_order: Number.isFinite(Number(p.sort_order)) ? Number(p.sort_order) : 0,
  };
}

function lessonInput(l) {
  if (!l || typeof l !== "object") throw new Error("Tunni andmed puuduvad");
  const start_time = String(l.start_time || "");
  const end_time = String(l.end_time || "");
  if (!/^\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}$/.test(end_time)) {
    throw new Error("Aeg peab olema kujul HH:MM");
  }
  const day = Number(l.day_of_week);
  if (!Number.isInteger(day) || day < 1 || day > 6) throw new Error("Nädalapäev on vigane");
  return {
    day_of_week: day,
    start_time,
    end_time,
    title: String(l.title || "").trim().slice(0, 200),
    teacher: String(l.teacher || "").slice(0, 200),
    room: String(l.room || "").slice(0, 200),
    sort_order: Number.isFinite(Number(l.sort_order)) ? Number(l.sort_order) : 0,
  };
}

async function upsertRow(supabase, table, id, row) {
  if (id) {
    const { error } = await supabase.from(table).update(row).eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
  }
  const { data, error } = await supabase.from(table).insert(row).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Meetod ei ole lubatud" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Vigane JSON" });
  }

  try {
    const supabase = getSupabaseAdmin();
    const action = body.action;

    if (action === "verifyPassword") {
      await verify(supabase, body.password);
      return json(200, { ok: true });
    }

    if (action === "changePassword") {
      await verify(supabase, body.oldPassword);
      const newPassword = String(body.newPassword || "");
      if (newPassword.length < 4) throw new Error("Parool peab olema vähemalt 4 märki");
      const { error } = await supabase
        .from("admin_settings")
        .update({ password_hash: sha256(newPassword) })
        .eq("id", 1);
      if (error) throw new Error(error.message);
      return json(200, { ok: true });
    }

    await verify(supabase, body.password);

    switch (action) {
      case "saveArtwork": {
        const a = body.artwork || {};
        return json(200, await upsertRow(supabase, "artworks", a.id, artworkInput(a)));
      }
      case "deleteArtwork": {
        const { data: row } = await supabase.from("artworks").select("image_path").eq("id", body.id).single();
        if (row?.image_path) await supabase.storage.from("artworks").remove([row.image_path]);
        const { error } = await supabase.from("artworks").delete().eq("id", body.id);
        if (error) throw new Error(error.message);
        return json(200, { ok: true });
      }
      case "reorderArtworks": {
        const orders = Array.isArray(body.orders) ? body.orders : [];
        for (const o of orders.slice(0, 1000)) {
          await supabase.from("artworks").update({ sort_order: Number(o.sort_order) || 0 }).eq("id", o.id);
        }
        return json(200, { ok: true });
      }
      case "saveCategory": {
        const c = body.category || {};
        return json(200, await upsertRow(supabase, "categories", c.id, categoryInput(c)));
      }
      case "deleteCategory": {
        const { data: rows } = await supabase.from("artworks").select("image_path").eq("category_id", body.id);
        if (rows?.length) await supabase.storage.from("artworks").remove(rows.map((r) => r.image_path).filter(Boolean));
        const { error } = await supabase.from("categories").delete().eq("id", body.id);
        if (error) throw new Error(error.message);
        return json(200, { ok: true });
      }
      case "uploadImage": {
        if (!body.dataBase64) throw new Error("Pildiandmed puuduvad");
        const safeName = String(body.filename || "image.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
        const ext = safeName.split(".").pop() || "jpg";
        const path = `${randomUUID()}.${ext}`;
        const buffer = Buffer.from(body.dataBase64, "base64");
        const { error } = await supabase.storage
          .from("artworks")
          .upload(path, buffer, { contentType: body.contentType || "image/jpeg", upsert: false });
        if (error) throw new Error(error.message);
        return json(200, { path });
      }
      case "savePage": {
        const p = body.page || {};
        return json(200, await upsertRow(supabase, "pages", p.id, pageInput(p)));
      }
      case "deletePage": {
        const { error } = await supabase.from("pages").delete().eq("id", body.id);
        if (error) throw new Error(error.message);
        return json(200, { ok: true });
      }
      case "saveLesson": {
        const l = body.lesson || {};
        return json(200, await upsertRow(supabase, "schedule_lessons", l.id, lessonInput(l)));
      }
      case "deleteLesson": {
        const { error } = await supabase.from("schedule_lessons").delete().eq("id", body.id);
        if (error) throw new Error(error.message);
        return json(200, { ok: true });
      }
      default:
        return json(400, { error: "Tundmatu toiming" });
    }
  } catch (err) {
    return json(400, { error: err instanceof Error ? err.message : "Viga" });
  }
}
