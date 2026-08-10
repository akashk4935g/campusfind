import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { decideBorrow, decideClaim, getAdminQueue } from "@/lib/campus.functions";

const adminQuery = queryOptions({
  queryKey: ["admin-queue"],
  queryFn: () => getAdminQueue(),
  retry: false,
});

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Moderation Queue — CampusFind" },
      {
        name: "description",
        content:
          "Campus admins review pending claims and borrow requests and keep the lost and found board tidy.",
      },
      { property: "og:title", content: "Moderation Queue — CampusFind" },
      {
        property: "og:description",
        content: "Review pending claims and borrow requests across the campus board.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-3xl">Admins only</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This moderation queue is limited to campus administrators.
      </p>
    </div>
  ),
  component: AdminPage,
});

function AdminPage() {
  const { data } = useSuspenseQuery(adminQuery);
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
    mutationFn: (input: { id: string; decision: "approved" | "rejected" }) =>
      borrowDecision({ data: input }),
    onSuccess: () => {
      toast.success("Request updated.");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-5xl">Moderation queue</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Step in when a finder or lender goes quiet. Every decision is logged against your account.
      </p>

      <section className="mt-10">
        <h2 className="text-2xl">Pending claims</h2>
        {data.claims.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No claims waiting.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {data.claims.map((claim) => (
              <Card key={claim.id} className="notice-card">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    {(claim.found_items as { title: string } | null)?.title ?? "Item"}
                  </CardTitle>
                  <CardDescription>{claim.message}</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
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
                    Reject
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-2xl">Pending borrow requests</h2>
        {data.borrows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No requests waiting.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {data.borrows.map((request) => (
              <Card key={request.id} className="notice-card">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    {(request.resource_listings as { title: string } | null)?.title ?? "Listing"}
                  </CardTitle>
                  <CardDescription>
                    {request.message} · {request.requested_duration}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
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
                    Reject
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-2xl">Latest lost reports</h2>
          <ul className="mt-3 space-y-2">
            {data.lost.map((item) => (
              <li key={item.id} className="notice-card flex items-center justify-between rounded-sm p-3 text-sm">
                <span>{item.title}</span>
                <Badge variant="outline" className="capitalize">
                  {item.status}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-2xl">Latest found reports</h2>
          <ul className="mt-3 space-y-2">
            {data.found.map((item) => (
              <li key={item.id} className="notice-card flex items-center justify-between rounded-sm p-3 text-sm">
                <span>{item.title}</span>
                <Badge variant="outline" className="capitalize">
                  {item.status}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
