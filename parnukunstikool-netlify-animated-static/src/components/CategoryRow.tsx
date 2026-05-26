import { Link } from "@tanstack/react-router";
import { imageUrl, type Artwork } from "@/lib/gallery";

export function CategoryRow({
  title,
  categoryId,
  artworks,
  onOpen,
}: {
  title: string;
  categoryId: string;
  artworks: Artwork[];
  onOpen?: (a: Artwork) => void;
}) {
  const cover = artworks[0];
  const rest = artworks; // show all in 3-col grid, including cover

  return (
    <section className="py-10">
      <div className="px-4 md:px-8">
        <div className="relative mb-6 overflow-hidden rounded-lg bg-muted">
          {cover ? (
            <>
              <img
                src={imageUrl(cover.image_path)}
                alt={title}
                className="h-44 w-full object-cover md:h-56"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
            </>
          ) : (
            <div className="h-44 w-full md:h-56" />
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 md:p-6">
            <h2 className="font-serif text-3xl text-background drop-shadow md:text-4xl">
              {title}
            </h2>
            <Link
              to="/category/$id"
              params={{ id: categoryId }}
              className="rounded-full bg-background/90 px-3 py-1.5 text-sm text-foreground hover:bg-background"
            >
              Vaata kõiki →
            </Link>
          </div>
        </div>

        {rest.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">Pildid puuduvad veel.</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {rest.map((a) => (
              <button
                key={a.id}
                onClick={() => onOpen?.(a)}
                className="group relative aspect-[3/4] overflow-hidden rounded-md bg-muted shadow-sm"
              >
                <img
                  src={imageUrl(a.image_path)}
                  alt={a.title || a.author_name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/85 to-transparent p-3 text-background opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="text-sm font-medium">{a.title || "Pealkirjata"}</div>
                  <div className="text-xs opacity-90">
                    {a.author_name}
                    {a.age ? `, ${a.age}` : ""}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
