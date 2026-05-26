import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { imageUrl, type Artwork } from "@/lib/gallery";

export function HeroCarousel({ artworks }: { artworks: Artwork[] }) {
  const [emblaRef, embla] = useEmblaCarousel(
    { loop: true, align: "center", containScroll: false },
    [Autoplay({ delay: 4500, stopOnInteraction: false })],
  );
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!embla) return;
    const onSel = () => setSelected(embla.selectedScrollSnap());
    onSel();
    embla.on("select", onSel);
    return () => {
      embla.off("select", onSel);
    };
  }, [embla]);

  if (artworks.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-muted text-muted-foreground">
        Märgi mõned tööd "Esiletõstetuks" edit moodulis, et nad siia ilmuks.
      </div>
    );
  }

  return (
    <div className="relative bg-foreground">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {artworks.map((a, i) => (
            <div
              key={a.id}
              className="relative flex-[0_0_70%] min-w-0 md:flex-[0_0_55%] lg:flex-[0_0_45%]"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <img
                  src={imageUrl(a.image_path)}
                  alt={a.title || a.author_name}
                  className="h-full w-full object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                />
                {i !== selected && (
                  <div className="absolute inset-0 bg-foreground/70 backdrop-blur-[1px] transition-opacity" />
                )}
                {i === selected && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent p-4 text-background sm:p-6">
                    <h2 className="text-xl font-semibold sm:text-2xl">
                      {a.title || "Pealkirjata"}
                    </h2>
                    <p className="text-sm opacity-90">
                      {a.author_name}
                      {a.age ? `, ${a.age} a.` : ""} · {a.technique} {a.year ? `· ${a.year}` : ""}
                      {a.teacher ? ` · juhendaja ${a.teacher}` : ""}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => embla?.scrollPrev()}
        aria-label="Eelmine"
        className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/80 p-3 text-foreground shadow-lg backdrop-blur transition hover:bg-background"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={() => embla?.scrollNext()}
        aria-label="Järgmine"
        className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/80 p-3 text-foreground shadow-lg backdrop-blur transition hover:bg-background"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}
