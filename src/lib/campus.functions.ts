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
      .select("id, title, finder_id, status, is_listed, is_sample")
      .eq("id", data.foundItemId)
      .maybeSingle();
    if (!item || !item.is_listed) throw new Error("That found item is no longer listed.");
    if (item.is_sample) throw new Error("Demo items can't be claimed.");
    if (item.finder_id === context.userId) throw new Error("You reported this item yourself.");
    if (item.status === "claimed") throw new Error("This item has already been handed over.");

    const { data: existing } = await context.supabase
      .from("item_claims")
      .select("id")
      .eq("found_item_id", data.foundItemId)
      .eq("claimant_id", context.userId)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) throw new Error("You already have a pending claim on this item. Add more info from My activity.");

    const { data: claim, error } = await context.supabase
      .from("item_claims")
      .insert({
        found_item_id: data.foundItemId,
        claimant_id: context.userId,
        lost_item_id: data.lostItemId ?? null,
        message: data.message,
        where_when: data.whereWhen,
        identifying_details: data.identifyingDetails,
        proof_photo: data.proofPhoto ?? null,
      })
      .select("id")
      .single();
    if (error || !claim) throw new Error(error?.message ?? "Could not send claim.");

    await upsertItemContact(context.supabase, context.userId, "claim", claim.id, data.contactInfo);

    await notify(
      item.finder_id,
      "claim",
      "New claim on your found item",
      `Someone says "${item.title}" belongs to them. Review the claim in your activity feed.`,
    );
    return { ok: true };
  });

/** Loads a claim and confirms the caller is its finder (or an admin). */
async function loadClaimForFinder(supabase: AuthedClient, userId: string, claimId: string) {
  const { data: claim } = await supabase
    .from("item_claims")
    .select("id, status, found_item_id, claimant_id, lost_item_id, found_items(finder_id, title)")
    .eq("id", claimId)
    .maybeSingle();
  if (!claim) throw new Error("Claim not found.");
  const found = claim.found_items as { finder_id: string; title: string } | null;
  const admin = await isAdmin(supabase, userId);
  if (found?.finder_id !== userId && !admin) throw new Error("Only the finder can decide this claim.");
  return { claim, title: found?.title ?? "the item" };
}

export const decideClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => decisionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { claim, title } = await loadClaimForFinder(context.supabase, context.userId, data.id);
    if (claim.status !== "pending") throw new Error("This claim was already decided.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("item_claims")
      .update({
        status: data.decision,
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
        meeting_note: data.decision === "approved" ? data.meetingNote || null : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.decision === "approved") {
      // Any other pending claims on the same item are closed out.
      const { data: others } = await supabaseAdmin
        .from("item_claims")
        .update({ status: "rejected", decided_by: context.userId, decided_at: new Date().toISOString() })
        .eq("found_item_id", claim.found_item_id)
        .eq("status", "pending")
        .select("claimant_id");
      for (const other of others ?? []) {
        await notify(other.claimant_id, "claim", "Claim declined", `"${title}" was matched with someone else.`);
      }
      await supabaseAdmin
        .from("found_items")
        .update({ status: "matched", claimed_by: claim.claimant_id, matched_lost_item_id: claim.lost_item_id })
        .eq("id", claim.found_item_id);
    }

    await notify(
      claim.claimant_id,
      "claim",
      data.decision === "approved" ? "Claim approved" : "Claim declined",
      data.decision === "approved"
        ? `Your claim on "${title}" was approved. Open My activity to see the handover details and the finder's contact.`
        : `Your claim on "${title}" was declined.`,
    );
    return { ok: true };
  });

export const markHandedOver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => claimIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { claim, title } = await loadClaimForFinder(context.supabase, context.userId, data.id);
    if (claim.status !== "approved") throw new Error("Only approved claims can be handed over.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("item_claims").update({ status: "handed_over" }).eq("id", data.id);
    await supabaseAdmin.from("found_items").update({ status: "claimed" }).eq("id", claim.found_item_id);
    if (claim.lost_item_id) {
      await supabaseAdmin
        .from("lost_items")
        .update({ status: "resolved", matched_found_item_id: claim.found_item_id })
        .eq("id", claim.lost_item_id)
        .eq("reporter_id", claim.claimant_id);
    }
    await notify(claim.claimant_id, "claim", "Item handed over", `"${title}" is marked as returned to you. Contact details are now hidden.`);
    return { ok: true };
  });

