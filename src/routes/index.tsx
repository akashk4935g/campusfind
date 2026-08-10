import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HandHeart, ScanSearch, ShieldCheck } from "lucide-react";

import { ItemCard } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import { getBoard } from "@/lib/campus.functions";

const boardQuery = queryOptions({
  queryKey: ["board"],
  queryFn: () => getBoard(),
});

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
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(boardQuery),
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-3xl">The board didn't load</h1>
      <p className="mt-2 text-sm text-muted-foreground">Refresh the page to try again.</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-3xl">Nothing pinned here</h1>
    </div>
  ),
  component: HomePage,
});

function HomePage() {
  const { data } = useSuspenseQuery(boardQuery);
  const recentLost = data.lost.slice(0, 3);
  const recentFound = data.found.slice(0, 3);
  const recentResources = data.resources.slice(0, 3);

  return (
    <div>
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div>
            <p className="pin-label text-sm text-primary">Campus noticeboard · digitised</p>
            <h1 className="mt-3 text-5xl leading-[0.95] sm:text-7xl">
              Lost something?
              <br />
              The board is already looking.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground">
              CampusFind pins every lost and found report to one place, scores likely matches
              automatically, and keeps your phone number sealed until you approve a handover.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/report/lost">
                  Report a lost item <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/lost-found">Browse the board</Link>
              </Button>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 self-start">
            {[
              { label: "Lost reports", value: data.stats.lostCount },
              { label: "Found reports", value: data.stats.foundCount },
              { label: "Reunited", value: data.stats.reunitedCount },
              { label: "On the shelf", value: data.stats.resourceCount },
            ].map((stat) => (
              <div key={stat.label} className="notice-card rounded-sm p-4">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </dt>
                <dd className="font-display text-4xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: ScanSearch,
              title: "Pin a report",
              body: "Describe the item, where it went missing, and add a photo. Two minutes, no forms to print.",
            },
            {
              icon: ShieldCheck,
              title: "Matching does the legwork",
              body: "Category, keywords, and location are scored to surface the most likely counterpart with a confidence reason.",
            },
            {
              icon: HandHeart,
              title: "Hand it over safely",
              body: "Contact details unlock only after the finder approves the claim, so nothing is public that shouldn't be.",
            },
          ].map((step) => (
            <div key={step.title} className="notice-card rounded-sm p-5">
              <step.icon className="size-5 text-primary" />
              <h3 className="mt-3 text-2xl">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <BoardStrip
        title="Recently lost"
        href="/lost-found"
        items={recentLost.map((item) => (
          <ItemCard
            key={item.id}
            kind="lost"
            title={item.title}
            description={item.description}
            category={item.category}
            location={item.location_lost}
            date={item.date_lost}
            status={item.status}
            imagePath={item.image_url}
          />
        ))}
      />

      <BoardStrip
        title="Recently found"
        href="/lost-found"
        items={recentFound.map((item) => (
          <ItemCard
            key={item.id}
            kind="found"
            title={item.title}
            description={item.description}
            category={item.category}
            location={item.location_found}
            date={item.date_found}
            status={item.status}
            imagePath={item.image_url}
          />
        ))}
      />

      <BoardStrip
        title="On the resource shelf"
        href="/resources"
        items={recentResources.map((item) => (
          <ItemCard
            key={item.id}
            kind="resource"
            title={item.title}
            description={item.description}
            category={item.category}
            status={item.availability}
            imagePath={item.image_url}
          />
        ))}
      />
    </div>
  );
}

function BoardStrip({
  title,
  href,
  items,
}: {
  title: string;
  href: "/lost-found" | "/resources";
  items: React.ReactNode[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-3xl">{title}</h2>
        <Link to={href} className="text-sm font-medium underline">
          See all
        </Link>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items}</div>
    </section>
  );
}
