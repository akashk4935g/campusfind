import { Link, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Menu, Pin } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const publicLinks = [
  { to: "/lost-found", label: "Lost & Found" },
  { to: "/resources", label: "Resource Shelf" },
];

const privateLinks = [
  { to: "/report/lost", label: "Report" },
  { to: "/activity", label: "My Activity" },
];

export function SiteHeader() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const links = user ? [...publicLinks, ...privateLinks] : publicLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-sm bg-primary text-primary-foreground">
            <Pin className="size-4" />
          </span>
          <span className="pin-label text-2xl leading-none">CampusFind</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {!loading && user ? (
            <>
              <Button asChild variant="ghost" size="icon" aria-label="Notifications">
                <Link to="/notifications">
                  <Bell className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-1 size-3.5" /> Sign out
              </Button>
            </>
          ) : null}
          {!loading && !user ? (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open menu"
            onClick={() => setOpen((value) => !value)}
          >
            <Menu className="size-4" />
          </Button>
        </div>
      </div>

      <div className={cn("border-t border-border px-4 pb-3 md:hidden", open ? "block" : "hidden")}>
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={() => setOpen(false)}
            className="block py-2 text-sm font-medium text-muted-foreground"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>CampusFind — the campus noticeboard, digitised.</p>
        <p>Contact details stay private until a match is approved.</p>
      </div>
    </footer>
  );
}
