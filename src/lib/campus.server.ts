import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { rankMatches, type MatchableItem, type MatchResult } from "./matching.server";

export type AuthedClient = SupabaseClient<Database>;

/** Read-only client used for the public board. Never sees user sessions. */
export function createPublicClient(): SupabaseClient<Database> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Backend is not configured yet.");

  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

const LOST_COLUMNS =
  "id, reporter_id, title, description, category, location_lost, date_lost, image_url, status, created_at, is_sample";
const FOUND_COLUMNS =
  "id, finder_id, title, description, category, location_found, date_found, image_url, status, created_at, is_sample";
const RESOURCE_COLUMNS =
  "id, owner_id, title, description, category, item_condition, availability, image_url, created_at, is_sample";

export interface PublicLostItem {
  id: string;
  reporter_id: string;
  title: string;
  description: string;
  category: string;
  location_lost: string;
  date_lost: string;
  image_url: string | null;
  status: string;
  created_at: string;
  is_sample: boolean;
}

export interface PublicFoundItem {
  id: string;
  finder_id: string;
  title: string;
  description: string;
  category: string;
  location_found: string;
  date_found: string;
  image_url: string | null;
  status: string;
  created_at: string;
  is_sample: boolean;
}

export interface PublicResource {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  item_condition: string;
  availability: string;
  image_url: string | null;
  created_at: string;
  is_sample: boolean;
}

export async function fetchLostItems(limit = 60, includeSamples = false): Promise<PublicLostItem[]> {
  const supabase = createPublicClient();
  let query = supabase.from("lost_items").select(LOST_COLUMNS);
  if (!includeSamples) query = query.eq("is_sample", false);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as PublicLostItem[];
}

export async function fetchFoundItems(limit = 60, includeSamples = false): Promise<PublicFoundItem[]> {
  const supabase = createPublicClient();
  let query = supabase.from("found_items").select(FOUND_COLUMNS);
  if (!includeSamples) query = query.eq("is_sample", false);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as PublicFoundItem[];
}

export async function fetchResources(limit = 60, includeSamples = false): Promise<PublicResource[]> {
  const supabase = createPublicClient();
  let query = supabase.from("resource_listings").select(RESOURCE_COLUMNS);
  if (!includeSamples) query = query.eq("is_sample", false);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as PublicResource[];
}

/** Counts always exclude tutorial samples so the numbers stay honest. */
export async function fetchBoardStats() {
  const supabase = createPublicClient();
  const [lost, found, resources, resolved] = await Promise.all([
    supabase.from("lost_items").select("id", { count: "exact", head: true }).eq("is_sample", false),
    supabase.from("found_items").select("id", { count: "exact", head: true }).eq("is_sample", false),
    supabase
      .from("resource_listings")
      .select("id", { count: "exact", head: true })
      .eq("is_sample", false),
    supabase
      .from("found_items")
      .select("id", { count: "exact", head: true })
      .eq("is_sample", false)
      .eq("status", "claimed"),
  ]);

  return {
    lostCount: lost.count ?? 0,
    foundCount: found.count ?? 0,
    resourceCount: resources.count ?? 0,
    reunitedCount: resolved.count ?? 0,
  };
}


/** Turns auth claims into a friendly display name (Google name, else email prefix). */
export function displayNameFromClaims(claims: Record<string, unknown>): string {
  const meta = (claims["user_metadata"] ?? {}) as Record<string, unknown>;
  const candidate =
    (typeof meta["full_name"] === "string" && meta["full_name"]) ||
    (typeof meta["name"] === "string" && meta["name"]) ||
    "";
  if (candidate.trim()) return candidate.trim().slice(0, 80);
  const email = typeof claims["email"] === "string" ? claims["email"] : "";
  const local = email.split("@")[0] ?? "";
  if (!local) return "Student";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 80);
}

