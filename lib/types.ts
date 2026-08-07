export interface User {
  id: string;
  name: string;
  profile_picture: string | null;
  face_recognition_id: string;
  see_lucky_one: boolean;
  lucky_one: boolean;
  favorite_user_id: string | null;
  created_at?: string;
}

export interface WishlistItem {
  id: string;
  owner_id: string;
  item_name: string;
  item_size: string;
  purchase_link: string | null;
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
  allow_multiple?: boolean;
}
