import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  boardQuerySchema,
  borrowDecisionSchema,
  borrowSchema,
  claimSchema,
  contactRequestSchema,
  decisionSchema,
  foundItemSchema,
  lostItemSchema,
  profileSchema,
  matchRequestSchema,
  notificationIdSchema,
  resourceSchema,
} from "./campus-schemas";
import {
  displayNameFromClaims,
  ensureProfile,
  fetchDashboardSummary,
  fetchBoardStats,
  fetchFoundItems,
  fetchLostItems,
  fetchResources,
  isAdmin,
  notify,
  readContact,
  resolveContactAccess,
  suggestMatches,
  upsertItemContact,
} from "./campus.server";

/* ---------------------------------- public --------------------------------- */

export const getBoard = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => boardQuerySchema.parse(input))
  .handler(async ({ data }) => {
    const [lost, found, resources, stats] = await Promise.all([
      fetchLostItems(60, data.includeSamples),
      fetchFoundItems(60, data.includeSamples),
      fetchResources(60, data.includeSamples),
      fetchBoardStats(),
    ]);
    return { lost, found, resources, stats };
  });

export const getLostAndFound = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => boardQuerySchema.parse(input))
  .handler(async ({ data }) => {
    const [lost, found] = await Promise.all([
      fetchLostItems(80, data.includeSamples),
      fetchFoundItems(80, data.includeSamples),
    ]);
    return { lost, found };
  });

export const getResources = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => boardQuerySchema.parse(input))

  .handler(async ({ data }) => {
    return { resources: await fetchResources(80, data.includeSamples) };
  });


/* --------------------------------- identity -------------------------------- */

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureProfile(context.supabase, context.userId, displayNameFromClaims(context.claims as Record<string, unknown>));
    const [{ data: profile }, admin] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, full_name, campus, contact_info, avatar_url, created_at")
        .eq("id", context.userId)
        .maybeSingle(),
      isAdmin(context.supabase, context.userId),
    ]);
    return {
      profile,
      isAdmin: admin,
      userId: context.userId,
      email: String((context.claims as Record<string, unknown>)["email"] ?? ""),
    };
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureProfile(
      context.supabase,
      context.userId,
      displayNameFromClaims(context.claims as Record<string, unknown>),
    );

    const [{ data: profile }, summary, admin, { data: alerts }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, full_name, campus, contact_info, avatar_url, created_at")
        .eq("id", context.userId)
        .maybeSingle(),
      fetchDashboardSummary(context.supabase, context.userId),
      isAdmin(context.supabase, context.userId),
      context.supabase
        .from("notifications")
        .select("id, kind, title, body, read, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    return { profile, summary, isAdmin: admin, alerts: alerts ?? [] };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureProfile(context.supabase, context.userId, data.fullName);
    const { error } = await context.supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        campus: data.campus ?? null,
        contact_info: data.contactInfo ?? null,
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------- reporting -------------------------------- */

export const createLostItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => lostItemSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureProfile(context.supabase, context.userId, displayNameFromClaims(context.claims as Record<string, unknown>));
    const { data: row, error } = await context.supabase
      .from("lost_items")
      .insert({
        reporter_id: context.userId,
        title: data.title,
        description: data.description,
        category: data.category,
        location_lost: data.locationLost,
        date_lost: data.dateLost,
        image_url: data.imagePath ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await upsertItemContact(context.supabase, context.userId, "lost", row.id, data.contactInfo);
    const matches = await suggestMatches(row.id, "lost");
    if (matches.length > 0) {
      await notify(
        context.userId,
        "match",
        `${matches.length} possible match${matches.length > 1 ? "es" : ""} found`,
        `We found found-item reports that look like your "${data.title}".`,
      );
    }
    return { id: row.id, matches };
  });

export const createFoundItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => foundItemSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureProfile(context.supabase, context.userId, displayNameFromClaims(context.claims as Record<string, unknown>));
    const { data: row, error } = await context.supabase
      .from("found_items")
      .insert({
        finder_id: context.userId,
        title: data.title,
        description: data.description,
        category: data.category,
        location_found: data.locationFound,
        date_found: data.dateFound,
        image_url: data.imagePath ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await upsertItemContact(context.supabase, context.userId, "found", row.id, data.contactInfo);
    const matches = await suggestMatches(row.id, "found");
    return { id: row.id, matches };
  });

export const createResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resourceSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureProfile(context.supabase, context.userId, displayNameFromClaims(context.claims as Record<string, unknown>));
    const { data: row, error } = await context.supabase
      .from("resource_listings")
      .insert({
        owner_id: context.userId,
        title: data.title,
        description: data.description,
        category: data.category,
        item_condition: data.itemCondition,
        image_url: data.imagePath ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await upsertItemContact(context.supabase, context.userId, "resource", row.id, data.contactInfo);
    return { id: row.id };
  });

export const getMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => matchRequestSchema.parse(input))
  .handler(async ({ data }) => {
    return { matches: await suggestMatches(data.itemId, data.itemType) };
  });

/* ---------------------------------- claims -------------------------------- */

export const claimItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => claimSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureProfile(context.supabase, context.userId, displayNameFromClaims(context.claims as Record<string, unknown>));

    const { data: item } = await context.supabase
      .from("found_items")
      .select("id, title, finder_id, status")
      .eq("id", data.foundItemId)
      .maybeSingle();
    if (!item) throw new Error("That found item no longer exists.");
    if (item.finder_id === context.userId) throw new Error("You reported this item yourself.");
    if (item.status === "claimed") throw new Error("This item has already been handed over.");

    const { error } = await context.supabase.from("item_claims").insert({
      found_item_id: data.foundItemId,
      claimant_id: context.userId,
      lost_item_id: data.lostItemId ?? null,
      message: data.message,
    });
    if (error) throw new Error(error.message);

    await notify(
      item.finder_id,
      "claim",
      "New claim on your found item",
      `Someone says "${item.title}" belongs to them. Review the claim in your activity feed.`,
    );
    return { ok: true };
  });

