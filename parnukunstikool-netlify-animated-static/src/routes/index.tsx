import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { HeroCarousel } from "@/components/HeroCarousel";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchCategories, fetchArtworks, imageUrl } from "@/lib/gallery";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pärnu Kunstikool — õpilastööde galerii" },
      {
        name: "description",
        content:
          "Pärnu Kunstikooli õpilastööde galerii — kursused, ringid ja õpetajate tutvustused.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const cats = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const arts = useQuery({ queryKey: ["artworks"], queryFn: fetchArtworks });

  const featured = useMemo(() => (arts.data || []).filter((a) => a.featured), [arts.data]);

  const previewByCat = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of arts.data || []) {
      if (!m.has(a.category_id)) m.set(a.category_id, a.image_path);
    }
    return m;
  }, [arts.data]);

  const courses = (cats.data || []).filter((c) => c.type === "course");
  const circles = (cats.data || []).filter((c) => c.type === "circle");

  if (cats.isLoading || arts.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Laeb…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="bg-foreground">
        <HeroCarousel artworks={featured} />
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <Section title="Kursused" categories={courses} previewByCat={previewByCat} />
        <Section title="Ringid" categories={circles} previewByCat={previewByCat} />
      </main>

      <SiteFooter />
    </div>
  );
}

function Section({
  title,
  categories,
  previewByCat,
}: {
  title: string;
  categories: { id: string; name: string }[];
  previewByCat: Map<string, string>;
}) {
  if (categories.length === 0) return null;
  return (
    <section className="mb-12">
      <h2 className="mb-5 font-serif text-3xl md:text-4xl">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {categories.map((c) => {
          const preview = previewByCat.get(c.id);
          return (
            <Link
              key={c.id}
              to="/category/$id"
              params={{ id: c.id }}
              className="group relative block aspect-square overflow-hidden rounded-lg bg-muted shadow-sm"
            >
              {preview ? (
                <img
                  src={imageUrl(preview)}
                  alt={c.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  Pildid puuduvad
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <div className="font-serif text-lg leading-tight text-background drop-shadow md:text-xl">
                  {c.name}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm md:grid-cols-3 md:px-8">
        <div>
          <div className="font-serif text-lg text-foreground">Pärnu Kunstikool</div>
          <div className="mt-1 text-muted-foreground">Õpilastööde galerii</div>
        </div>
        <div>
          <div className="font-semibold text-foreground">Aadress</div>
          <div className="text-muted-foreground">
            Kerese 4, Pärnu
            <br />
            80010 Pärnumaa
          </div>
        </div>
        <div>
          <div className="font-semibold text-foreground">Kontakt</div>
          <div className="text-muted-foreground">
            Tel: 442 5240
            <br />
            E-post: kool@parnukunstikool.ee
          </div>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Pärnu Kunstikool
      </div>
    </footer>
  );
}
