export interface User {
  id: string;
  name: string;
  profile_picture: string | null;
  see_lucky_one: boolean;
  lucky_one: boolean;
  favorite_user_id: string | null;
}

export interface WishlistItem {
  id: string;
  owner_id: string;
  item_name: string;
  item_size: string;
  purchase_link: string | null;
  image_url: string | null;
  allow_multiple: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Reservation {
  id: string;
  wishlist_item_id: string;
  reserved_by_user_id: string;
  created_at?: string;
}

export interface ItemInput {
  item_name: string;
  item_size: string;
  purchase_link?: string | null;
  image_url?: string | null;
  allow_multiple?: boolean;
}
