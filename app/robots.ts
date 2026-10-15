import { MetadataRoute } from "next";
import { SITE } from "@/data/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/portal", "/propuesta"] },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
