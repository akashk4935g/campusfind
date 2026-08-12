import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, Check, HandHeart, PackageSearch, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getNotifications, markNotificationRead, markNotificationsRead } from "@/lib/campus.functions";
import { cn } from "@/lib/utils";

const notificationsQuery = queryOptions({
  queryKey: ["notifications"],
  queryFn: () => getNotifications(),
});

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — CampusFind" },
      {
        name: "description",
        content:
          "See match alerts, claims on your found items, and borrow request updates from across your campus.",
      },
      { property: "og:title", content: "Notifications — CampusFind" },
      {
        property: "og:description",
        content: "Match alerts, claims, and borrow updates for your CampusFind account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data } = useSuspenseQuery(notificationsQuery);
  const queryClient = useQueryClient();
  const markRead = useServerFn(markNotificationsRead);
  const markOne = useServerFn(markNotificationRead);

  const oneMutation = useMutation({
    mutationFn: (id: string) => markOne({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const mutation = useMutation({
    mutationFn: () => markRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = data.notifications.filter((item) => !item.read).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl">Notifications</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread update${unread > 1 ? "s" : ""}` : "You're all caught up."}
          </p>
        </div>
        {unread > 0 ? (
          <Button variant="outline" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Mark all read
          </Button>
        ) : null}
      </div>

      {data.notifications.length === 0 ? (
        <div className="notice-card mt-8 rounded-sm p-10 text-center text-sm text-muted-foreground">
          Nothing yet. Match alerts and claim updates will show up here.
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {data.notifications.map((item) => (
            <li
              key={item.id}
              className={cn(
                "notice-card flex gap-3 rounded-sm p-4",
                item.read ? "opacity-70" : "ring-1 ring-primary/30",
              )}
            >
              <KindIcon kind={item.kind} />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{item.title}</p>
                  {!item.read ? <Badge className="bg-primary">New</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">{item.body}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                  {!item.read ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => oneMutation.mutate(item.id)}
                      disabled={oneMutation.isPending}
                    >
                      <Check className="mr-1 size-3" /> Mark read
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KindIcon({ kind }: { kind: string }) {
  const Icon = kind === "claim" ? PackageSearch : kind === "borrow" ? HandHeart : kind === "match" ? Sparkles : BellRing;
  return <Icon className="mt-1 size-4 shrink-0 text-primary" />;
}
