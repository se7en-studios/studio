import Link from "next/link";
import { Gauge, Receipt, Store } from "lucide-react";
import { blogPosts } from "@/data/blog";
import { RdButton, RdLines, RdReveal } from "@/components/rd/primitives";
import { CsSection } from "@/components/consola/section";

// Notas: tres artículos del blog, con un ícono en anillo como portada.

const ICONS = [Receipt, Store, Gauge];

export function CsNotes() {
  const posts = blogPosts.slice(0, 3);
  return (
    <CsSection id="notas" label="Notas" className="pt-28 md:pt-40">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <RdLines
          className="cs-h2 text-[clamp(2.4rem,4.6vw,4.4rem)]"
          lines={[
            // Viaja del servidor al cliente dentro de un array: necesita key.
            <span key="notas">
              Notas del <span className="rd-serif text-(--signal)">estudio</span>
            </span>,
          ]}
        />
        <RdButton href="/blog" variant="ghost">
          Ver todas
        </RdButton>
      </div>
      <div className="mt-10 grid gap-4 md:mt-14 md:grid-cols-3">
        {posts.map((post, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <RdReveal key={post.slug} delay={i * 0.08}>
              <Link href={`/blog/${post.slug}`} className="cs-card cs-card--link group flex h-full flex-col p-3">
                <span className="cs-canvas relative grid aspect-[16/11] place-items-center overflow-hidden rounded-2xl">
                  <span className="grid h-24 w-24 place-items-center rounded-full border border-(--signal)/50 p-2 transition-transform duration-700 ease-(--ease-out) group-hover:scale-110">
                    <span className="grid h-full w-full place-items-center rounded-full bg-(--signal)/10 text-(--signal)">
                      <Icon size={34} strokeWidth={1.6} aria-hidden />
                    </span>
                  </span>
                </span>
                <span className="flex flex-1 flex-col px-2 pt-5 pb-3">
                  <span className="rd-label text-[10px] text-(--paper)/45">{post.publishedAt}</span>
                  <span className="rd-body mt-2 text-[1.15rem] leading-snug tracking-[-0.015em] text-(--paper)">
                    {post.title}
                  </span>
                  <span className="rd-body mt-3 line-clamp-2 text-[13.5px] text-(--paper)/55">{post.excerpt}</span>
                </span>
              </Link>
            </RdReveal>
          );
        })}
      </div>
    </CsSection>
  );
}
