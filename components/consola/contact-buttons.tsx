import Image from "next/image";
import { SITE } from "@/data/site";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { InstagramLogo, LinkedInLogo } from "@/components/icons/brand-logos";

// Botones de contacto de la consola, con los logos de verdad: WhatsApp en su
// verde, el mail con el sobre lacrado (foto de Flow, ver scripts/sobre.mjs)
// y las redes con sus colores.

export function WhatsAppButton({ className = "", big = false }: { className?: string; big?: boolean }) {
  return (
    <a
      href={SITE.whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      className={`rd-body inline-flex items-center justify-center gap-2.5 rounded-full bg-[#25D366] font-medium text-white shadow-[0_10px_24px_-10px_rgb(37_211_102/0.7)] transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-[#1ebe5b] ${
        big ? "h-14 px-7 text-[16px]" : "h-12 px-5 text-[14.5px]"
      } ${className}`}
    >
      <WhatsAppLogo size={big ? 22 : 19} />
      WhatsApp
    </a>
  );
}

export function MailButton({ className = "", big = false }: { className?: string; big?: boolean }) {
  return (
    <a
      href={`mailto:${SITE.email}`}
      className={`group rd-body inline-flex items-center justify-center gap-2.5 rounded-full bg-(--paper) font-medium text-(--ink) transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-white ${
        big ? "h-14 pr-7 pl-4 text-[16px]" : "h-12 pr-5 pl-3 text-[14.5px]"
      } ${className}`}
    >
      <Image
        src="/consola/sobre.webp"
        alt=""
        width={240}
        height={221}
        className={`-my-2 h-auto rotate-[-8deg] drop-shadow-[-2px_4px_4px_rgb(0_0_0/0.3)] transition-transform duration-500 group-hover:rotate-[4deg] ${
          big ? "w-11" : "w-9"
        }`}
      />
      Mail
    </a>
  );
}

const SOCIALS = [
  SITE.social.linkedin && { href: SITE.social.linkedin, label: "LinkedIn", Logo: LinkedInLogo, bg: "#0A66C2" },
  SITE.social.instagram && {
    href: SITE.social.instagram,
    label: "Instagram",
    Logo: InstagramLogo,
    bg: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
  },
  { href: SITE.whatsapp, label: "WhatsApp", Logo: WhatsAppLogo, bg: "#25D366" },
].filter(Boolean) as { href: string; label: string; Logo: typeof LinkedInLogo; bg: string }[];

/** Redes con su logo y su color de marca. */
export function Socials({ size = 56 }: { size?: number }) {
  return (
    <div className="flex gap-3">
      {SOCIALS.map(({ href, label, Logo, bg }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="grid place-items-center rounded-full text-white shadow-[0_10px_24px_-12px_#000] transition-transform duration-300 hover:-translate-y-1"
          style={{ width: size, height: size, background: bg }}
        >
          <Logo size={Math.round(size * 0.42)} />
        </a>
      ))}
    </div>
  );
}