export const addClaimMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => claimMessageSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: claim } = await context.supabase
      .from("item_claims")
      .select("id, status, claimant_id, found_items(finder_id, title)")
      .eq("id", data.claimId)
      .maybeSingle();
    if (!claim) throw new Error("Claim not found.");
    if (claim.status !== "pending") throw new Error("This claim is already decided.");
    const found = claim.found_items as { finder_id: string; title: string } | null;
    const isClaimant = claim.claimant_id === context.userId;
    if (!isClaimant && found?.finder_id !== context.userId) throw new Error("You are not part of this claim.");

    const { error } = await context.supabase
      .from("claim_messages")
      .insert({ claim_id: data.claimId, author_id: context.userId, body: data.body });
    if (error) throw new Error(error.message);

    const recipient = isClaimant ? found?.finder_id : claim.claimant_id;
    if (recipient) {
      await notify(
        recipient,
        "claim",
        isClaimant ? "More info on a claim" : "The finder has a question",
        `New message about "${found?.title ?? "an item"}". Reply from My activity.`,
      );
    }
    return { ok: true };
  });

/* --------------------------------- listings -------------------------------- */

export const setListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const table =
      data.itemType === "lost" ? "lost_items" : data.itemType === "found" ? "found_items" : "resource_listings";
    const ownerColumn =
      data.itemType === "lost" ? "reporter_id" : data.itemType === "found" ? "finder_id" : "owner_id";

    const { data: row, error } = await context.supabase
      .from(table)
      .update({ is_listed: data.listed })
      .eq("id", data.itemId)
      .eq(ownerColumn, context.userId)
      .select("id, title")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("You can only unlist your own posts.");

    if (!data.listed) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      if (data.itemType === "found") {
        const { data: cancelled } = await supabaseAdmin
          .from("item_claims")
          .update({ status: "cancelled" })
          .eq("found_item_id", data.itemId)
          .eq("status", "pending")
          .select("claimant_id");
        for (const c of cancelled ?? []) {
          await notify(c.claimant_id, "claim", "Claim cancelled", `"${row.title}" was unlisted by the finder.`);
        }
      }
      if (data.itemType === "resource") {
        const { data: cancelled } = await supabaseAdmin
          .from("borrow_requests")
          .update({ status: "cancelled" })
          .eq("resource_id", data.itemId)
          .eq("status", "pending")
          .select("requester_id");
        for (const r of cancelled ?? []) {
          await notify(r.requester_id, "borrow", "Request cancelled", `"${row.title}" was unlisted by the lender.`);
        }
      }
    }
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
      .select("id, status, resource_id, requester_id, lender_id, resource_listings(title)")
      .eq("id", data.id)
      .maybeSingle();
    if (!request) throw new Error("Request not found.");

    const admin = await isAdmin(context.supabase, context.userId);
    if (request.lender_id !== context.userId && !admin) throw new Error("Only the lender can decide this request.");
    if (data.decision === "returned" ? request.status !== "approved" : request.status !== "pending") {
      throw new Error("This request can't be changed that way.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("borrow_requests")
      .update({ status: data.decision })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.decision !== "rejected") {
      await supabaseAdmin
        .from("resource_listings")
        .update({ availability: data.decision === "approved" ? "lent" : "available" })
        .eq("id", request.resource_id);
    }

    const title = (request.resource_listings as { title: string } | null)?.title ?? "the item";
    await notify(
      request.requester_id,
      "borrow",
      `Borrow request ${data.decision}`,
      data.decision === "approved"
        ? `Your request for "${title}" was approved. Open My activity to see the lender's contact.`
        : `Your request for "${title}" was ${data.decision}.`,
    );
    return { ok: true };
  });