/** Dashboard counters. Runs on the caller's own client so RLS scopes every count. */
export async function fetchDashboardSummary(supabase: AuthedClient, userId: string) {
  const headCount = (promise: PromiseLike<{ count: number | null }>) =>
    Promise.resolve(promise).then((result) => result.count ?? 0);

  const [
    lostCount,
    foundCount,
    resourceCount,
    pendingClaims,
    pendingBorrows,
    unreadAlerts,
    reunited,
    myClaimsPending,
  ] = await Promise.all([
    headCount(supabase.from("lost_items").select("id", { count: "exact", head: true }).eq("reporter_id", userId)),
    headCount(supabase.from("found_items").select("id", { count: "exact", head: true }).eq("finder_id", userId)),
    headCount(supabase.from("resource_listings").select("id", { count: "exact", head: true }).eq("owner_id", userId)),
    headCount(
      supabase
        .from("item_claims")
        .select("id, found_items!inner(finder_id)", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("found_items.finder_id", userId),
    ),
    headCount(
      supabase
        .from("borrow_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("lender_id", userId),
    ),
    headCount(
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false),
    ),
    headCount(
      supabase
        .from("found_items")
        .select("id", { count: "exact", head: true })
        .eq("finder_id", userId)
        .eq("status", "claimed"),
    ),
    headCount(
      supabase
        .from("item_claims")
        .select("id", { count: "exact", head: true })
        .eq("claimant_id", userId)
        .eq("status", "pending"),
    ),
  ]);

  return {
    lostCount,
    foundCount,
    resourceCount,
    pendingClaims,
    pendingBorrows,
    unreadAlerts,
    reunited,
    myClaimsPending,
  };
}

/** Every write path calls this so the reporter always has a profile row. */
export async function ensureProfile(supabase: AuthedClient, userId: string, fallbackName?: string) {
  const { data } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (data) return;
  const { error } = await supabase
    .from("profiles")
    .insert({ id: userId, full_name: fallbackName?.trim() || "Student" });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
}

export async function upsertItemContact(
  supabase: AuthedClient,
  userId: string,
  itemType: "lost" | "found" | "resource",
  itemId: string,
  contactInfo: string,
) {
  const { error } = await supabase
    .from("item_contacts")
    .upsert(
      { item_type: itemType, item_id: itemId, owner_id: userId, contact_info: contactInfo },
      { onConflict: "item_type,item_id" },
    );
  if (error) throw new Error(error.message);
}

/** Notifications are server-created only; users have no insert rights. */
export async function notify(userId: string, kind: string, title: string, body: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("notifications").insert({ user_id: userId, kind, title, body });
}

export async function suggestMatches(
  itemId: string,
  itemType: "lost" | "found",
): Promise<MatchResult[]> {
  const supabase = createPublicClient();

  if (itemType === "lost") {
    const { data: target } = await supabase
      .from("lost_items")
      .select(LOST_COLUMNS)
      .eq("id", itemId)
      .maybeSingle();
    if (!target) return [];
    const { data: candidates } = await supabase
      .from("found_items")
      .select(FOUND_COLUMNS)
      .eq("is_sample", false)
      .neq("status", "claimed")
      .limit(200);
    return rankMatches(toMatchable(target as PublicLostItem), (candidates ?? []).map((row) => toMatchable(row as PublicFoundItem)));
  }

  const { data: target } = await supabase
    .from("found_items")
    .select(FOUND_COLUMNS)
    .eq("id", itemId)
    .maybeSingle();
  if (!target) return [];
  const { data: candidates } = await supabase
    .from("lost_items")
    .select(LOST_COLUMNS)
    .eq("is_sample", false)
    .neq("status", "resolved")
    .limit(200);

  return rankMatches(toMatchable(target as PublicFoundItem), (candidates ?? []).map((row) => toMatchable(row as PublicLostItem)));
}

function toMatchable(row: PublicLostItem | PublicFoundItem): MatchableItem {
  const location = "location_lost" in row ? row.location_lost : row.location_found;
  const date = "date_lost" in row ? row.date_lost : row.date_found;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    location,
    date,
  };
}

/**
 * Contact details are only released to the item owner, an approved
 * counterparty, or an admin. Every check runs against the caller's own
 * RLS-scoped client before the value is read.
 */
export async function resolveContactAccess(
  supabase: AuthedClient,
  userId: string,
  itemType: "lost" | "found" | "resource",
  itemId: string,
): Promise<boolean> {
  const { data: contact } = await supabase
    .from("item_contacts")
    .select("id")
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle();
  if (contact) return true; // owner or admin: RLS allowed the read

  if (itemType === "found") {
    const { data: claim } = await supabase
      .from("item_claims")
      .select("id")
      .eq("found_item_id", itemId)
      .eq("claimant_id", userId)
      .eq("status", "approved")
      .maybeSingle();
    return Boolean(claim);
  }

  if (itemType === "resource") {
    const { data: request } = await supabase
      .from("borrow_requests")
      .select("id")
      .eq("resource_id", itemId)
      .eq("requester_id", userId)
      .in("status", ["approved", "returned"])
      .maybeSingle();
    return Boolean(request);
  }

  return false;
}

export async function readContact(
  itemType: "lost" | "found" | "resource",
  itemId: string,
): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("item_contacts")
    .select("contact_info")
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle();
  return data?.contact_info ?? null;
}

export async function isAdmin(supabase: AuthedClient, userId: string): Promise<boolean> {
  // Reads the caller's own role rows under RLS ("Users read own roles").
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}
