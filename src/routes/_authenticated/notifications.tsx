import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BellRing } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getNotifications, markNotificationsRead } from "@/lib/campus.functions";

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
            <li key={item.id} className="notice-card flex gap-3 rounded-sm p-4">
              <BellRing className="mt-1 size-4 shrink-0 text-primary" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{item.title}</p>
                  {!item.read ? <Badge className="bg-primary">New</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">{item.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
