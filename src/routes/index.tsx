import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HandHeart, ScanSearch, ShieldCheck } from "lucide-react";

import { BentoGrid, bentoSize } from "@/components/bento-grid";
import { ItemCard } from "@/components/item-card";
import { PostMenu } from "@/components/site-chrome";
import { TutorialStrip } from "@/components/tutorial-strip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getBoard } from "@/lib/campus.functions";

function boardQuery(includeSamples: boolean) {
  return queryOptions({
    queryKey: ["board", includeSamples],
    queryFn: () => getBoard({ data: { includeSamples } }),
  });
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusFind — Campus Lost, Found & Resource Board" },
      {
        name: "description",
        content:
          "Report lost belongings, post what you found, and lend spare books or lab kits. Smart matching reunites campus items while keeping contact details private.",
      },
      { property: "og:title", content: "CampusFind — Campus Lost, Found & Resource Board" },
      {
        property: "og:description",
        content:
          "Smart matching reunites lost campus belongings and a shared shelf keeps resources circulating.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:image",
        content: "https://exact-display-matcher.lovable.app/campusfind-og.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:image",
        content: "https://exact-display-matcher.lovable.app/campusfind-og.png",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(boardQuery(true)),
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-3xl">The board didn't load</h1>
      <p className="mt-2 text-sm text-muted-foreground">Refresh the page to try again.</p>
    </div>
  ),
  component: HomePage,
});

function HomePage() {
  const { user, loading } = useAuth();
  // Wait for the session before querying: the server prefetch is guest-only,
  // and the signed-in board must load client-side with the viewer's token.
  if (loading) return <BoardLoading />;
  return <HomeContent signedIn={Boolean(user)} />;
}

function BoardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-24 text-center text-sm text-muted-foreground">
      Loading the board…
    </div>
  );
}

function HomeContent({ signedIn }: { signedIn: boolean }) {
  const { data } = useSuspenseQuery(boardQuery(!signedIn));

  const feed = [
    ...data.lost.slice(0, 4).map((item) => ({ kind: "lost" as const, item })),
    ...data.found.slice(0, 4).map((item) => ({ kind: "found" as const, item })),
    ...data.resources.slice(0, 4).map((item) => ({ kind: "resource" as const, item })),
  ];

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div className="iridescent absolute inset-x-0 -top-40 h-96 blur-3xl opacity-70" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="pin-label text-xs text-primary">Lost it? Found it? Lend it.</p>
          <h1 className="mt-3 max-w-3xl text-5xl leading-[0.92] sm:text-7xl">
            The campus board that actually <em>finds</em> your stuff.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground">
            Post a lost item or something you found, and matching does the awkward searching for
            you. Contact details unlock only after you approve a claim.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full">
              <Link to={signedIn ? "/report/lost" : "/auth"}>
                I lost something <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link to={signedIn ? "/report/found" : "/auth"}>I found something</Link>
            </Button>
            <PostMenu signedIn={signedIn} className="h-11 px-6" />
          </div>

          <dl className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Lost posts", value: data.stats.lostCount },
              { label: "Found posts", value: data.stats.foundCount },
              { label: "On the shelf", value: data.stats.resourceCount },
              { label: "Reunited", value: data.stats.reunitedCount },
            ].map((stat) => (
              <div key={stat.label} className="tile p-4">
                <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="font-display text-4xl leading-none">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-6 px-4 py-14">
        {!signedIn ? <TutorialStrip /> : null}

        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-4xl">Fresh on the board</h2>
          <Link to="/lost-found" className="text-sm font-semibold underline">
            See everything
          </Link>
        </div>

        {feed.length === 0 ? (
          <div className="tile p-10 text-center">
            <h3 className="text-3xl">Your board is empty</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Be first: post a lost item or something you found.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button asChild className="rounded-full">
                <Link to="/report/lost">Report lost</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/report/found">Report found</Link>
              </Button>
            </div>
          </div>
        ) : (
          <BentoGrid>
            {feed.map((entry, index) => (
              <ItemCard
                key={`${entry.kind}-${entry.item.id}`}
                kind={entry.kind}
                size={bentoSize(index)}
                title={entry.item.title}
                description={entry.item.description}
                category={entry.item.category}
                location={
                  "location_lost" in entry.item
                    ? entry.item.location_lost
                    : "location_found" in entry.item
                      ? entry.item.location_found
                      : null
                }
                date={
                  "date_lost" in entry.item
                    ? entry.item.date_lost
                    : "date_found" in entry.item
                      ? entry.item.date_found
                      : null
                }
                status={
                  "status" in entry.item
                    ? entry.item.status
                    : "availability" in entry.item
                      ? entry.item.availability
                      : null
                }
                imagePath={entry.item.image_url}
                sample={entry.item.is_sample}
              />
            ))}
          </BentoGrid>
        )}
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-14 sm:grid-cols-3">
          {[
            {
              icon: ScanSearch,
              title: "Matching, not scrolling",
              body: "Category, keyword and location scoring surfaces the likely pair for any post.",
            },
            {
              icon: ShieldCheck,
              title: "Private by default",
              body: "Your phone or email lives apart from the listing and unlocks only on approval.",
            },
            {
              icon: HandHeart,
              title: "A shared shelf",
              body: "Lend calculators, lab coats and textbooks instead of letting them gather dust.",
            },
          ].map((feature) => (
            <div key={feature.title} className="tile p-6">
              <feature.icon className="size-5 text-primary" />
              <h3 className="mt-3 text-2xl">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
