import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchPages } from "@/lib/pages";

export const Route = createFileRoute("/page/$slug")({
  component: PageView,
});

function PageView() {
  const { slug } = Route.useParams();
  const pages = useQuery({ queryKey: ["pages"], queryFn: fetchPages });
  const page = pages.data?.find((p) => p.slug === slug);

  if (pages.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Laeb…
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-16 md:px-8 text-center">
          <h1 className="font-serif text-3xl">Lehte ei leitud</h1>
          <Link to="/" className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground">
            ← Tagasi galeriisse
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <h1 className="font-serif text-4xl md:text-5xl">{page.title}</h1>
        <div className="prose prose-lg mt-6 max-w-none whitespace-pre-wrap text-foreground/90 leading-relaxed">
          {page.content}
        </div>
      </article>
    </div>
  );
}
