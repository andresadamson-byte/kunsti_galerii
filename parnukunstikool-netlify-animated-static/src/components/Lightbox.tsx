import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { imageUrl, type Artwork } from "@/lib/gallery";

export function Lightbox({
  items,
  index,
  onClose,
  onIndex,
}: {
  items: Artwork[];
  index: number;
  onClose: () => void;
  onIndex: (n: number) => void;
}) {
  const a = items[index];

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndex((index - 1 + items.length) % items.length);
      if (e.key === "ArrowRight") onIndex((index + 1) % items.length);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [index, items.length, onClose, onIndex]);

  if (!a) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/95 p-4">
      <button
        onClick={onClose}
        aria-label="Sulge"
        className="absolute right-4 top-4 rounded-full bg-background/20 p-2 text-background hover:bg-background/30"
      >
        <X className="h-6 w-6" />
      </button>
      <button
        onClick={() => onIndex((index - 1 + items.length) % items.length)}
        aria-label="Eelmine"
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-background/20 p-3 text-background hover:bg-background/30"
      >
        <ChevronLeft className="h-7 w-7" />
      </button>
      <button
        onClick={() => onIndex((index + 1) % items.length)}
        aria-label="Järgmine"
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-background/20 p-3 text-background hover:bg-background/30"
      >
        <ChevronRight className="h-7 w-7" />
      </button>

      <div className="flex max-h-full max-w-6xl flex-col items-center gap-4">
        <img
          src={imageUrl(a.image_path)}
          alt={a.title || a.author_name}
          className="max-h-[75vh] max-w-full rounded-md object-contain shadow-2xl"
        />
        <div className="max-w-2xl rounded-md bg-background/95 p-4 text-foreground shadow-lg">
          <h3 className="text-xl font-semibold">{a.title || "Pealkirjata"}</h3>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            {a.author_name && (<><dt className="text-muted-foreground">Autor</dt><dd>{a.author_name}{a.age ? `, ${a.age} a.` : ""}</dd></>)}
            {a.technique && (<><dt className="text-muted-foreground">Tehnika</dt><dd>{a.technique}</dd></>)}
            {a.year && (<><dt className="text-muted-foreground">Aasta</dt><dd>{a.year}</dd></>)}
            {a.teacher && (<><dt className="text-muted-foreground">Juhendaja</dt><dd>{a.teacher}</dd></>)}
          </dl>
        </div>
      </div>
    </div>
  );
}
