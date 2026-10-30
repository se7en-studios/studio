import { MetadataRoute } from "next";
import { SITE } from "@/data/site";

const DISALLOW_PRIVATE = ["/admin", "/portal", "/propuesta", "/api"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW_PRIVATE,
      },
      // Bots de IA y buscadores generativos: acceso explícito a todo el contenido público
      // para que ChatGPT, Claude, Perplexity, Gemini y Copilot indexen y citen el sitio.
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-Web",
          "anthropic-ai",
          "PerplexityBot",
          "Perplexity-User",
          "Google-Extended",
          "Googlebot",
          "Bingbot",
          "Applebot-Extended",
          "DuckDuckBot",
        ],
        allow: ["/", "/llms.txt", "/en", "/blog", "/vs", "/work", "/services", "/pricing"],
        disallow: DISALLOW_PRIVATE,
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
