import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Handshake, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { UnlistButton } from "@/components/unlist-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSignedPhoto } from "@/hooks/useSignedPhoto";
import {
  addClaimMessage,
  decideBorrow,
  decideClaim,
  getMe,
  getMyActivity,
  markHandedOver,
} from "@/lib/campus.functions";

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

type Activity = Awaited<ReturnType<typeof getMyActivity>>;
type Claim = Activity["claimsMade"][number];
type Message = Activity["messages"][number];

const statusLabel: Record<string, string> = {
  handed_over: "handed over",
};

function ActivityPage() {
  const { data } = useSuspenseQuery(activityQuery);
  const { data: me } = useSuspenseQuery(meQuery);
  const queryClient = useQueryClient();
  const borrowDecision = useServerFn(decideBorrow);

  const borrowMutation = useMutation({
    mutationFn: (input: { id: string; decision: "approved" | "rejected" | "returned" }) =>
      borrowDecision({ data: input }),
    onSuccess: () => {
      toast.success("Request updated.");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const messagesFor = (claimId: string) => data.messages.filter((m) => m.claim_id === claimId);
  const listed = <T extends { is_listed: boolean }>(rows: T[]) => rows.filter((r) => r.is_listed);
  const unlisted = [
    ...data.lost.filter((r) => !r.is_listed).map((r) => ({ ...r, type: "lost" as const })),
    ...data.found.filter((r) => !r.is_listed).map((r) => ({ ...r, type: "found" as const })),
    ...data.resources.filter((r) => !r.is_listed).map((r) => ({ ...r, type: "resource" as const })),
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl">My activity</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Everything you have posted, claimed, or lent out.
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

      {!me.profile?.contact_info ? (
        <div className="tile mt-6 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span>Add your contact info so the other person can reach you once a claim is approved.</span>
          <Button asChild size="sm" variant="outline">
            <Link to="/profile">Add contact</Link>
          </Button>
        </div>
      ) : null}

      <Tabs defaultValue="claims" className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="reports">My posts</TabsTrigger>
          <TabsTrigger value="lending">Lending</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-6 space-y-6">
          <Section title="Lost reports" empty="You haven't reported anything lost.">
            {listed(data.lost).map((item) => (
              <Row key={item.id} title={item.title} meta={`${item.category} · lost ${item.date_lost}`} status={item.status}>
                <UnlistButton itemType="lost" itemId={item.id} />
              </Row>
            ))}
          </Section>
          <Section title="Found reports" empty="You haven't handed anything in yet.">
            {listed(data.found).map((item) => (
              <Row key={item.id} title={item.title} meta={`${item.category} · found ${item.date_found}`} status={item.status}>
                <UnlistButton itemType="found" itemId={item.id} />
              </Row>
            ))}
          </Section>
          <Section title="My listings" empty="You aren't lending anything yet.">
            {listed(data.resources).map((item) => (
              <Row key={item.id} title={item.title} meta={item.category} status={item.availability}>
                <UnlistButton itemType="resource" itemId={item.id} />
              </Row>
            ))}
          </Section>
          <Section title="Unlisted" empty="Nothing unlisted.">
            {unlisted.map((item) => (
              <Row key={item.id} title={item.title} meta={`${item.type} · hidden from the board`} status="unlisted">
                <UnlistButton itemType={item.type} itemId={item.id} listed={false} />
              </Row>
            ))}
          </Section>
        </TabsContent>

        <TabsContent value="claims" className="mt-6 space-y-6">
          <Section title="Claims on my found items" empty="No one has claimed your found items yet.">
            {data.claimsReceived.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                role="finder"
                userId={data.userId}
                messages={messagesFor(claim.id)}
                handover={data.handovers[claim.id]}
              />
            ))}
          </Section>
          <Section title="Claims I made" empty="You haven't claimed anything yet.">
            {data.claimsMade.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                role="claimant"
                userId={data.userId}
                messages={messagesFor(claim.id)}
                handover={data.handovers[claim.id]}
              />
            ))}
          </Section>
        </TabsContent>

        <TabsContent value="lending" className="mt-6 space-y-6">
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
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={request.status} />
                    {request.status === "pending" ? (
                      <>
                        <Button size="sm" onClick={() => borrowMutation.mutate({ id: request.id, decision: "approved" })} disabled={borrowMutation.isPending}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => borrowMutation.mutate({ id: request.id, decision: "rejected" })} disabled={borrowMutation.isPending}>
                          Decline
                        </Button>
                      </>
                    ) : null}
                    {request.status === "approved" ? (
                      <Button size="sm" variant="outline" onClick={() => borrowMutation.mutate({ id: request.id, decision: "returned" })} disabled={borrowMutation.isPending}>
                        Mark returned
                      </Button>
                    ) : null}
                  </div>
                  {data.handovers[request.id] ? <HandoverCard party={data.handovers[request.id]!} label="Borrower" /> : null}
                </CardContent>
              </Card>
            ))}
          </Section>

          <Section title="My borrow requests" empty="You haven't requested anything yet.">
            {data.borrowsMade.map((request) => (
              <Card key={request.id} className="notice-card">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    {(request.resource_listings as { title: string } | null)?.title ?? "Listing"}
                  </CardTitle>
                  <CardDescription>
                    {request.message} · {request.requested_duration}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StatusBadge status={request.status} />
                  {data.handovers[request.id] ? <HandoverCard party={data.handovers[request.id]!} label="Lender" /> : null}
                </CardContent>
              </Card>
            ))}
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClaimCard({
  claim,
  role,
  userId,
  messages,
  handover,
}: {
  claim: Claim;
  role: "finder" | "claimant";
  userId: string;
  messages: Message[];
  handover?: { name: string; contact: string | null };
}) {
  const queryClient = useQueryClient();
  const decide = useServerFn(decideClaim);
  const handOver = useServerFn(markHandedOver);
  const send = useServerFn(addClaimMessage);
  const [reply, setReply] = useState("");
  const [meeting, setMeeting] = useState("");
  const proof = useSignedPhoto(role === "finder" ? (claim as Claim & { proof_photo?: string | null }).proof_photo : null);
  const item = claim.found_items as { id: string; title: string } | null;

  const refresh = () => queryClient.invalidateQueries();
  const onError = (error: Error) => toast.error(error.message);

  const decision = useMutation({
    mutationFn: (value: "approved" | "rejected") =>
      decide({ data: { id: claim.id, decision: value, meetingNote: meeting || null } }),
    onSuccess: () => {
      toast.success("Claim updated.");
      refresh();
    },
    onError,
  });
  const handed = useMutation({
    mutationFn: () => handOver({ data: { id: claim.id } }),
    onSuccess: () => {
      toast.success("Marked as handed over.");
      refresh();
    },
    onError,
  });
  const message = useMutation({
    mutationFn: () => send({ data: { claimId: claim.id, body: reply } }),
    onSuccess: () => {
      setReply("");
      refresh();
    },
    onError,
  });

  return (
    <Card className="notice-card">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-2xl">{item?.title ?? "Item"}</CardTitle>
          <StatusBadge status={claim.status} />
        </div>
        <CardDescription className="space-y-1">
          {claim.where_when ? <span className="block"><b>Lost:</b> {claim.where_when}</span> : null}
          {claim.identifying_details ? <span className="block"><b>Details:</b> {claim.identifying_details}</span> : null}
          {claim.message ? <span className="block">{claim.message}</span> : null}
        </CardDescription>
        {proof ? <img src={proof} alt="Proof photo from the claimant" className="mt-2 max-h-48 rounded-md object-cover" /> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.length > 0 ? (
          <ul className="space-y-2">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.author_id === userId ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
              >
                {m.body}
              </li>
            ))}
          </ul>
        ) : null}

        {claim.status === "pending" ? (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (reply.trim()) message.mutate();
            }}
          >
            <Input
              value={reply}
              maxLength={1000}
              onChange={(e) => setReply(e.target.value)}
              placeholder={role === "finder" ? "Ask the claimant a question…" : "Add more info for the finder…"}
            />
            <Button type="submit" size="sm" variant="outline" disabled={message.isPending || !reply.trim()}>
              Send
            </Button>
          </form>
        ) : null}

        {role === "finder" && claim.status === "pending" ? (
          <div className="space-y-2 border-t border-border pt-3">
            <Input
              value={meeting}
              maxLength={200}
              onChange={(e) => setMeeting(e.target.value)}
              placeholder="Where to meet if you approve (e.g. Library front desk, 4pm)"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => decision.mutate("approved")} disabled={decision.isPending}>
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => decision.mutate("rejected")} disabled={decision.isPending}>
                Decline
              </Button>
            </div>
          </div>
        ) : null}

        {claim.status === "approved" && handover ? (
          <HandoverCard
            party={handover}
            label={role === "finder" ? "Owner" : "Finder"}
            meeting={claim.meeting_note}
            action={
              role === "finder" ? (
                <Button size="sm" onClick={() => handed.mutate()} disabled={handed.isPending}>
                  Mark handed over
                </Button>
              ) : null
            }
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function HandoverCard({
  party,
  label,
  meeting,
  action,
}: {
  party: { name: string; contact: string | null };
  label: string;
  meeting?: string | null;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-found/40 bg-found/10 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <Handshake className="size-4 text-found" /> Handover
      </p>
      <p className="mt-2">
        {label}: <b>{party.name}</b>
      </p>
      <p className="mt-1 flex items-center gap-2">
        <Phone className="size-3.5 text-found" />
        {party.contact ?? "No contact added yet. Ask them to add it in their profile."}
      </p>
      {meeting ? (
        <p className="mt-1 flex items-center gap-2">
          <MapPin className="size-3.5 text-found" /> {meeting}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        Meet somewhere public on campus and check the item together. These details hide once it's handed over.
      </p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className="capitalize">
      {statusLabel[status] ?? status}
    </Badge>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
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

function Row({
  title,
  meta,
  status,
  children,
}: {
  title: string;
  meta: string;
  status: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="notice-card flex flex-wrap items-center justify-between gap-3 rounded-sm p-4">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        {children}
      </div>
    </div>
  );
}
