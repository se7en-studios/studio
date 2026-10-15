import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import { listPosts } from "@/lib/admin/content";
import type { ContentPost } from "@/lib/admin/content-shared";
import { PanelNotReady } from "@/lib/admin/panel";
import { AdminGate, PageHeader } from "../ui";
import { ContentSetup } from "./setup";
import { ContentView } from "./view";

export const metadata: Metadata = { title: "Contenido" };

export default async function ContenidoPage() {
  const me = await panelSession();
  if (!me) return <AdminGate />;

  let posts: ContentPost[] = [];
  let setup: string | null = null;
  try {
    posts = await listPosts();
  } catch (e) {
    if (!(e instanceof PanelNotReady)) throw e;
    setup = e.message;
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Contenido">
        Lo que hay que subir a Instagram, día por día: archivos para descargar,
        caption para copiar y el visto cuando se publicó. Se agenda y reprograma desde acá.
      </PageHeader>
      {setup ? <ContentSetup tableMissing /> : <ContentView posts={posts} />}
    </div>
  );
}
