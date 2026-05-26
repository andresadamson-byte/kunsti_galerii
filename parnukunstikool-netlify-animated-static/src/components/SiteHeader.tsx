import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Settings, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { fetchPages } from "@/lib/pages";

export function SiteHeader() {
  const pages = useQuery({ queryKey: ["pages"], queryFn: fetchPages });
  const ringid = (pages.data || []).filter((p) => p.section === "ringid");
  const opetajad = (pages.data || []).filter((p) => p.section === "opetajad");
  const pohikursus = (pages.data || []).find((p) => p.section === "pohikursus");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <Link to="/" className="font-serif text-2xl font-semibold tracking-tight">
          Pärnu Kunstikooli galerii
        </Link>
        <nav className="flex items-center gap-2 md:gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              Ringid <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {ringid.length === 0 ? (
                <DropdownMenuItem disabled>Pole veel lehti</DropdownMenuItem>
              ) : (
                ringid.map((p) => (
                  <DropdownMenuItem key={p.id} asChild>
                    <Link to="/page/$slug" params={{ slug: p.slug }}>
                      {p.title}
                    </Link>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              Õpetajad <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {opetajad.length === 0 ? (
                <DropdownMenuItem disabled>Pole veel õpetajaid</DropdownMenuItem>
              ) : (
                opetajad.map((p) => (
                  <DropdownMenuItem key={p.id} asChild>
                    <Link to="/page/$slug" params={{ slug: p.slug }}>
                      {p.title}
                    </Link>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {pohikursus && (
            <Link
              to="/page/$slug"
              params={{ slug: pohikursus.slug }}
              className="rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              Põhikursus
            </Link>
          )}
          <Link to="/tunniplaan" className="rounded-md px-2 py-1.5 text-sm hover:bg-muted">
            Tunniplaan
          </Link>
          <Link
            to="/edit"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" /> Edit
          </Link>
        </nav>
      </div>
    </header>
  );
}
