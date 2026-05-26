import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Trash2,
  Star,
  GripVertical,
  Plus,
  LogOut,
  Download,
  KeyRound,
  ArrowLeft,
  Save,
  Loader2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  verifyPassword, changePassword, saveArtwork, deleteArtwork,
  reorderArtworks, saveCategory, deleteCategory, uploadImage,
  savePage, deletePage, saveLesson, deleteLesson,
} from "@/lib/admin.functions";
import { fetchCategories, fetchArtworks, imageUrl, type Artwork, type Category } from "@/lib/gallery";
import { fetchPages, type PageRow } from "@/lib/pages";
import { fetchLessons, DAY_NAMES, type Lesson } from "@/lib/schedule";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/edit")({
  component: EditPage,
});

const PW_KEY = "kk_admin_pw";

function EditPage() {
  const [pw, setPw] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const verifyFn = useServerFn(verifyPassword);

  useEffect(() => {
    const saved = sessionStorage.getItem(PW_KEY);
    if (saved) {
      verifyFn({ data: { password: saved } })
        .then(() => setPw(saved))
        .catch(() => sessionStorage.removeItem(PW_KEY));
    }
  }, [verifyFn]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyFn({ data: { password: input } });
      sessionStorage.setItem(PW_KEY, input);
      setPw(input);
    } catch {
      toast.error("Vigane parool");
    } finally {
      setLoading(false);
    }
  };

  if (!pw) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Toaster richColors />
        <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-md border bg-card p-6 shadow-sm">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Tagasi
          </Link>
          <h1 className="font-serif text-2xl">Edit moodul</h1>
          <p className="text-sm text-muted-foreground">Sisesta parool, et pilte hallata.</p>
          <Input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Parool"
            autoFocus
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sisene"}
          </Button>
        </form>
      </div>
    );
  }

  return <Dashboard password={pw} onLogout={() => { sessionStorage.removeItem(PW_KEY); setPw(null); }} />;
}

