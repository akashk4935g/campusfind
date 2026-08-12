import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUpRight,
  BellRing,
  HandHeart,
  PackageSearch,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { decideBorrow, decideClaim, getDashboard, getMyActivity } from "@/lib/campus.functions";
import { cn } from "@/lib/utils";

const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => getDashboard(),
});

const activityQuery = queryOptions({
  queryKey: ["my-activity"],
  queryFn: () => getMyActivity(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Dashboard — CampusFind" },
      {
        name: "description",
        content:
          "See what needs your attention on CampusFind: claims to review, borrow requests, unread alerts, and every item you have posted.",
      },
      { property: "og:title", content: "Your Dashboard — CampusFind" },
      {
        property: "og:description",
        content: "Claims to review, borrow requests, and alerts in one calm place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const { data: activity } = useSuspenseQuery(activityQuery);
  const queryClient = useQueryClient();

  const claimDecision = useServerFn(decideClaim);
  const borrowDecision = useServerFn(decideBorrow);

  const claimMutation = useMutation({
    mutationFn: (input: { id: string; decision: "approved" | "rejected" }) =>
      claimDecision({ data: input }),
    onSuccess: () => {
      toast.success("Claim updated.");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const borrowMutation = useMutation({
    mutationFn: (input: { id: string; decision: "approved" | "rejected" | "returned" }) =>
      borrowDecision({ data: input }),
    onSuccess: () => {
      toast.success("Request updated.");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const firstName = (data.profile?.full_name ?? "Student").split(" ")[0];
  const pendingClaims = activity.claimsReceived.filter((claim) => claim.status === "pending");
  const pendingBorrows = activity.borrowsReceived.filter((request) => request.status === "pending");
  const queueCount = pendingClaims.length + pendingBorrows.length;

  const timeline = [
    ...activity.lost.map((item) => ({
      id: `lost-${item.id}`,
      label: item.title,
      meta: `Lost report · ${item.status}`,
      at: item.created_at,
    })),
    ...activity.found.map((item) => ({
      id: `found-${item.id}`,
      label: item.title,
      meta: `Found report · ${item.status}`,
      at: item.created_at,
    })),
    ...activity.resources.map((item) => ({
      id: `res-${item.id}`,
      label: item.title,
      meta: `Listing · ${item.availability}`,
      at: item.created_at,
    })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="tile relative overflow-hidden p-6 sm:p-8">
        <div className="iridescent pointer-events-none absolute -right-16 -top-24 size-64 rounded-full opacity-40 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {data.profile?.campus ?? "Your campus"}
            </p>
            <h1 className="mt-2 text-5xl leading-none">Hey {firstName}.</h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              {queueCount > 0
                ? `${queueCount} thing${queueCount > 1 ? "s" : ""} waiting on your call.`
                : "Nothing is waiting on you. Post something or browse the board."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="rounded-full">
              <Link to="/report/lost">
                <Search className="mr-1 size-3.5" /> Lost
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link to="/report/found">
                <PackageSearch className="mr-1 size-3.5" /> Found
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link to="/report/resource">
                <HandHeart className="mr-1 size-3.5" /> Lend
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Claims to review" value={data.summary.pendingClaims} accent />
        <Stat label="Borrow requests" value={data.summary.pendingBorrows} />
        <Stat label="Unread alerts" value={data.summary.unreadAlerts} to="/notifications" />
        <Stat label="Reunited by you" value={data.summary.reunited} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Waiting on you"
          action={
            <Button asChild size="sm" variant="ghost">
              <Link to="/activity">
                All activity <ArrowUpRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          }
        >
          {queueCount === 0 ? (
            <Empty
              text="Your queue is clear."
              cta={{ to: "/lost-found", label: "Browse the board" }}
            />
          ) : (
            <ul className="space-y-3">
              {pendingClaims.map((claim) => (
                <li key={claim.id} className="notice-card rounded-sm p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {(claim.found_items as { title: string } | null)?.title ?? "Found item"}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {claim.message}
                      </p>
                    </div>
                    <Badge variant="outline">Claim</Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => claimMutation.mutate({ id: claim.id, decision: "approved" })}
                      disabled={claimMutation.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => claimMutation.mutate({ id: claim.id, decision: "rejected" })}
                      disabled={claimMutation.isPending}
                    >
                      Decline
                    </Button>
                  </div>
                </li>
              ))}
              {pendingBorrows.map((request) => (
                <li key={request.id} className="notice-card rounded-sm p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {(request.resource_listings as { title: string } | null)?.title ?? "Listing"}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {request.message} · {request.requested_duration}
                      </p>
                    </div>
                    <Badge variant="outline">Borrow</Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => borrowMutation.mutate({ id: request.id, decision: "approved" })}
                      disabled={borrowMutation.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => borrowMutation.mutate({ id: request.id, decision: "rejected" })}
                      disabled={borrowMutation.isPending}
                    >
                      Decline
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel
            title="Latest alerts"
            action={
              <Button asChild size="sm" variant="ghost">
                <Link to="/notifications">
                  <BellRing className="size-3.5" />
                </Link>
              </Button>
            }
          >
            {data.alerts.length === 0 ? (
              <Empty text="No alerts yet." />
            ) : (
              <ul className="space-y-2">
                {data.alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className={cn(
                      "rounded-sm border border-border p-3",
                      alert.read ? "opacity-60" : "bg-secondary/60",
                    )}
                  >
                    <p className="text-sm font-semibold">{alert.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{alert.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Your posts">
            <dl className="grid grid-cols-3 gap-3 text-center">
              <Mini label="Lost" value={data.summary.lostCount} />
              <Mini label="Found" value={data.summary.foundCount} />
              <Mini label="Lent" value={data.summary.resourceCount} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link to="/profile">
                  <UserRound className="mr-1 size-3.5" /> Profile
                </Link>
              </Button>
              {data.isAdmin ? (
                <Button asChild size="sm" variant="secondary" className="rounded-full">
                  <Link to="/admin">Admin</Link>
                </Button>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        className="mt-4"
        title="Recent activity"
        action={
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" /> newest first
          </span>
        }
      >
        {timeline.length === 0 ? (
          <Empty text="You haven't posted anything yet." cta={{ to: "/report/lost", label: "Report a lost item" }} />
        ) : (
          <ol className="space-y-0 divide-y divide-border">
            {timeline.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{entry.label}</p>
                  <p className="text-xs capitalize text-muted-foreground">{entry.meta}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(entry.at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  to,
}: {
  label: string;
  value: number;
  accent?: boolean;
  to?: "/notifications";
}) {
  const body = (
    <div
      className={cn(
        "tile flex h-full flex-col justify-between p-5 transition-transform hover:-translate-y-0.5",
        accent && value > 0 ? "ring-1 ring-primary/40" : "",
      )}
    >
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-5xl leading-none">{value}</p>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("tile p-5 sm:p-6", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl leading-none">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-secondary p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-display text-3xl leading-none">{value}</dd>
    </div>
  );
}

function Empty({
  text,
  cta,
}: {
  text: string;
  cta?: { to: "/lost-found" | "/report/lost"; label: string };
}) {
  return (
    <div className="rounded-sm border border-dashed border-border p-6 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      {cta ? (
        <Button asChild size="sm" variant="outline" className="mt-3 rounded-full">
          <Link to={cta.to}>{cta.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
