import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

interface SitemapUrl {
  path: string;
  lastmod?: Date;
}

export const GET: APIRoute = async ({ site }) => {
  const base = new URL(
    import.meta.env.BASE_URL,
    site ?? "https://example.invalid/",
  );
  const [works, notes] = await Promise.all([
    getCollection("works", ({ data }) => data.lifecycle === "published"),
    getCollection("notes", ({ data }) => data.lifecycle === "published"),
  ]);

  const urls: SitemapUrl[] = [
    { path: "" },
    { path: "works/" },
    { path: "notes/" },
    { path: "about/" },
    ...works.map((work) => ({
      path: `works/${work.data.slug}/`,
      lastmod: work.data.updated ?? work.data.date,
    })),
    ...notes.map((note) => ({
      path: `notes/${note.data.slug}/`,
      lastmod: note.data.updated ?? note.data.date,
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(({ path, lastmod }) => {
    const loc = new URL(path, base).href;
    const lastmodTag = lastmod
      ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>`
      : "";
    return `  <url><loc>${loc}</loc>${lastmodTag}</url>`;
  })
  .join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
