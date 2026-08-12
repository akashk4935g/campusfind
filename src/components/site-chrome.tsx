import { Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  ChevronDown,
  HandHeart,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  Search,
  UserRound,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getMe, getNotifications } from "@/lib/campus.functions";
import { cn } from "@/lib/utils";

const publicLinks = [
  { to: "/lost-found", label: "Board" },
  { to: "/resources", label: "Shelf" },
] as const;

const privateLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/activity", label: "Activity" },
] as const;

const postLinks = [
  { to: "/report/lost", label: "I lost something", icon: Search },
  { to: "/report/found", label: "I found something", icon: PackageSearch },
  { to: "/report/resource", label: "Lend a resource", icon: HandHeart },
] as const;

export function SiteHeader() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: alerts } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(),
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => getMe(),
    enabled: Boolean(user),
  });
  const unread = (alerts?.notifications ?? []).filter((item) => !item.read).length;
  const displayName = me?.profile?.full_name ?? "Account";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const links = user ? [...publicLinks, ...privateLinks] : publicLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 md:flex">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <img
            src={logoMark}
            alt="CampusFind logo"
            width={1024}
            height={1024}
            className="size-8 shrink-0"
          />
          <span className="truncate font-display text-2xl leading-none">CampusFind</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:ml-auto">
          <div className="hidden md:block">
            <PostMenu signedIn={Boolean(user)} />
          </div>
          {!loading && user ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
              >
                <Link to="/notifications" className="relative">
                  <Bell className="size-4" />
                  {unread > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  ) : null}
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="rounded-full pl-1">
                    <span className="iridescent mr-2 grid size-6 place-items-center rounded-full text-[10px] font-semibold text-foreground">
                      {initials || "?"}
                    </span>
                    <span className="hidden max-w-24 truncate sm:inline">{displayName}</span>
                    <ChevronDown className="ml-1 size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2">
                      <LayoutDashboard className="size-3.5 text-primary" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2">
                      <UserRound className="size-3.5 text-primary" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/activity" className="flex items-center gap-2">
                      <PackageSearch className="size-3.5 text-primary" /> My activity
                    </Link>
                  </DropdownMenuItem>
                  {me?.isAdmin ? (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2">
                        <HandHeart className="size-3.5 text-primary" /> Admin
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2">
                    <LogOut className="size-3.5" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null}
          {!loading && !user ? (
            <Button asChild size="sm" variant="outline" className="rounded-full">
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

      <div className={cn("border-t border-border px-4 pb-4 md:hidden", open ? "block" : "hidden")}>
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
        <div className="mt-2 space-y-1 border-t border-border pt-3">
          {user ? (
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block py-2 text-sm font-medium text-muted-foreground"
          >
            Profile
          </Link>
        ) : null}
        {postLinks.map((link) => (
            <Link
              key={link.to}
              to={user ? link.to : "/auth"}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 py-2 text-sm font-semibold"
            >
              <link.icon className="size-3.5 text-primary" /> {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

export function PostMenu({
  signedIn,
  className,
}: {
  signedIn: boolean;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className={cn("rounded-full", className)}>
          Post <ChevronDown className="ml-1 size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {postLinks.map((link) => (
          <DropdownMenuItem key={link.to} asChild>
            <Link to={signedIn ? link.to : "/auth"} className="flex items-center gap-2">
              <link.icon className="size-3.5 text-primary" /> {link.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2">
          <img
            src={logoMark}
            alt=""
            width={1024}
            height={1024}
            loading="lazy"
            className="size-5"
          />
          CampusFind — lost, found, lent.
        </p>
        <p>Contact details stay private until a match is approved.</p>
      </div>
    </footer>
  );
}