/* --------------------------------- activity ------------------------------- */

type Party = { name: string; contact: string | null };

export const getMyActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const userId = context.userId;
    const claimCols = "id, status, message, where_when, identifying_details, meeting_note, created_at, claimant_id";

    const [lost, found, resources, claimsMade, claimsReceived, borrowsMade, borrowsReceived] =
      await Promise.all([
        supabase.from("lost_items").select("id, title, category, status, date_lost, created_at, is_listed").eq("reporter_id", userId).order("created_at", { ascending: false }),
        supabase.from("found_items").select("id, title, category, status, date_found, created_at, is_listed").eq("finder_id", userId).order("created_at", { ascending: false }),
        supabase.from("resource_listings").select("id, title, category, availability, created_at, is_listed").eq("owner_id", userId).order("created_at", { ascending: false }),
        supabase.from("item_claims").select(`${claimCols}, found_items(id, title, finder_id)`).eq("claimant_id", userId).order("created_at", { ascending: false }),
        supabase.from("item_claims").select(`${claimCols}, found_items!inner(id, title, finder_id)`).eq("found_items.finder_id", userId).order("created_at", { ascending: false }),
        supabase.from("borrow_requests").select("id, status, message, requested_duration, created_at, lender_id, resource_listings(id, title)").eq("requester_id", userId).order("created_at", { ascending: false }),
        supabase.from("borrow_requests").select("id, status, message, requested_duration, created_at, requester_id, resource_listings(id, title)").eq("lender_id", userId).order("created_at", { ascending: false }),
      ]);

    const allClaims = [...(claimsMade.data ?? []), ...(claimsReceived.data ?? [])];
    const claimIds = allClaims.map((c) => c.id);
    const { data: messages } = claimIds.length
      ? await supabase.from("claim_messages").select("id, claim_id, author_id, body, created_at").in("claim_id", claimIds).order("created_at")
      : { data: [] as { id: string; claim_id: string; author_id: string; body: string; created_at: string }[] };

    // Handover details: only for approved claims/loans the caller is part of
    // (every row above was already scoped to the caller by RLS).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nameOf = async (id: string) => {
      const { data } = await supabaseAdmin.from("profiles").select("full_name, contact_info").eq("id", id).maybeSingle();
      return data;
    };
    const handovers: Record<string, Party> = {};
    for (const c of claimsMade.data ?? []) {
      if (c.status !== "approved") continue;
      const f = c.found_items as { id: string; finder_id: string } | null;
      if (!f) continue;
      const p = await nameOf(f.finder_id);
      handovers[c.id] = { name: p?.full_name ?? "Finder", contact: (await readContact("found", f.id)) ?? p?.contact_info ?? null };
    }
    for (const c of claimsReceived.data ?? []) {
      if (c.status !== "approved") continue;
      const p = await nameOf(c.claimant_id);
      handovers[c.id] = { name: p?.full_name ?? "Owner", contact: (await readContact("claim", c.id)) ?? p?.contact_info ?? null };
    }
    for (const b of borrowsMade.data ?? []) {
      if (b.status !== "approved") continue;
      const l = b.resource_listings as { id: string } | null;
      const p = await nameOf(b.lender_id);
      handovers[b.id] = { name: p?.full_name ?? "Lender", contact: (l ? await readContact("resource", l.id) : null) ?? p?.contact_info ?? null };
    }
    for (const b of borrowsReceived.data ?? []) {
      if (b.status !== "approved") continue;
      const p = await nameOf(b.requester_id);
      handovers[b.id] = { name: p?.full_name ?? "Borrower", contact: p?.contact_info ?? null };
    }

    return {
      userId,
      lost: lost.data ?? [],
      found: found.data ?? [],
      resources: resources.data ?? [],
      claimsMade: claimsMade.data ?? [],
      claimsReceived: claimsReceived.data ?? [],
      borrowsMade: borrowsMade.data ?? [],
      borrowsReceived: borrowsReceived.data ?? [],
      messages: messages ?? [],
      handovers,
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
