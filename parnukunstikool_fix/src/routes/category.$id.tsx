import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowLeft, Search } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Lightbox } from "@/components/Lightbox";
import { fetchCategories, fetchArtworks, imageUrl, type Artwork } from "@/lib/gallery";

export const Route = createFileRoute("/category/$id")({
  component: CategoryPage,
});

type SortKey = "default" | "author" | "age" | "teacher" | "technique" | "year";

const SORT_LABELS: Record<SortKey, string> = {
  default: "Vaikimisi",
  author: "Nimi",
  age: "Vanus",
  teacher: "Õpetaja",
  technique: "Tehnika",
  year: "Aasta",
};

function sortItems(items: Artwork[], key: SortKey): Artwork[] {
  if (key === "default") return items;
  const copy = [...items];
  copy.sort((a, b) => {
    switch (key) {
      case "author":
        return (a.author_name || "").localeCompare(b.author_name || "", "et");
      case "teacher":
        return (a.teacher || "").localeCompare(b.teacher || "", "et");
      case "technique":
        return (a.technique || "").localeCompare(b.technique || "", "et");
      case "age":
        return (a.age ?? 999) - (b.age ?? 999);
      case "year":
        return (b.year ?? 0) - (a.year ?? 0);
      default:
        return 0;
    }
  });
  return copy;
}

function CategoryPage() {
  const { id } = Route.useParams();
  const cats = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const arts = useQuery({ queryKey: ["artworks"], queryFn: fetchArtworks });
  const ref = useRef<HTMLDivElement>(null);
  const [lb, setLb] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>("default");

  const cat = cats.data?.find((c) => c.id === id);
  const items = useMemo(
    () => sortItems((arts.data || []).filter((a) => a.category_id === id), sort),
    [arts.data, id, sort],
  );

  if (cats.isLoading || arts.isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Laeb…</div>;
  }
  if (!cat) throw notFound();

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Tagasi
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl">{cat.name}</h1>
            <p className="text-muted-foreground">{items.length} tööd</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Sorteeri:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <option key={k} value={k}>{SORT_LABELS[k]}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          ref={ref}
          className="no-scrollbar flex items-center gap-4 overflow-x-auto px-4 pb-8 md:px-8"
        >
          {items.length === 0 && (
            <div className="py-20 text-muted-foreground">Selles kategoorias pole veel pilte.</div>
          )}
          {items.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setLb(i)}
              className="group relative h-56 flex-shrink-0 overflow-hidden rounded-md bg-muted shadow-md md:h-72"
            >
              <img
                src={imageUrl(a.image_path)}
                alt={a.title || a.author_name}
                className="h-full w-auto object-contain transition group-hover:scale-[1.02]"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-foreground/0 transition group-hover:bg-foreground/40">
                <Search className="h-8 w-8 text-background opacity-0 drop-shadow transition group-hover:opacity-100" />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-foreground/90 to-transparent p-3 text-left text-background opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                <div className="text-sm font-semibold leading-tight">{a.title || "Pealkirjata"}</div>
                <div className="text-xs opacity-90">
                  {a.author_name}{a.age ? `, ${a.age} a.` : ""}
                </div>
                {(a.technique || a.year) && (
                  <div className="text-xs opacity-80">
                    {a.technique}{a.technique && a.year ? " · " : ""}{a.year || ""}
                  </div>
                )}
                {a.teacher && <div className="text-xs opacity-80">Juhendaja: {a.teacher}</div>}
              </div>
            </button>
          ))}
        </div>

        {items.length > 1 && (
          <>
            <button
              onClick={() => scroll(-1)}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-3 shadow hover:bg-background"
              aria-label="Vasakule"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => scroll(1)}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-3 shadow hover:bg-background"
              aria-label="Paremale"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-8 md:px-8">
        {cat.type === "circle" && cat.cta_url && (
          <a
            href={cat.cta_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow hover:bg-primary/90"
          >
            Registreeru
          </a>
        )}
      </div>

      {lb !== null && (
        <Lightbox items={items} index={lb} onClose={() => setLb(null)} onIndex={setLb} />
      )}
    </div>
  );
}