export const decideClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => decisionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: claim } = await context.supabase
      .from("item_claims")
      .select("id, found_item_id, claimant_id, lost_item_id, found_items(finder_id, title)")
      .eq("id", data.id)
      .maybeSingle();
    if (!claim) throw new Error("Claim not found.");

    const finderId = (claim.found_items as { finder_id: string } | null)?.finder_id;
    const admin = await isAdmin(context.supabase, context.userId);
    if (finderId !== context.userId && !admin) throw new Error("You cannot decide this claim.");

    const { error } = await context.supabase
      .from("item_claims")
      .update({ status: data.decision, decided_by: context.userId, decided_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.decision === "approved") {
      await context.supabase
        .from("found_items")
        .update({ status: "claimed", claimed_by: claim.claimant_id, matched_lost_item_id: claim.lost_item_id })
        .eq("id", claim.found_item_id);
      if (claim.lost_item_id) {
        await context.supabase
          .from("lost_items")
          .update({ status: "resolved", matched_found_item_id: claim.found_item_id })
          .eq("id", claim.lost_item_id);
      }
    }

    const title = (claim.found_items as { title: string } | null)?.title ?? "your claim";
    await notify(
      claim.claimant_id,
      "claim",
      data.decision === "approved" ? "Claim approved" : "Claim declined",
      data.decision === "approved"
        ? `Your claim on "${title}" was approved. Contact details are now unlocked.`
        : `Your claim on "${title}" was declined.`,
    );
    return { ok: true };
  });

/* -------------------------------- borrowing ------------------------------- */

export const requestBorrow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => borrowSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureProfile(context.supabase, context.userId, displayNameFromClaims(context.claims as Record<string, unknown>));

    const { data: resource } = await context.supabase
      .from("resource_listings")
      .select("id, title, owner_id, availability")
      .eq("id", data.resourceId)
      .maybeSingle();
    if (!resource) throw new Error("That listing no longer exists.");
    if (resource.owner_id === context.userId) throw new Error("This is your own listing.");
    if (resource.availability !== "available") throw new Error("This item is not available right now.");

    const { error } = await context.supabase.from("borrow_requests").insert({
      resource_id: data.resourceId,
      requester_id: context.userId,
      lender_id: resource.owner_id,
      message: data.message,
      requested_duration: data.requestedDuration,
    });
    if (error) throw new Error(error.message);

    await notify(
      resource.owner_id,
      "borrow",
      "New borrow request",
      `Someone wants to borrow "${resource.title}" for ${data.requestedDuration}.`,
    );
    return { ok: true };
  });

