import { getSupabase } from "./supabase";
import type { ItemInput, Reservation, User, WishlistItem } from "./types";

const db = getSupabase;

export async function fetchUsers(): Promise<User[]> {
  const { data, error } = await db()
    .from("users")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as User[];
}

export async function fetchUserById(id: string): Promise<User | null> {
  const { data, error } = await db()
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as User | null) ?? null;
}

export async function fetchWishlist(ownerId: string): Promise<WishlistItem[]> {
  const { data, error } = await db()
    .from("wishlist_items")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at");
  if (error) throw error;
  return data as WishlistItem[];
}

export interface WishlistView {
  items: WishlistItem[];
  reservations: Reservation[];
}

export async function fetchWishlistForViewer(
  ownerId: string,
): Promise<WishlistView> {
  const { data: items, error } = await db()
    .from("wishlist_items")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at");
  if (error) throw error;

  const itemList = (items as WishlistItem[]) ?? [];
  let reservations: Reservation[] = [];

  if (itemList.length > 0) {
    const { data: res, error: resError } = await db()
      .from("reservations")
      .select("*")
      .in(
        "wishlist_item_id",
        itemList.map((i) => i.id),
      );
    if (resError) throw resError;
    reservations = (res as Reservation[]) ?? [];
  }

  return { items: itemList, reservations };
}

export async function addItem(
  ownerId: string,
  input: ItemInput,
): Promise<WishlistItem> {
  const { data, error } = await db()
    .from("wishlist_items")
    .insert({
      owner_id: ownerId,
      item_name: input.item_name,
      item_size: input.item_size,
      purchase_link: input.purchase_link || null,
      allow_multiple: input.allow_multiple ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return data as WishlistItem;
}

export async function updateItem(
  id: string,
  patch: Partial<ItemInput>,
): Promise<WishlistItem> {
  const { data, error } = await db()
    .from("wishlist_items")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as WishlistItem;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await db().from("wishlist_items").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleAllowMultiple(
  id: string,
  allowMultiple: boolean,
): Promise<void> {
  const next = !allowMultiple;
  const { error } = await db()
    .from("wishlist_items")
    .update({ allow_multiple: next, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  // When switching to a single-gift item, keep only the earliest reservation.
  if (!next) {
    await db().rpc("trim_extra_reservations", { p_item_id: id });
  }
}

export async function reserveItem(
  itemId: string,
  userId: string,
): Promise<void> {
  const { error } = await db()
    .from("reservations")
    .insert({ wishlist_item_id: itemId, reserved_by_user_id: userId });
  if (error) throw error;
}

export async function unreserveItem(
  itemId: string,
  userId: string,
): Promise<void> {
  const { error } = await db()
    .from("reservations")
    .delete()
    .match({ wishlist_item_id: itemId, reserved_by_user_id: userId });
  if (error) throw error;
}

export async function setFavorite(
  userId: string,
  favoriteUserId: string | null,
): Promise<void> {
  const { error } = await db()
    .from("users")
    .update({ favorite_user_id: favoriteUserId })
    .eq("id", userId);
  if (error) throw error;
}
