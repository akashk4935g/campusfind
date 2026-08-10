import { Link } from "@tanstack/react-router";
import { Camera, ClipboardList, PackageSearch, Sparkles } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    title: "1 · Post it",
    body: "Tap Post → “I lost something” or “I found something”, then fill in the item, spot and date.",
  },
  {
    icon: Camera,
    title: "2 · Add a photo",
    body: "Attach one picture from your camera roll. Photos stay private — only signed-in students see them.",
  },
  {
    icon: Sparkles,
    title: "3 · Let matching run",
    body: "Hit “Find matches” on any post and we score category, keywords and location for you.",
  },
  {
    icon: PackageSearch,
    title: "4 · Hand it over",
    body: "Approve a claim and only then do contact details unlock. Nothing public before that.",
  },
];

/** Signed-out only: the sample listings below double as a walkthrough. */
export function TutorialStrip() {
  return (
    <section className="tile overflow-hidden">
      <div className="iridescent px-5 py-4">
        <p className="pin-label">Demo mode</p>
        <h2 className="mt-1 text-3xl">The posts below are samples — here's how to make your own</h2>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <div key={step.title} className="min-w-0">
            <step.icon className="size-4 shrink-0 text-primary" />
            <p className="mt-2 text-sm font-semibold">{step.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </div>
      <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
        Samples disappear the moment you{" "}
        <Link to="/auth" className="font-semibold underline">
          sign in
        </Link>{" "}
        — your board starts clean.
      </p>
    </section>
  );
}