function Dashboard({ password, onLogout }: { password: string; onLogout: () => void }) {
  const qc = useQueryClient();
  const cats = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const arts = useQuery({ queryKey: ["artworks"], queryFn: fetchArtworks });
  const [tab, setTab] = useState<"course" | "circle">("course");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [editArt, setEditArt] = useState<Partial<Artwork> | null>(null);
  const [editCat, setEditCat] = useState<Partial<Category> | null>(null);
  const [pwOpen, setPwOpen] = useState(false);

  const filteredCats = (cats.data || []).filter((c) => c.type === tab);
  useEffect(() => {
    if (!activeCat && filteredCats[0]) setActiveCat(filteredCats[0].id);
  }, [filteredCats, activeCat]);

  const activeItems = useMemo(
    () => (arts.data || []).filter((a) => a.category_id === activeCat).sort((a, b) => a.sort_order - b.sort_order),
    [arts.data, activeCat],
  );

  const saveArt = useServerFn(saveArtwork);
  const delArt = useServerFn(deleteArtwork);
  const reorderFn = useServerFn(reorderArtworks);
  const saveCatFn = useServerFn(saveCategory);
  const delCatFn = useServerFn(deleteCategory);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["artworks"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const toggleFeatured = async (a: Artwork) => {
    await saveArt({ data: { password, artwork: { ...a, featured: !a.featured } } });
    refresh();
  };

  const onDelete = async (a: Artwork) => {
    if (!confirm(`Kustutada "${a.title || a.author_name || "see töö"}"?`)) return;
    await delArt({ data: { password, id: a.id } });
    refresh();
  };

  const onDeleteCat = async (c: Category) => {
    if (!confirm(`Kustutada kategooria "${c.name}" koos kõigi piltidega?`)) return;
    await delCatFn({ data: { password, id: c.id } });
    if (activeCat === c.id) setActiveCat(null);
    refresh();
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = activeItems.findIndex((i) => i.id === active.id);
    const newIdx = activeItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(activeItems, oldIdx, newIdx);
    qc.setQueryData<Artwork[]>(["artworks"], (prev) => {
      if (!prev) return prev;
      const others = prev.filter((p) => p.category_id !== activeCat);
      return [...others, ...reordered.map((it, i) => ({ ...it, sort_order: i }))];
    });
    await reorderFn({
      data: {
        password,
        orders: reordered.map((it, i) => ({ id: it.id, sort_order: i })),
      },
    });
    refresh();
  };

  const exportCsv = () => {
    const rows = [
      ["Kategooria", "Tüüp", "Pealkiri", "Autor", "Vanus", "Tehnika", "Aasta", "Juhendaja", "Esiletõstetud"],
      ...(arts.data || []).map((a) => {
        const c = cats.data?.find((x) => x.id === a.category_id);
        return [
          c?.name ?? "",
          c?.type === "course" ? "Kursus" : "Ring",
          a.title, a.author_name,
          a.age?.toString() ?? "",
          a.technique,
          a.year?.toString() ?? "",
          a.teacher,
          a.featured ? "jah" : "ei",
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `galerii-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // templates from existing data
  const teachers = Array.from(new Set((arts.data || []).map((a) => a.teacher).filter(Boolean)));
  const authors = Array.from(new Set((arts.data || []).map((a) => a.author_name).filter(Boolean)));
  const techniques = Array.from(new Set((arts.data || []).map((a) => a.technique).filter(Boolean)));
  const years = Array.from(new Set((arts.data || []).map((a) => a.year).filter((y): y is number => !!y)));

  return (
    <div className="min-h-screen">
      <Toaster richColors />
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Galerii</Link>
            <h1 className="font-serif text-xl">Edit moodul</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>
              <KeyRound className="h-4 w-4" /> Parool
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4" /> Logi välja
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <div className="mb-4 flex gap-2">
          <Button variant={tab === "course" ? "default" : "outline"} onClick={() => { setTab("course"); setActiveCat(null); }}>
            Kursused
          </Button>
          <Button variant={tab === "circle" ? "default" : "outline"} onClick={() => { setTab("circle"); setActiveCat(null); }}>
            Ringid
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {filteredCats.map((c) => (
            <div key={c.id} className="flex items-center gap-1 rounded-md border bg-card p-1">
              <button
                onClick={() => setActiveCat(c.id)}
                className={`rounded px-3 py-1 text-sm ${activeCat === c.id ? "bg-primary text-primary-foreground" : ""}`}
              >
                {c.name}
              </button>
              <button onClick={() => setEditCat(c)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Muuda">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDeleteCat(c)} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Kustuta">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setEditCat({ type: tab, sort_order: filteredCats.length + 1, name: "" })}>
            <Plus className="h-4 w-4" /> Uus kategooria
          </Button>
        </div>

        {activeCat && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{activeItems.length} pilti — lohista, et järjekorda muuta</p>
            <Button onClick={() => setEditArt({ category_id: activeCat, featured: false, sort_order: activeItems.length, title: "", author_name: "", technique: "", teacher: "", image_path: "" })}>
              <Plus className="h-4 w-4" /> Lisa pilt
            </Button>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={activeItems.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {activeItems.map((a) => (
                <SortableCard key={a.id} a={a} onEdit={() => setEditArt(a)} onDelete={() => onDelete(a)} onFeatured={() => toggleFeatured(a)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <PagesSection password={password} />
      <ScheduleSection password={password} />


      {editArt && (
        <ArtworkDialog
          password={password}
          artwork={editArt}
          authors={authors} teachers={teachers} techniques={techniques} years={years}
          onClose={(saved) => { setEditArt(null); if (saved) refresh(); }}
        />
      )}
      {editCat && (
        <CategoryDialog
          password={password}
          category={editCat}
          onClose={(saved) => { setEditCat(null); if (saved) refresh(); }}
        />
      )}
      {pwOpen && <ChangePwDialog onClose={() => setPwOpen(false)} currentPw={password} />}
    </div>
  );
}

function SortableCard({ a, onEdit, onDelete, onFeatured }: { a: Artwork; onEdit: () => void; onDelete: () => void; onFeatured: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: a.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="group relative overflow-hidden rounded-md border bg-card">
      <div className="aspect-square w-full overflow-hidden bg-muted">
        <img src={imageUrl(a.image_path)} alt={a.title} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="absolute left-1 top-1 cursor-grab rounded bg-background/80 p-1" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </div>
      <button onClick={onFeatured} className={`absolute right-1 top-1 rounded p-1.5 ${a.featured ? "bg-secondary text-secondary-foreground" : "bg-background/80"}`} aria-label="Esiletõstetud">
        <Star className={`h-4 w-4 ${a.featured ? "fill-current" : ""}`} />
      </button>
      <div className="p-2 text-xs">
        <div className="truncate font-medium">{a.title || "Pealkirjata"}</div>
        <div className="truncate text-muted-foreground">{a.author_name}</div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-background/90 p-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
        <Button size="sm" variant="outline" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}

function ArtworkDialog({
  password, artwork, onClose, authors, teachers, techniques, years,
}: {
  password: string;
  artwork: Partial<Artwork>;
  onClose: (saved: boolean) => void;
  authors: string[]; teachers: string[]; techniques: string[]; years: number[];
}) {
  const [form, setForm] = useState<Partial<Artwork>>(artwork);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const saveFn = useServerFn(saveArtwork);
  const uploadFn = useServerFn(uploadImage);

  const set = (patch: Partial<Artwork>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let image_path = form.image_path || "";
      if (file) {
        const base64 = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res((r.result as string).split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        const { path } = await uploadFn({
          data: { password, filename: file.name, dataBase64: base64, contentType: file.type || "image/jpeg" },
        });
        image_path = path;
      }
      if (!image_path) {
        toast.error("Vali pilt");
        setSaving(false);
        return;
      }
      await saveFn({
        data: {
          password,
          artwork: {
            id: form.id,
            category_id: form.category_id!,
            title: form.title || "",
            author_name: form.author_name || "",
            age: form.age ?? null,
            technique: form.technique || "",
            year: form.year ?? null,
            teacher: form.teacher || "",
            image_path,
            featured: !!form.featured,
            sort_order: form.sort_order ?? 0,
          },
        },
      });
      toast.success("Salvestatud");
      onClose(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Viga salvestamisel");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{form.id ? "Muuda pilti" : "Lisa pilt"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Pilt</Label>
            <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {form.image_path && !file && (
              <img src={imageUrl(form.image_path)} alt="" className="mt-2 max-h-40 rounded border" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DataListField label="Pealkiri" value={form.title || ""} onChange={(v) => set({ title: v })} options={[]} />
            <DataListField label="Autori nimi" value={form.author_name || ""} onChange={(v) => set({ author_name: v })} options={authors} />
            <div>
              <Label>Vanus</Label>
              <Input type="number" value={form.age ?? ""} onChange={(e) => set({ age: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <DataListField label="Tehnika" value={form.technique || ""} onChange={(v) => set({ technique: v })} options={techniques} />
            <DataListField label="Aasta" value={form.year?.toString() ?? ""} onChange={(v) => set({ year: v ? Number(v) : null })} options={years.map(String)} />
            <DataListField label="Juhendaja" value={form.teacher || ""} onChange={(v) => set({ teacher: v })} options={teachers} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.featured} onChange={(e) => set({ featured: e.target.checked })} />
            Esiletõstetud (avalehe hero karusellis)
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose(false)}>Tühista</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvesta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DataListField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  const id = `dl-${label}`;
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} list={id} />
      <datalist id={id}>
        {options.map((o) => <option key={o} value={o} />)}
      </datalist>
    </div>
  );
}

function CategoryDialog({
  category, password, onClose,
}: {
  category: Partial<Category>;
  password: string;
  onClose: (saved: boolean) => void;
}) {
  const [form, setForm] = useState(category);
  const onSave = useServerFn(saveCategory);
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      await onSave({
        data: {
          password,
          category: {
            id: form.id,
            name: form.name!,
            type: (form.type as "course" | "circle") || "circle",
            sort_order: form.sort_order ?? 0,
            cta_url: form.cta_url?.trim() ? form.cta_url.trim() : null,
          },
        },
      });
      toast.success("Salvestatud");
      onClose(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Viga");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{form.id ? "Muuda kategooriat" : "Uus kategooria"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Nimi</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label>Tüüp</Label>
            <Select value={form.type as string} onValueChange={(v) => setForm({ ...form, type: v as "course" | "circle" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="course">Kursus</SelectItem>
                <SelectItem value="circle">Ring</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Järjekord</Label>
            <Input type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
          </div>
          {form.type === "circle" && (
            <div>
              <Label>CTA nupu link (Registreeru)</Label>
              <Input
                type="url"
                value={form.cta_url || ""}
                onChange={(e) => setForm({ ...form, cta_url: e.target.value })}
                placeholder="https://arno.parnu.ee/..."
              />
              <p className="mt-1 text-xs text-muted-foreground">Kuhu "Registreeru" nupp suunab. Tühi = nuppu ei näidata.</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose(false)}>Tühista</Button>
            <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvesta"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangePwDialog({ currentPw, onClose }: { currentPw: string; onClose: () => void }) {
  const [oldPw, setOldPw] = useState(currentPw);
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const fn = useServerFn(changePassword);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 4) { toast.error("Parool peab olema vähemalt 4 märki"); return; }
    if (newPw !== newPw2) { toast.error("Paroolid ei kattu"); return; }
    setSaving(true);
    try {
      await fn({ data: { oldPassword: oldPw, newPassword: newPw } });
      sessionStorage.setItem(PW_KEY, newPw);
      toast.success("Parool muudetud — logi uuesti sisse");
      onClose();
      setTimeout(() => { sessionStorage.removeItem(PW_KEY); location.reload(); }, 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Viga");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Muuda parooli</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Praegune parool</Label><Input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} /></div>
          <div><Label>Uus parool</Label><Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} /></div>
          <div><Label>Kinnita uus parool</Label><Input type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Tühista</Button>
            <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Muuda"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PagesSection({ password }: { password: string }) {
  const qc = useQueryClient();
  const pages = useQuery({ queryKey: ["pages"], queryFn: fetchPages });
  const [edit, setEdit] = useState<Partial<PageRow> | null>(null);
  const delFn = useServerFn(deletePage);

  const refresh = () => qc.invalidateQueries({ queryKey: ["pages"] });

  const onDel = async (p: PageRow) => {
    if (!confirm(`Kustutada leht "${p.title}"?`)) return;
    await delFn({ data: { password, id: p.id } });
    refresh();
  };

  const groups: { key: "ringid" | "pohikursus" | "opetajad"; label: string }[] = [
    { key: "ringid", label: "Ringid" },
    { key: "pohikursus", label: "Põhikursus" },
    { key: "opetajad", label: "Õpetajad" },
  ];

  return (
    <div className="mx-auto max-w-7xl border-t px-4 py-8 md:px-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-2xl">Lehed (ülariba menüü)</h2>
      </div>
      <div className="space-y-6">
        {groups.map((g) => {
          const items = (pages.data || []).filter((p) => p.section === g.key);
          return (
            <div key={g.key}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</h3>
                <Button size="sm" variant="outline" onClick={() => setEdit({ section: g.key, sort_order: items.length, title: "", slug: "", content: "" })}>
                  <Plus className="h-4 w-4" /> Uus leht
                </Button>
              </div>
              <div className="space-y-2">
                {items.length === 0 && <p className="text-sm text-muted-foreground">Lehti pole.</p>}
                {items.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border bg-card p-3">
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground">/page/{p.slug}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" /> Muuda
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onDel(p)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {edit && (
        <PageDialog password={password} page={edit} onClose={(saved) => { setEdit(null); if (saved) refresh(); }} />
      )}
    </div>
  );
}

function PageDialog({ password, page, onClose }: { password: string; page: Partial<PageRow>; onClose: (saved: boolean) => void }) {
  const [form, setForm] = useState<Partial<PageRow>>(page);
  const [saving, setSaving] = useState(false);
  const fn = useServerFn(savePage);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fn({
        data: {
          password,
          page: {
            id: form.id,
            slug: (form.slug || "").trim(),
            title: (form.title || "").trim(),
            content: form.content || "",
            section: (form.section as "ringid" | "pohikursus" | "opetajad") || "ringid",
            sort_order: form.sort_order ?? 0,
          },
        },
      });
      toast.success("Salvestatud");
      onClose(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Viga");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{form.id ? "Muuda lehte" : "Uus leht"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Pealkiri</Label>
            <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <Label>Slug (URL-i osa)</Label>
            <Input
              value={form.slug || ""}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
              placeholder="nt fotograafia"
              required
            />
          </div>
          <div>
            <Label>Sektsioon</Label>
            <Select value={form.section as string} onValueChange={(v) => setForm({ ...form, section: v as "ringid" | "pohikursus" | "opetajad" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ringid">Ringid (rippmenüüs)</SelectItem>
                <SelectItem value="pohikursus">Põhikursus</SelectItem>
                <SelectItem value="opetajad">Õpetajad (rippmenüüs)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sisu</Label>
            <Textarea
              rows={10}
              value={form.content || ""}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Lehe tekst..."
            />
          </div>
          <div>
            <Label>Järjekord</Label>
            <Input type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose(false)}>Tühista</Button>
            <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvesta"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleSection({ password }: { password: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["lessons"], queryFn: fetchLessons });
  const [edit, setEdit] = useState<Partial<Lesson> | null>(null);
  const delFn = useServerFn(deleteLesson);

  const refresh = () => qc.invalidateQueries({ queryKey: ["lessons"] });

  const onDel = async (l: Lesson) => {
    if (!confirm(`Kustutada tund "${l.title}"?`)) return;
    await delFn({ data: { password, id: l.id } });
    refresh();
  };

  const days = [1, 2, 3, 4, 5, 6];

  return (
    <div className="mx-auto max-w-7xl border-t px-4 py-8 md:px-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-2xl">Tunniplaan</h2>
        <Button size="sm" variant="outline" onClick={() => setEdit({ day_of_week: 1, start_time: "16:40", end_time: "18:10", title: "", teacher: "", room: "", sort_order: 0 })}>
          <Plus className="h-4 w-4" /> Uus tund
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {days.map((d) => {
          const items = (q.data || []).filter((l) => l.day_of_week === d).sort((a, b) => a.start_time.localeCompare(b.start_time));
          return (
            <div key={d} className="rounded-md border bg-card p-3">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{DAY_NAMES[d]}</h3>
              {items.length === 0 && <p className="text-sm text-muted-foreground">Tunde pole.</p>}
              <div className="space-y-2">
                {items.map((l) => (
                  <div key={l.id} className="flex items-start justify-between gap-2 rounded border p-2">
                    <div className="min-w-0">
                      <div className="font-medium">{l.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">{l.start_time}–{l.end_time}</div>
                      {l.teacher && <div className="text-xs text-muted-foreground">{l.teacher}</div>}
                      {l.room && <div className="text-xs text-muted-foreground">Ruum: {l.room}</div>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEdit(l)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onDel(l)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {edit && (
        <LessonDialog password={password} lesson={edit} onClose={(saved) => { setEdit(null); if (saved) refresh(); }} />
      )}
    </div>
  );
}

function LessonDialog({ password, lesson, onClose }: { password: string; lesson: Partial<Lesson>; onClose: (saved: boolean) => void }) {
  const [form, setForm] = useState<Partial<Lesson>>(lesson);
  const [saving, setSaving] = useState(false);
  const fn = useServerFn(saveLesson);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fn({
        data: {
          password,
          lesson: {
            id: form.id,
            day_of_week: Number(form.day_of_week ?? 1),
            start_time: (form.start_time || "").trim(),
            end_time: (form.end_time || "").trim(),
            title: (form.title || "").trim(),
            teacher: form.teacher || "",
            room: form.room || "",
            sort_order: form.sort_order ?? 0,
          },
        },
      });
      toast.success("Salvestatud");
      onClose(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Viga");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{form.id ? "Muuda tundi" : "Uus tund"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Päev</Label>
            <Select value={String(form.day_of_week ?? 1)} onValueChange={(v) => setForm({ ...form, day_of_week: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5,6].map((d) => (
                  <SelectItem key={d} value={String(d)}>{DAY_NAMES[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Algus (HH:MM)</Label>
              <Input value={form.start_time || ""} onChange={(e) => setForm({ ...form, start_time: e.target.value })} placeholder="16:40" required />
            </div>
            <div>
              <Label>Lõpp (HH:MM)</Label>
              <Input value={form.end_time || ""} onChange={(e) => setForm({ ...form, end_time: e.target.value })} placeholder="18:10" required />
            </div>
          </div>
          <div>
            <Label>Pealkiri</Label>
            <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <Label>Õpetaja</Label>
            <Input value={form.teacher || ""} onChange={(e) => setForm({ ...form, teacher: e.target.value })} />
          </div>
          <div>
            <Label>Ruum</Label>
            <Input value={form.room || ""} onChange={(e) => setForm({ ...form, room: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose(false)}>Tühista</Button>
            <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvesta"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
