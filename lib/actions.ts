"use server";

import { getSessionUserId } from "./auth-server";
import { getServerSupabase } from "./supabase-server";
import { toPublicUser, toPublicUserForViewer, type PublicUser, type UserRow } from "./public-user";
import { invalidateDescriptor } from "./face-server";
import type { ItemInput, Reservation, WishlistItem } from "./types";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
type SimpleResult = { ok: true } | { ok: false; error: string };

const db = () => getServerSupabase();

function imagePathFromUrl(publicUrl: string, bucket: string): string | null {
  const marker = `/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

async function deleteStoredImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  for (const bucket of ["item-images", "faces"]) {
    const path = imagePathFromUrl(url, bucket);
    if (path) {
      await db().storage.from(bucket).remove([path]).catch(() => {});
      return;
    }
  }
}

export interface DashboardData {
  me: PublicUser;
  users: PublicUser[];
  items: WishlistItem[];
  allItems: WishlistItem[];
  luckyOne: PublicUser | null;
}

export async function getDashboardData(): Promise<ActionResult<DashboardData>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated." };

  try {
    const [{ data: users }, { data: myItems }, { data: allItems }] = await Promise.all([
      db().from("users").select("*").order("name"),
      db().from("wishlist_items").select("*").eq("owner_id", userId).order("created_at"),
      db().from("wishlist_items").select("*").order("created_at"),
    ]);
    const all = (users ?? []) as UserRow[];
    const me = all.find((u) => u.id === userId);
    if (!me) return { ok: false, error: "Your account could not be found." };

    const luckyOne = me.see_lucky_one
      ? all.find((u) => u.id !== userId && u.lucky_one) ?? null
      : null;

    return {
      ok: true,
      data: {
        me: toPublicUser(me),
        users: all.filter((u) => u.id !== userId).map(toPublicUserForViewer),
        items: (myItems ?? []) as WishlistItem[],
        allItems: (allItems ?? []) as WishlistItem[],
        luckyOne: luckyOne ? toPublicUser(luckyOne) : null,
      },
    };
  } catch (err) {
    console.error("[action] getDashboardData:", err);
    return { ok: false, error: "Could not load your dashboard." };
  }
}

export interface WishlistViewData {
  owner: PublicUser | null;
  items: WishlistItem[];
  reservations: Reservation[];
}

export async function getWishlistView(ownerId: string): Promise<ActionResult<WishlistViewData>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated." };

  try {
    const { data: owner } = await db()
      .from("users")
      .select("*")
      .eq("id", ownerId)
      .maybeSingle();
    if (!owner) return { ok: true, data: { owner: null, items: [], reservations: [] } };

    const { data: items } = await db()
      .from("wishlist_items")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at");
    const itemList = (items ?? []) as WishlistItem[];

    let reservations: Reservation[] = [];
    if (userId !== ownerId && itemList.length > 0) {
      const { data: res } = await db()
        .from("reservations")
        .select("*")
        .in(
          "wishlist_item_id",
          itemList.map((i) => i.id),
        );
      reservations = (res ?? []) as Reservation[];
    }

    return {
      ok: true,
      data: {
        owner: toPublicUserForViewer(owner),
        items: itemList,
        reservations,
      },
    };
  } catch (err) {
    console.error("[action] getWishlistView:", err);
    return { ok: false, error: "Could not load this wishlist." };
  }
}

export async function addItem(input: ItemInput): Promise<ActionResult<WishlistItem>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (!input.item_name?.trim() || !input.item_size?.trim()) {
    return { ok: false, error: "Item name and size are required." };
  }

  const { data, error } = await db()
    .from("wishlist_items")
    .insert({
      owner_id: userId,
      item_name: input.item_name.trim(),
      item_size: input.item_size.trim(),
      purchase_link: input.purchase_link?.trim() || null,
      image_url: input.image_url || null,
      allow_multiple: input.allow_multiple ?? false,
    })
    .select()
    .single();
  if (error) {
    console.error("[action] addItem:", error);
    return { ok: false, error: "Could not add the item." };
  }
  return { ok: true, data: data as WishlistItem };
}

export async function updateItem(
  id: string,
  patch: Partial<ItemInput>,
): Promise<ActionResult<WishlistItem>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated." };
  if (patch.item_name !== undefined && !patch.item_name.trim()) {
    return { ok: false, error: "Item name is required." };
  }
  if (patch.item_size !== undefined && !patch.item_size.trim()) {
    return { ok: false, error: "Item size is required." };
  }

  const { data: existing } = await db()
    .from("wishlist_items")
    .select("id, owner_id, image_url")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Item not found." };
  if (existing.owner_id !== userId) return { ok: false, error: "Not allowed." };

  const { data, error } = await db()
    .from("wishlist_items")
    .update({
      ...(patch.item_name !== undefined ? { item_name: patch.item_name.trim() } : {}),
      ...(patch.item_size !== undefined ? { item_size: patch.item_size.trim() } : {}),
      ...(patch.purchase_link !== undefined
        ? { purchase_link: patch.purchase_link?.trim() || null }
        : {}),
      ...(patch.image_url !== undefined ? { image_url: patch.image_url } : {}),
      ...(patch.allow_multiple !== undefined ? { allow_multiple: patch.allow_multiple } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("[action] updateItem:", error);
    return { ok: false, error: "Could not save the item." };
  }

  // Clean up the replaced image only after a successful update.
  if (patch.image_url !== undefined && existing.image_url && existing.image_url !== patch.image_url) {
    await deleteStoredImage(existing.image_url);
  }

  return { ok: true, data: data as WishlistItem };
}

export async function deleteItem(id: string): Promise<SimpleResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { data: existing } = await db()
    .from("wishlist_items")
    .select("id, owner_id, image_url")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Item not found." };
  if (existing.owner_id !== userId) return { ok: false, error: "Not allowed." };

  const { error } = await db().from("wishlist_items").delete().eq("id", id);
  if (error) {
    console.error("[action] deleteItem:", error);
    return { ok: false, error: "Could not delete the item." };
  }
  await deleteStoredImage(existing.image_url);
  return { ok: true };
}

export async function toggleAllowMultiple(
  id: string,
  allowMultiple: boolean,
): Promise<SimpleResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { data: existing } = await db()
    .from("wishlist_items")
    .select("id, owner_id, allow_multiple")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Item not found." };
  if (existing.owner_id !== userId) return { ok: false, error: "Not allowed." };

  const next = !allowMultiple;
  const { error } = await db()
    .from("wishlist_items")
    .update({ allow_multiple: next, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("[action] toggleAllowMultiple:", error);
    return { ok: false, error: "Could not update the item." };
  }

  if (!next) {
    try {
      await db().rpc("trim_extra_reservations", { p_item_id: id });
    } catch {
      // The trigger enforces single-gift; trimming is best-effort.
    }
  }
  return { ok: true };
}

export async function setFavorite(targetUserId: string | null): Promise<SimpleResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated." };

  if (targetUserId) {
    const { data: target } = await db()
      .from("users")
      .select("id")
      .eq("id", targetUserId)
      .maybeSingle();
    if (!target) return { ok: false, error: "Member not found." };
  }

  const { error } = await db()
    .from("users")
    .update({ favorite_user_id: targetUserId })
    .eq("id", userId);
  if (error) {
    console.error("[action] setFavorite:", error);
    return { ok: false, error: "Could not update your favorite." };
  }
  return { ok: true };
}

export async function updateFaceImage(imageUrl: string): Promise<SimpleResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { error } = await db()
    .from("users")
    .update({ face_image_url: imageUrl })
    .eq("id", userId);
  if (error) {
    console.error("[action] updateFaceImage:", error);
    return { ok: false, error: "Could not update your login photo." };
  }
  // Stale descriptor must be rebuilt before the next login.
  await invalidateDescriptor(userId);
  return { ok: true };
}

export async function updateProfilePicture(imageUrl: string): Promise<SimpleResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { error } = await db()
    .from("users")
    .update({ profile_picture: imageUrl })
    .eq("id", userId);
  if (error) {
    console.error("[action] updateProfilePicture:", error);
    return { ok: false, error: "Could not update your profile picture." };
  }
  return { ok: true };
}

export async function reserveItem(itemId: string): Promise<SimpleResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { data: item } = await db()
    .from("wishlist_items")
    .select("id, owner_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return { ok: false, error: "Item not found." };
  if (item.owner_id === userId) return { ok: false, error: "You can't reserve your own gift." };

  const { error } = await db()
    .from("reservations")
    .insert({ wishlist_item_id: itemId, reserved_by_user_id: userId });
  if (error) {
    return {
      ok: false,
      error: "This gift is already reserved by someone else.",
    };
  }
  return { ok: true };
}

export async function unreserveItem(itemId: string): Promise<SimpleResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const { error } = await db()
    .from("reservations")
    .delete()
    .match({ wishlist_item_id: itemId, reserved_by_user_id: userId });
  if (error) {
    console.error("[action] unreserveItem:", error);
    return { ok: false, error: "Could not remove your reservation." };
  }
  return { ok: true };
}

export async function logoutAction(): Promise<SimpleResult> {
  await getSessionUserId();
  return { ok: true };
}
