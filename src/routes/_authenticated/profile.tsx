import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getDashboard, getMe, saveProfile } from "@/lib/campus.functions";

const meQuery = queryOptions({ queryKey: ["me"], queryFn: () => getMe() });
const dashboardQuery = queryOptions({ queryKey: ["dashboard"], queryFn: () => getDashboard() });

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — CampusFind" },
      {
        name: "description",
        content:
          "Update your name, campus, and the contact details CampusFind shares only after you approve a claim or borrow request.",
      },
      { property: "og:title", content: "Your Profile — CampusFind" },
      {
        property: "og:description",
        content: "Manage your name, campus, and private contact details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: dashboard } = useSuspenseQuery(dashboardQuery);
  const queryClient = useQueryClient();
  const router = useRouter();

  const [fullName, setFullName] = useState(me.profile?.full_name ?? "");
  const [campus, setCampus] = useState(me.profile?.campus ?? "");
  const [contactInfo, setContactInfo] = useState(me.profile?.contact_info ?? "");

  const save = useServerFn(saveProfile);
  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          fullName: fullName.trim(),
          campus: campus.trim() || null,
          contactInfo: contactInfo.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Profile saved.");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const initials = (me.profile?.full_name ?? "S")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <section className="tile relative overflow-hidden p-6 sm:p-8">
        <div className="iridescent pointer-events-none absolute -left-20 -top-24 size-64 rounded-full opacity-40 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <span className="iridescent grid size-16 place-items-center rounded-full font-display text-2xl text-foreground">
            {initials}
          </span>
          <div className="min-w-0">
            <h1 className="text-4xl leading-none">{me.profile?.full_name ?? "Student"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {me.email}
              {me.profile?.campus ? ` · ${me.profile.campus}` : ""}
            </p>
            {me.profile?.created_at ? (
              <p className="text-xs text-muted-foreground">
                Member since {new Date(me.profile.created_at).toLocaleDateString()}
              </p>
            ) : null}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button size="sm" variant="ghost" onClick={handleSignOut}>
              <LogOut className="mr-1 size-3.5" /> Sign out
            </Button>
          </div>
        </div>

        <dl className="relative mt-6 grid grid-cols-3 gap-3 text-center">
          <Mini label="Lost posts" value={dashboard.summary.lostCount} />
          <Mini label="Found posts" value={dashboard.summary.foundCount} />
          <Mini label="Listings" value={dashboard.summary.resourceCount} />
        </dl>
      </section>

      <section className="tile mt-4 p-6 sm:p-8">
        <h2 className="text-2xl leading-none">Details</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your contact details are stored apart from public posts and revealed only after you
          approve a claim or borrow request.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              value={fullName}
              maxLength={80}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campus">Campus</Label>
            <Input
              id="campus"
              value={campus}
              maxLength={80}
              placeholder="North Campus, Block C"
              onChange={(event) => setCampus(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact">Contact details</Label>
            <Textarea
              id="contact"
              rows={3}
              maxLength={160}
              value={contactInfo}
              placeholder="WhatsApp 98xxxxxx10 · hostel room 214"
              onChange={(event) => setContactInfo(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={mutation.isPending || fullName.trim().length < 2}>
            {mutation.isPending ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-secondary p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-display text-3xl leading-none">{value}</dd>
    </div>
  );
}
