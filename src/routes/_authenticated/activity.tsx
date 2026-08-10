import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { ContactReveal } from "@/components/contact-reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { decideBorrow, decideClaim, getMe, getMyActivity } from "@/lib/campus.functions";

const activityQuery = queryOptions({
  queryKey: ["my-activity"],
  queryFn: () => getMyActivity(),
});

const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: () => getMe(),
});

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "My Activity — CampusFind" },
      {
        name: "description",
        content:
          "Track your lost and found reports, review claims on items you handed in, and approve borrow requests for your listings.",
      },
      { property: "og:title", content: "My Activity — CampusFind" },
      {
        property: "og:description",
        content: "Track your reports, claims, and borrow requests in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const { data } = useSuspenseQuery(activityQuery);
  const { data: me } = useSuspenseQuery(meQuery);
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl">My activity</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Everything you have pinned, claimed, or lent out.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/report/found">Report found</Link>
          </Button>
          <Button asChild>
            <Link to="/report/lost">Report lost</Link>
          </Button>
          {me.isAdmin ? (
            <Button asChild variant="secondary">
              <Link to="/admin">Admin</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="reports" className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="reports">My reports</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="lending">Lending</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-6 space-y-4">
          <Section title="Lost reports" empty="You haven't reported anything lost.">
            {data.lost.map((item) => (
              <Row
                key={item.id}
                title={item.title}
                meta={`${item.category} · lost ${item.date_lost}`}
                status={item.status}
              />
            ))}
          </Section>
          <Section title="Found reports" empty="You haven't handed anything in yet.">
            {data.found.map((item) => (
              <Row
                key={item.id}
                title={item.title}
                meta={`${item.category} · found ${item.date_found}`}
                status={item.status}
              />
            ))}
          </Section>
          <Section title="My listings" empty="You aren't lending anything yet.">
            {data.resources.map((item) => (
              <Row key={item.id} title={item.title} meta={item.category} status={item.availability} />
            ))}
          </Section>
        </TabsContent>

        <TabsContent value="claims" className="mt-6 space-y-4">
          <Section title="Claims on my found items" empty="No one has claimed your found items yet.">
            {data.claimsReceived.map((claim) => (
              <Card key={claim.id} className="notice-card">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    {(claim.found_items as { title: string } | null)?.title ?? "Item"}
                  </CardTitle>
                  <CardDescription>{claim.message}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {claim.status}
                  </Badge>
                  {claim.status === "pending" ? (
                    <>
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
                    </>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </Section>

          <Section title="Claims I made" empty="You haven't claimed anything yet.">
            {data.claimsMade.map((claim) => {
              const item = claim.found_items as { id: string; title: string } | null;
              return (
                <Card key={claim.id} className="notice-card">
                  <CardHeader>
                    <CardTitle className="text-2xl">{item?.title ?? "Item"}</CardTitle>
                    <CardDescription>{claim.message}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {claim.status}
                    </Badge>
                    {item && claim.status === "approved" ? (
                      <ContactReveal itemType="found" itemId={item.id} />
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </Section>
        </TabsContent>

        <TabsContent value="lending" className="mt-6 space-y-4">
          <Section title="Requests for my listings" empty="No borrow requests yet.">
            {data.borrowsReceived.map((request) => (
              <Card key={request.id} className="notice-card">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    {(request.resource_listings as { title: string } | null)?.title ?? "Listing"}
                  </CardTitle>
                  <CardDescription>
                    {request.message} · needs it for {request.requested_duration}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {request.status}
                  </Badge>
                  {request.status === "pending" ? (
                    <>
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
                    </>
                  ) : null}
                  {request.status === "approved" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => borrowMutation.mutate({ id: request.id, decision: "returned" })}
                      disabled={borrowMutation.isPending}
                    >
                      Mark returned
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </Section>

          <Section title="My borrow requests" empty="You haven't requested anything yet.">
            {data.borrowsMade.map((request) => {
              const listing = request.resource_listings as { id: string; title: string } | null;
              return (
                <Card key={request.id} className="notice-card">
                  <CardHeader>
                    <CardTitle className="text-2xl">{listing?.title ?? "Listing"}</CardTitle>
                    <CardDescription>
                      {request.message} · {request.requested_duration}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {request.status}
                    </Badge>
                    {listing && (request.status === "approved" || request.status === "returned") ? (
                      <ContactReveal itemType="resource" itemId={listing.id} />
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <section>
      <h2 className="text-2xl">{title}</h2>
      {children.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-3 space-y-3">{children}</div>
      )}
    </section>
  );
}

function Row({ title, meta, status }: { title: string; meta: string; status: string }) {
  return (
    <div className="notice-card flex flex-wrap items-center justify-between gap-3 rounded-sm p-4">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      <Badge variant="outline" className="capitalize">
        {status}
      </Badge>
    </div>
  );
}
