import { MetadataRoute } from "next";
import { SITE } from "@/data/site";
import { projects } from "@/data/projects";
import { blogPosts } from "@/data/blog";
import { comparisons } from "@/data/comparisons";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/en",
    "/work",
    "/services",
    "/pricing",
    "/vs",
    "/start",
    "/tech",
    "/blog",
    "/audit",
    "/testimonials",
    "/kickoff",
  ].map((path) => ({
    url: `${SITE.url}${path}`,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : path === "/en" ? 0.9 : 0.7,
    // La home y /en son la misma página en dos idiomas: hreflang en el sitemap.
    ...((path === "" || path === "/en") && {
      alternates: {
        languages: { "es-AR": SITE.url, en: `${SITE.url}/en` },
      },
    }),
  }));

  const workRoutes = projects.map((p) => ({
    url: `${SITE.url}/work/${p.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const blogRoutes = blogPosts.map((b) => ({
    url: `${SITE.url}/blog/${b.slug}`,
    lastModified: b.publishedIso,
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  const vsRoutes = comparisons.map((c) => ({
    url: `${SITE.url}/vs/${c.slug}`,
    lastModified: c.publishedIso,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...workRoutes, ...vsRoutes, ...blogRoutes];
}
