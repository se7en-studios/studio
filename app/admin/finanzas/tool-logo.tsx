import Image from "next/image";
import { logoOf } from "@/lib/admin/tool-shared";

/** Logo sobre fondo blanco (los logos oscuros no se ven sobre el panel); sin logo conocido, la inicial. */
export function ToolLogo({ name, size = 32 }: { name: string; size?: number }) {
  const src = logoOf(name);
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg bg-white shadow-sm"
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={size}
          height={size}
          unoptimized
          className="object-contain"
          style={{ width: size * 0.6, height: size * 0.6 }}
        />
      ) : (
        <span
          className="text-[13px] font-semibold text-neutral-700"
          aria-hidden
        >
          {name.trim()[0]?.toUpperCase() ?? "?"}
        </span>
      )}
    </span>
  );
}
