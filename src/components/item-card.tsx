import { CalendarDays, MapPin } from "lucide-react";
import type { ReactNode } from "react";

import { useSignedPhoto } from "@/hooks/useSignedPhoto";
import { cn } from "@/lib/utils";

export type ItemKind = "lost" | "found" | "resource";
export type ItemCardSize = "standard" | "wide" | "tall";

interface ItemCardProps {
  kind: ItemKind;
  title: string;
  description: string;
  category: string;
  location?: string | null;
  date?: string | null;
  status?: string | null;
  imagePath?: string | null;
  sample?: boolean;
  size?: ItemCardSize;
  footer?: ReactNode;
}

const kindLabel: Record<ItemKind, string> = {
  lost: "Lost",
  found: "Found",
  resource: "Free to borrow",
};

const dotClass: Record<ItemKind, string> = {
  lost: "bg-primary",
  found: "bg-found",
  resource: "bg-tape",
};

const sizeClass: Record<ItemCardSize, string> = {
  standard: "",
  wide: "sm:col-span-2",
  tall: "sm:row-span-2",
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
  sample,
  size = "standard",
  footer,
}: ItemCardProps) {
  const photo = useSignedPhoto(imagePath);

  return (
    <article className={cn("notice-card flex flex-col overflow-hidden", sizeClass[size])}>
      {photo ? (
        <img
          src={photo}
          alt={`Photo of ${title}`}
          loading="lazy"
          className={cn("w-full object-cover", size === "tall" ? "h-56" : "h-36")}
        />
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tag border-transparent bg-secondary text-secondary-foreground">
            <span className={cn("size-1.5 rounded-full", dotClass[kind])} />
            {kindLabel[kind]}
          </span>
          {status ? (
            <span className="tag capitalize text-muted-foreground">{status}</span>
          ) : null}
          {sample ? (
            <span className="tag border-transparent iridescent text-foreground">Sample</span>
          ) : null}
        </div>

        <div className="min-w-0">
          <h3
            className={cn(
              "truncate leading-tight",
              size === "wide" || size === "tall" ? "text-3xl" : "text-2xl",
            )}
          >
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{category}</p>
        </div>

        <p className="line-clamp-3 text-sm text-muted-foreground">{description}</p>

        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {location ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="size-3 shrink-0" /> <span className="truncate">{location}</span>
            </span>
          ) : null}
          {date ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3 shrink-0" /> {date}
            </span>
          ) : null}
        </div>

        {footer ? <div className="pt-1">{footer}</div> : null}
      </div>
    </article>
  );
}
