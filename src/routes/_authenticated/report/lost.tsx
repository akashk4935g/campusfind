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
import { createLostItem } from "@/lib/campus.functions";

export const Route = createFileRoute("/_authenticated/report/lost")({
  head: () => ({
    meta: [
      { title: "Report a Lost Item — CampusFind" },
      {
        name: "description",
        content:
          "Pin a lost item to the campus board and let CampusFind score likely matches against everything students have handed in.",
      },
      { property: "og:title", content: "Report a Lost Item — CampusFind" },
      {
        property: "og:description",
        content: "Pin a lost item to the campus board and get matched with found reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportLostPage,
});

function ReportLostPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submit = useServerFn(createLostItem);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Other",
    locationLost: "",
    dateLost: new Date().toISOString().slice(0, 10),
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
          ? `Report pinned — ${result.matches.length} possible match found.`
          : "Report pinned to the board.",
      );
      queryClient.invalidateQueries();
      navigate({ to: "/activity" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-5xl">Report a lost item</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your contact details are stored separately and only released when you approve a match.
      </p>

      <Card className="notice-card mt-8">
        <CardHeader>
          <CardTitle>Item details</CardTitle>
          <CardDescription>The more specific the description, the better the matching.</CardDescription>
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
              <Label htmlFor="title">What did you lose?</Label>
              <Input
                id="title"
                required
                maxLength={120}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Black JBL earbuds case"
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
                <Label htmlFor="date">When did you lose it?</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  value={form.dateLost}
                  onChange={(event) => setForm({ ...form, dateLost: event.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Where did you last see it?</Label>
              <Input
                id="location"
                required
                maxLength={120}
                value={form.locationLost}
                onChange={(event) => setForm({ ...form, locationLost: event.target.value })}
                placeholder="Library second floor, near the printers"
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
                placeholder="Scratched lid, sticker of a red panda, charging cable inside."
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
                placeholder="WhatsApp 98765 43210"
              />
              <p className="text-xs text-muted-foreground">
                Never shown on the public board — only released after you approve a claim.
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
              {mutation.isPending ? "Pinning…" : "Pin to the board"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
