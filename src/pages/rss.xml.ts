import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { siteName } from "../site-config";

function escapeXml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  };
  return value.replace(/[&<>"']/g, (char) => entities[char]);
}

interface FeedItem {
  title: string;
  summary: string;
  date: Date;
  link?: string;
  guid: string;
}

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL("https://example.invalid/");
  const [works, notes, milestones] = await Promise.all([
    getCollection("works", ({ data }) => data.lifecycle === "published"),
    getCollection("notes", ({ data }) => data.lifecycle === "published"),
    getCollection("milestones", ({ data }) => data.lifecycle === "published"),
  ]);

  const items: FeedItem[] = [
    ...works.map((work) => {
      const link = new URL(`works/${work.data.slug}/`, base).href;
      return { title: work.data.title, summary: work.data.summary, date: work.data.date, link, guid: link };
    }),
    ...notes.map((note) => {
      const link = new URL(`notes/${note.data.slug}/`, base).href;
      return { title: note.data.title, summary: note.data.summary, date: note.data.date, link, guid: link };
    }),
    ...milestones.map((milestone) => ({
      title: milestone.data.title,
      summary: milestone.data.summary,
      date: milestone.data.date,
      guid: `milestone-${milestone.id}`,
    })),
  ].sort((a, b) => b.date.valueOf() - a.date.valueOf());

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${escapeXml(siteName)}</title>
  <link>${base.href}</link>
  <description>Published Work, Notes, and Recent Activity from the ${escapeXml(siteName)}.</description>
  <language>en-gb</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items
  .map(
    (item) => `  <item>
    <title>${escapeXml(item.title)}</title>
    <description>${escapeXml(item.summary)}</description>
${item.link ? `    <link>${item.link}</link>\n    <guid>${item.link}</guid>` : `    <guid isPermaLink="false">${escapeXml(item.guid)}</guid>`}
    <pubDate>${item.date.toUTCString()}</pubDate>
  </item>`,
  )
  .join("\n")}
</channel></rss>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
