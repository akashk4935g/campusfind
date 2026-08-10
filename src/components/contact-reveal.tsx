import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock, Unlock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { revealContact } from "@/lib/campus.functions";

interface ContactRevealProps {
  itemType: "lost" | "found" | "resource";
  itemId: string;
}

export function ContactReveal({ itemType, itemId }: ContactRevealProps) {
  const reveal = useServerFn(revealContact);
  const mutation = useMutation({
    mutationFn: () => reveal({ data: { itemType, itemId } }),
  });

  if (mutation.data?.contactInfo) {
    return (
      <p className="inline-flex items-center gap-2 text-sm font-medium">
        <Unlock className="size-3.5 text-found" /> {mutation.data.contactInfo}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        <Lock className="mr-1 size-3.5" />
        {mutation.isPending ? "Checking…" : "Show contact"}
      </Button>
      {mutation.data?.reason ? (
        <p className="text-xs text-muted-foreground">{mutation.data.reason}</p>
      ) : null}
      {mutation.isError ? (
        <p className="text-xs text-destructive">Could not check access right now.</p>
      ) : null}
    </div>
  );
}
