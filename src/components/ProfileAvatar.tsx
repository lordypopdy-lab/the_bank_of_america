import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { useAvatarUrl } from "@/hooks/useBanking";

const sizes = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
};

export function ProfileAvatar({
  path,
  name,
  size = "md",
  className,
  ring = true,
}: {
  path?: string | null | undefined;
  name?: string | null | undefined;
  size?: keyof typeof sizes;
  className?: string;
  ring?: boolean;
}) {
  const { data: url } = useAvatarUrl(path);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-elevated",
        ring && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
        sizes[size],
        className,
      )}
    >
      {url ? (
        <img
          src={url}
          alt={name ? `${name} profile picture` : "Profile picture"}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="brand-gradient flex h-full w-full items-center justify-center font-semibold text-primary-foreground">
          {initials(name)}
        </span>
      )}
    </div>
  );
}
