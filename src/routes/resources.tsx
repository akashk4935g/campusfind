import { queryOptions, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { BentoGrid, bentoSize } from "@/components/bento-grid";
import { UnlistButton } from "@/components/unlist-button";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { getResources, requestBorrow } from "@/lib/campus.functions";

function resourcesQuery(includeSamples: boolean) {
  return queryOptions({
    queryKey: ["resources", includeSamples],
    queryFn: () => getResources({ data: { includeSamples } }),
  });
}

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resource Shelf — Borrow & Lend on Campus | CampusFind" },
      {
        name: "description",
        content:
          "Borrow calculators, lab kits, textbooks and more from students on your campus, or lend out what you are not using this term.",
      },
      { property: "og:title", content: "Resource Shelf — Borrow & Lend on Campus" },
      {
        property: "og:description",
        content: "Borrow and lend books, lab kits, and gear with students on your campus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(resourcesQuery(true)),
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-3xl">The shelf didn't load</h1>
      <p className="mt-2 text-sm text-muted-foreground">Refresh to try again.</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-3xl">Nothing on the shelf</h1>
    </div>
  ),
  component: ResourcesPage,
});

function ResourcesPage() {
  const { user } = useAuth();
  const signedIn = Boolean(user);
  const { data } = useSuspenseQuery(resourcesQuery(!signedIn));
  const [target, setTarget] = useState<{ id: string; title: string } | null>(null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl">Resource shelf</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Spare calculators, lab coats, and textbooks that other students are happy to lend.
          </p>
        </div>
        {user ? (
          <Button asChild className="rounded-full">
            <Link to="/report/resource">Lend something</Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/auth">Sign in to lend</Link>
          </Button>
        )}
      </div>

      {data.resources.length === 0 ? (
        <div className="tile mt-8 p-10 text-center text-sm text-muted-foreground">
          The shelf is empty. Be the first to lend something.
        </div>
      ) : (
        <BentoGrid className="mt-8">
          {data.resources.map((item, index) => (
            <ItemCard
              key={item.id}
              kind="resource"
              size={bentoSize(index)}
              title={item.title}
              description={item.description}
              category={item.category}
              location={item.item_condition}
              status={item.availability}
              imagePath={item.image_url}
              sample={item.is_sample}
              footer={
                user ? (
                  item.owner_id === user.id ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="tag border-transparent bg-secondary text-secondary-foreground">
                          Your listing
                        </span>
                        <UnlistButton itemType="resource" itemId={item.id} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <Link to="/activity" className="underline">
                          Review requests
                        </Link>{" "}
                        for this item.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        size="sm"
                        disabled={item.availability !== "available" || item.is_sample}
                        onClick={() => setTarget({ id: item.id, title: item.title })}
                      >
                        {item.is_sample
                          ? "Demo listing"
                          : item.availability === "available"
                            ? "Request to borrow"
                            : "Currently lent out"}
                      </Button>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-muted-foreground">
                    <Link to="/auth" className="underline">
                      Sign in
                    </Link>{" "}
                    to request this item.
                  </p>
                )
              }
            />
          ))}
        </BentoGrid>
      )}

      <BorrowDialog target={target} onClose={() => setTarget(null)} />
    </div>
  );
}

function BorrowDialog({
  target,
  onClose,
}: {
  target: { id: string; title: string } | null;
  onClose: () => void;
}) {
  const submit = useServerFn(requestBorrow);
  const [message, setMessage] = useState("");
  const [duration, setDuration] = useState("1 week");

  const mutation = useMutation({
    mutationFn: () =>
      submit({ data: { resourceId: target!.id, message, requestedDuration: duration } }),
    onSuccess: () => {
      toast.success("Request sent to the lender.");
      setMessage("");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Borrow “{target?.title}”</DialogTitle>
          <DialogDescription>
            The lender approves each request before any contact details are shared.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="duration">How long do you need it?</Label>
            <Input
              id="duration"
              maxLength={40}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="borrow-message">Message</Label>
            <Textarea
              id="borrow-message"
              rows={4}
              maxLength={1000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="I need it for the Thursday lab session…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || message.trim().length < 2 || duration.trim().length < 2}
          >
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
