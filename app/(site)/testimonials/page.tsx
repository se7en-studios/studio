import { Metadata } from "next";
import { TestimonialsClient } from "./testimonials-client";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Testimonios",
  description:
    "Lo que dicen las marcas con las que trabajó Se7en Studio.",
  openGraph: {
    title: "Testimonios",
    description:
      "Lo que dicen las marcas con las que trabajó Se7en Studio.",
    url: `${SITE.url}/testimonials`,
  },
};

export default function TestimonialsPage() {
  return <TestimonialsClient />;
}
