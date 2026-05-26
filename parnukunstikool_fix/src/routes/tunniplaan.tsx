import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchLessons, DAY_NAMES, type Lesson } from "@/lib/schedule";

export const Route = createFileRoute("/tunniplaan")({
  head: () => ({
    meta: [
      { title: "Tunniplaan — Pärnu Kunstikooli galerii" },
      { name: "description", content: "Pärnu Kunstikooli tunniplaan esmaspäevast laupäevani." },
    ],
  }),
  component: TunniplaanPage,
});

function TunniplaanPage() {
  const q = useQuery({ queryKey: ["lessons"], queryFn: fetchLessons });
  const lessons = q.data || [];

  const days = [1, 2, 3, 4, 5, 6];
  const slots = Array.from(new Set(lessons.map((l) => l.start_time))).sort();
  const byDay = (d: number) => lessons.filter((l) => l.day_of_week === d).sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <article className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <h1 className="font-serif text-4xl md:text-5xl">Tunniplaan</h1>
        <p className="mt-3 text-muted-foreground">
          Tunnid algavad erinevatel aegadel — täis-, pool- ja muudel kellaaegadel.
        </p>

        {q.isLoading ? (
          <p className="mt-8 text-muted-foreground">Laeb…</p>
        ) : lessons.length === 0 ? (
          <p className="mt-8 text-muted-foreground">Tunniplaan on veel täitmata.</p>
        ) : (
          <>
            {/* Töölaud */}
            <div className="mt-8 hidden overflow-x-auto rounded-lg border border-border md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="sticky left-0 z-10 w-24 border-b border-r border-border bg-muted/50 p-3 text-left font-medium text-muted-foreground">
                      Algus
                    </th>
                    {days.map((d) => (
                      <th key={d} className="border-b border-r border-border p-3 text-left font-medium last:border-r-0">
                        {DAY_NAMES[d]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <tr key={slot} className="align-top">
                      <td className="sticky left-0 z-10 border-b border-r border-border bg-background p-3 font-mono text-xs text-muted-foreground">
                        {slot}
                      </td>
                      {days.map((d) => {
                        const matches = byDay(d).filter((l) => l.start_time === slot);
                        return (
                          <td key={d + slot} className="border-b border-r border-border p-3 last:border-r-0">
                            {matches.length === 0 ? (
                              <span className="text-muted-foreground/30">—</span>
                            ) : (
                              <div className="space-y-2">
                                {matches.map((l) => (
                                  <LessonCell key={l.id} l={l} />
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobiil */}
            <div className="mt-8 space-y-6 md:hidden">
              {days.map((d) => {
                const items = byDay(d);
                if (items.length === 0) return null;
                return (
                  <section key={d} className="rounded-lg border border-border p-4">
                    <h2 className="font-serif text-xl">{DAY_NAMES[d]}</h2>
                    <ul className="mt-3 space-y-3">
                      {items.map((l) => (
                        <li key={l.id} className="flex gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
                          <div className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                            {l.start_time}
                            <div>{l.end_time}</div>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{l.title}</div>
                            {l.teacher && <div className="text-xs text-muted-foreground">{l.teacher}</div>}
                            {l.room && <div className="text-xs text-muted-foreground">Ruum: {l.room}</div>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </article>
    </div>
  );
}

function LessonCell({ l }: { l: Lesson }) {
  return (
    <div className="space-y-0.5">
      <div className="font-medium">{l.title}</div>
      <div className="text-xs text-muted-foreground">
        {l.start_time}–{l.end_time}
      </div>
      {l.teacher && <div className="text-xs text-muted-foreground">{l.teacher}</div>}
      {l.room && <div className="text-xs text-muted-foreground">Ruum: {l.room}</div>}
    </div>
  );
}