export const decideBorrow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => borrowDecisionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: request } = await context.supabase
      .from("borrow_requests")
      .select("id, resource_id, requester_id, lender_id, resource_listings(title)")
      .eq("id", data.id)
      .maybeSingle();
    if (!request) throw new Error("Request not found.");

    const admin = await isAdmin(context.supabase, context.userId);
    if (request.lender_id !== context.userId && !admin) throw new Error("You cannot decide this request.");

    const { error } = await context.supabase
      .from("borrow_requests")
      .update({ status: data.decision })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await context.supabase
      .from("resource_listings")
      .update({ availability: data.decision === "approved" ? "lent" : "available" })
      .eq("id", request.resource_id);

    const title = (request.resource_listings as { title: string } | null)?.title ?? "the item";
    await notify(
      request.requester_id,
      "borrow",
      `Borrow request ${data.decision}`,
      `Your request for "${title}" was ${data.decision}.`,
    );
    return { ok: true };
  });

/* --------------------------------- activity ------------------------------- */

export const getMyActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const userId = context.userId;

    const [lost, found, resources, claimsMade, claimsReceived, borrowsMade, borrowsReceived] =
      await Promise.all([
        supabase.from("lost_items").select("id, title, category, status, date_lost, created_at").eq("reporter_id", userId).order("created_at", { ascending: false }),
        supabase.from("found_items").select("id, title, category, status, date_found, created_at").eq("finder_id", userId).order("created_at", { ascending: false }),
        supabase.from("resource_listings").select("id, title, category, availability, created_at").eq("owner_id", userId).order("created_at", { ascending: false }),
        supabase.from("item_claims").select("id, status, message, created_at, found_items(id, title)").eq("claimant_id", userId).order("created_at", { ascending: false }),
        supabase.from("item_claims").select("id, status, message, created_at, claimant_id, found_items!inner(id, title, finder_id)").eq("found_items.finder_id", userId).order("created_at", { ascending: false }),
        supabase.from("borrow_requests").select("id, status, message, requested_duration, created_at, resource_listings(id, title)").eq("requester_id", userId).order("created_at", { ascending: false }),
        supabase.from("borrow_requests").select("id, status, message, requested_duration, created_at, resource_listings(id, title)").eq("lender_id", userId).order("created_at", { ascending: false }),
      ]);

    return {
      lost: lost.data ?? [],
      found: found.data ?? [],
      resources: resources.data ?? [],
      claimsMade: claimsMade.data ?? [],
      claimsReceived: claimsReceived.data ?? [],
      borrowsMade: borrowsMade.data ?? [],
      borrowsReceived: borrowsReceived.data ?? [],
    };
  });

export const getNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notifications")
      .select("id, kind, title, body, read, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    return { notifications: data ?? [] };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", context.userId)
      .eq("read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => notificationIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------- contacts ------------------------------- */

export const revealContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => contactRequestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const allowed = await resolveContactAccess(
      context.supabase,
      context.userId,
      data.itemType,
      data.itemId,
    );
    if (!allowed) {
      return {
        contactInfo: null as string | null,
        reason: "Contact details unlock once the owner approves your claim or request.",
      };
    }
    return { contactInfo: await readContact(data.itemType, data.itemId), reason: null as string | null };
  });

/* ----------------------------------- admin -------------------------------- */

export const getAdminQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await isAdmin(context.supabase, context.userId);
    if (!admin) throw new Error("Admins only.");

    const [claims, borrows, lost, found] = await Promise.all([
      context.supabase.from("item_claims").select("id, status, message, created_at, found_items(id, title)").eq("status", "pending").order("created_at", { ascending: false }),
      context.supabase.from("borrow_requests").select("id, status, message, requested_duration, created_at, resource_listings(id, title)").eq("status", "pending").order("created_at", { ascending: false }),
      context.supabase.from("lost_items").select("id, title, status, created_at").order("created_at", { ascending: false }).limit(40),
      context.supabase.from("found_items").select("id, title, status, created_at").order("created_at", { ascending: false }).limit(40),
    ]);

    return {
      claims: claims.data ?? [],
      borrows: borrows.data ?? [],
      lost: lost.data ?? [],
      found: found.data ?? [],
    };
  });
