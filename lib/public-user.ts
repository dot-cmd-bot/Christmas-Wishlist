export interface PublicUser {
  id: string;
  name: string;
  profile_picture: string | null;
  see_lucky_one: boolean;
  lucky_one: boolean;
  favorite_user_id: string | null;
}

export interface UserRow {
  id: string;
  name: string;
  profile_picture: string | null;
  see_lucky_one?: boolean | null;
  lucky_one?: boolean | null;
  favorite_user_id?: string | null;
}

/** Truthful public shape (used for the current user themselves). */
export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    profile_picture: row.profile_picture,
    see_lucky_one: row.see_lucky_one ?? false,
    lucky_one: Boolean(row.lucky_one),
    favorite_user_id: row.favorite_user_id ?? null,
  };
}

/**
 * Public shape for OTHER members: never leaks who the Lucky One is unless
 * that member has opted in (see_lucky_one). face_image_url / face_recognition_id
 * are never exposed to the client.
 */
export function toPublicUserForViewer(row: UserRow): PublicUser {
  return {
    ...toPublicUser(row),
    lucky_one: row.see_lucky_one ? Boolean(row.lucky_one) : false,
  };
}
