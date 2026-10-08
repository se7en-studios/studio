import { MetadataRoute } from "next";
import { SITE } from "@/data/site";
import { projects } from "@/data/projects";
import { blogPosts } from "@/data/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/work",
    "/services",
    "/pricing",
    "/start",
    "/roi",
    "/tech",
    "/blog",
    "/playground",
    "/audit",
    "/testimonials",
    "/kickoff",
    "/#estimator",
    "/#about",
    "/#contact",
  ].map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified: new Date(),
  }));

  const workRoutes = projects.map((p) => ({
    url: `${SITE.url}/work/${p.slug}`,
    lastModified: new Date(),
  }));

  const blogRoutes = blogPosts.map((b) => ({
    url: `${SITE.url}/blog/${b.slug}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...workRoutes, ...blogRoutes];
}
