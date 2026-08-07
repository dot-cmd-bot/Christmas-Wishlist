import type { User } from "@/lib/types";

interface AvatarProps {
  user: Pick<User, "name" | "profile_picture">;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-10 w-10 text-sm",
  md: "h-14 w-14 text-lg",
  lg: "h-24 w-24 text-3xl",
};

const palette = [
  "bg-red-700",
  "bg-emerald-700",
  "bg-amber-600",
  "bg-rose-700",
  "bg-teal-700",
  "bg-orange-700",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function Avatar({
  user,
  size = "md",
  className = "",
}: AvatarProps) {
  const initials = user.name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (user.profile_picture) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.profile_picture}
        alt={user.name}
        className={`rounded-full object-cover ring-2 ring-white ${sizes[size]} ${className}`}
      />
    );
  }

  const bg = palette[hashString(user.name) % palette.length];
  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white ${bg} ${sizes[size]} ${className}`}
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
}
