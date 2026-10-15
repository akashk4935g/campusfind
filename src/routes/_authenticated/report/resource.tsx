import { useMutation } from "@tanstack/react-query";
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
import { RESOURCE_CATEGORIES } from "@/lib/campus-schemas";
import { createResource } from "@/lib/campus.functions";

export const Route = createFileRoute("/_authenticated/report/resource")({
  head: () => ({
    meta: [
      { title: "Lend a Resource — CampusFind" },
      {
        name: "description",
        content:
          "List a textbook, calculator, or lab kit on the campus resource shelf and approve borrow requests one by one.",
      },
      { property: "og:title", content: "Lend a Resource — CampusFind" },
      {
        property: "og:description",
        content: "List spare gear on the campus resource shelf and approve borrowers yourself.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LendResourcePage,
});

function LendResourcePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const submit = useServerFn(createResource);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Books",
    itemCondition: "Good",
    contactInfo: "",
  });
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const imagePath = file && user ? await uploadItemPhoto(file, user.id) : null;
      return submit({
        data: {
          ...form,
          category: form.category as (typeof RESOURCE_CATEGORIES)[number],
          imagePath,
        },
      });
    },
    onSuccess: () => {
      toast.success("Added to the resource shelf.");
      queryClient.invalidateQueries();
      navigate({ to: "/activity" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-5xl">Lend something</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every borrow request comes to you for approval before contact details are shared.
      </p>

      <Card className="notice-card mt-8">
        <CardHeader>
          <CardTitle>Listing details</CardTitle>
          <CardDescription>Set expectations up front — condition and how long you can spare it.</CardDescription>
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
              <Label htmlFor="title">What are you lending?</Label>
              <Input
                id="title"
                required
                maxLength={120}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Casio FX-991 scientific calculator"
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
                    {RESOURCE_CATEGORIES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Input
                  id="condition"
                  required
                  maxLength={40}
                  value={form.itemCondition}
                  onChange={(event) => setForm({ ...form, itemCondition: event.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                maxLength={1000}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Free until end of term. Pickup near the hostel gate."
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
              />
              <p className="text-xs text-muted-foreground">
                Shared only with borrowers you approve.
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
              {mutation.isPending ? "Adding…" : "Add to the shelf"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
