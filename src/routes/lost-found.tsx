import { queryOptions, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ContactReveal } from "@/components/contact-reveal";
import { TutorialStrip } from "@/components/tutorial-strip";
import { ItemCard } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { CATEGORIES } from "@/lib/campus-schemas";
import { claimItem, getLostAndFound, getMatches } from "@/lib/campus.functions";

function boardQuery(includeSamples: boolean) {
  return queryOptions({
    queryKey: ["lost-found", includeSamples],
    queryFn: () => getLostAndFound({ data: { includeSamples } }),
  });
}


export const Route = createFileRoute("/lost-found")({
  head: () => ({
    meta: [
      { title: "Lost & Found Board — CampusFind" },
      {
        name: "description",
        content:
          "Search every lost and found report on campus by category, keyword, or location, then claim your item through the finder.",
      },
      { property: "og:title", content: "Lost & Found Board — CampusFind" },
      {
        property: "og:description",
        content: "Search lost and found reports on campus and claim your item safely.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(boardQuery(true)),
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-3xl">The board didn't load</h1>
      <p className="mt-2 text-sm text-muted-foreground">Refresh to try again.</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-3xl">Nothing pinned here</h1>
    </div>
  ),
  component: LostFoundPage,
});

function LostFoundPage() {
  const { user } = useAuth();
  const signedIn = Boolean(user);
  const { data } = useSuspenseQuery(boardQuery(!signedIn));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [claimTarget, setClaimTarget] = useState<{ id: string; title: string } | null>(null);

  const filteredLost = useMemo(
    () => filterItems(data.lost, query, category, (item) => item.location_lost),
    [data.lost, query, category],
  );
  const filteredFound = useMemo(
    () => filterItems(data.found, query, category, (item) => item.location_found),
    [data.found, query, category],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-5xl">The board</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Every report on campus, newest first. Claiming an item notifies the finder — contact details
        stay hidden until they approve.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search title, description, or location"
            value={query}
            maxLength={80}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!signedIn ? (
        <div className="mt-8">
          <TutorialStrip />
        </div>
      ) : null}

      <Tabs defaultValue="lost" className="mt-8">
        <TabsList>
          <TabsTrigger value="lost">Lost ({filteredLost.length})</TabsTrigger>
          <TabsTrigger value="found">Found ({filteredFound.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="lost" className="mt-6">
          {filteredLost.length === 0 ? (
            <EmptyState label="No lost reports match that search yet." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLost.map((item) => (
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
                  sample={item.is_sample}
                  footer={
                    <div className="space-y-2">
                      {user && item.reporter_id === user.id ? <OwnPostTag /> : null}
                      <MatchButton itemId={item.id} itemType="lost" signedIn={Boolean(user)} />
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="found" className="mt-6">
          {filteredFound.length === 0 ? (
            <EmptyState label="No found reports match that search yet." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFound.map((item) => (
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
                  sample={item.is_sample}
                  footer={
                    user ? (
                      item.finder_id === user.id ? (
                        <div className="space-y-2">
                          <OwnPostTag />
                          <p className="text-xs text-muted-foreground">
                            You handed this in.{" "}
                            <Link to="/activity" className="underline">
                              Review claims
                            </Link>
                            .
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Button
                            size="sm"
                            disabled={item.status === "claimed" || item.is_sample}
                            onClick={() => setClaimTarget({ id: item.id, title: item.title })}
                          >
                            {item.is_sample
                              ? "Demo item"
                              : item.status === "claimed"
                                ? "Already handed over"
                                : "This is mine"}
                          </Button>
                          {item.is_sample ? null : <ContactReveal itemType="found" itemId={item.id} />}
                        </div>
                      )
                    ) : (
                      <SignInPrompt action="claim this item" />
                    )
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ClaimDialog target={claimTarget} onClose={() => setClaimTarget(null)} />
    </div>
  );
}

function filterItems<T extends { title: string; description: string; category: string }>(
  items: T[],
  query: string,
  category: string,
  locationOf: (item: T) => string,
) {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    if (!needle) return true;
    return `${item.title} ${item.description} ${locationOf(item)}`.toLowerCase().includes(needle);
  });
}

function OwnPostTag() {
  return (
    <span className="tag border-transparent bg-secondary text-secondary-foreground">Your post</span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="tile p-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function SignInPrompt({ action }: { action: string }) {
  return (
    <p className="text-xs text-muted-foreground">
      <Link to="/auth" className="underline">
        Sign in
      </Link>{" "}
      to {action}.
    </p>
  );
}

function MatchButton({
  itemId,
  itemType,
  signedIn,
}: {
  itemId: string;
  itemType: "lost" | "found";
  signedIn: boolean;
}) {
  const fetchMatches = useServerFn(getMatches);
  const mutation = useMutation({
    mutationFn: () => fetchMatches({ data: { itemId, itemType } }),
  });

  if (!signedIn) return <SignInPrompt action="see smart matches" />;

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        <Sparkles className="mr-1 size-3.5" />
        {mutation.isPending ? "Scoring…" : "Find matches"}
      </Button>
      {mutation.data ? (
        mutation.data.matches.length === 0 ? (
          <p className="text-xs text-muted-foreground">No confident match yet.</p>
        ) : (
          <ul className="space-y-2">
            {mutation.data.matches.map((match) => (
              <li key={match.candidate.id} className="rounded-sm bg-secondary p-2 text-xs">
                <p className="font-semibold">
                  {match.candidate.title} · {match.confidenceScore}%
                </p>
                <p className="text-muted-foreground">{match.reasons.join(" · ")}</p>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

function ClaimDialog({
  target,
  onClose,
}: {
  target: { id: string; title: string } | null;
  onClose: () => void;
}) {
  const submitClaim = useServerFn(claimItem);
  const [message, setMessage] = useState("");
  const mutation = useMutation({
    mutationFn: () => submitClaim({ data: { foundItemId: target!.id, message } }),
    onSuccess: () => {
      toast.success("Claim sent to the finder.");
      setMessage("");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Claim “{target?.title}”</DialogTitle>
          <DialogDescription>
            Describe something only the owner would know. The finder decides whether to release
            contact details.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="claim-message">Proof of ownership</Label>
          <Textarea
            id="claim-message"
            rows={4}
            maxLength={1000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Blue sticker on the back, lock screen shows a photo of my dog…"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || message.trim().length < 2}>
            Send claim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
