import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { uploadItemPhoto } from "@/hooks/useSignedPhoto";
import { CATEGORIES } from "@/lib/campus-schemas";
import { createFoundItem } from "@/lib/campus.functions";

export const Route = createFileRoute("/_authenticated/report/found")({
  head: () => ({
    meta: [
      { title: "Report a Found Item — CampusFind" },
      {
        name: "description",
        content:
          "Hand in something you found on campus. CampusFind matches it against open lost reports and lets you vet claims before sharing contact details.",
      },
      { property: "og:title", content: "Report a Found Item — CampusFind" },
      {
        property: "og:description",
        content: "Post what you found and let CampusFind match it to its owner.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportFoundPage,
});

function ReportFoundPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submit = useServerFn(createFoundItem);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Other",
    locationFound: "",
    dateFound: new Date().toISOString().slice(0, 10),
    contactInfo: "",
  });
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const imagePath = file && user ? await uploadItemPhoto(file, user.id) : null;
      return submit({ data: { ...form, category: form.category as (typeof CATEGORIES)[number], imagePath } });
    },
    onSuccess: (result) => {
      toast.success(
        result.matches.length > 0
          ? `Posted — ${result.matches.length} open lost report looks similar.`
          : "Posted to the board.",
      );
      queryClient.invalidateQueries();
      navigate({ to: "/activity" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-5xl">Report a found item</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Keep identifying details vague in the public description — you can verify claimants privately.
      </p>

      <Card className="notice-card mt-8">
        <CardHeader>
          <CardTitle>Item details</CardTitle>
          <CardDescription>You decide which claim to approve.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="title">What did you find?</Label>
              <Input
                id="title"
                required
                maxLength={120}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Student ID card"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) => setForm({ ...form, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">When did you find it?</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  value={form.dateFound}
                  onChange={(event) => setForm({ ...form, dateFound: event.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Where did you find it?</Label>
              <Input
                id="location"
                required
                maxLength={120}
                value={form.locationFound}
                onChange={(event) => setForm({ ...form, locationFound: event.target.value })}
                placeholder="Canteen, table by the window"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                maxLength={1000}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Handed to the security desk. Ask me for details to verify."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Private contact info</Label>
              <Input
                id="contact"
                required
                maxLength={160}
                value={form.contactInfo}
                onChange={(event) => setForm({ ...form, contactInfo: event.target.value })}
                placeholder="Email me at ..."
              />
              <p className="text-xs text-muted-foreground">
                Released only to a claimant you approve, or to a campus admin.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo">Photo (optional)</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Posting…" : "Post to the board"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
