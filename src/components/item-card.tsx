import { CalendarDays, MapPin } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { useSignedPhoto } from "@/hooks/useSignedPhoto";
import { cn } from "@/lib/utils";

export type ItemKind = "lost" | "found" | "resource";

interface ItemCardProps {
  kind: ItemKind;
  title: string;
  description: string;
  category: string;
  location?: string | null;
  date?: string | null;
  status?: string | null;
  imagePath?: string | null;
  footer?: ReactNode;
}

const kindLabel: Record<ItemKind, string> = {
  lost: "Lost",
  found: "Found",
  resource: "Available",
};

export function ItemCard({
  kind,
  title,
  description,
  category,
  location,
  date,
  status,
  imagePath,
  footer,
}: ItemCardProps) {
  const photo = useSignedPhoto(imagePath);

  return (
    <article className="notice-card flex flex-col rounded-sm">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <span
          className={cn(
            "pin-label rounded-sm px-2 py-0.5 text-sm",
            kind === "lost" && "bg-primary text-primary-foreground",
            kind === "found" && "bg-found text-found-foreground",
            kind === "resource" && "bg-tape text-tape-foreground",
          )}
        >
          {kindLabel[kind]}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl leading-tight">{title}</h3>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{category}</p>
        </div>
        {status ? (
          <Badge variant="outline" className="shrink-0 capitalize">
            {status}
          </Badge>
        ) : null}
      </div>

      {photo ? (
        <img
          src={photo}
          alt={`Photo of ${title}`}
          loading="lazy"
          className="h-40 w-full border-b border-border object-cover"
        />
      ) : null}

      <div className="flex-1 space-y-3 p-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" /> {location}
            </span>
          ) : null}
          {date ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3" /> {date}
            </span>
          ) : null}
        </div>
      </div>

      {footer ? <div className="border-t border-border p-4">{footer}</div> : null}
    </article>
  );
}
