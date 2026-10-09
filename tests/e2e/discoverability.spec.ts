import { expect, test } from "@playwright/test";

interface PublishedRoute {
  path: string;
  pageTitle: string;
  description: string;
  type: "website" | "article";
  updated?: string;
}

const publishedRoutes: PublishedRoute[] = [
  {
    path: "/",
    pageTitle: "Yukino — Learning & making",
    description:
      "A personal collection of things I’m learning and making: notes, small experiments, and projects in mathematics and computing.",
    type: "website",
  },
  {
    path: "/works/",
    pageTitle: "Works — Yukino",
    description: "Completed Work and its evidence-backed Case Studies.",
    type: "website",
  },
  {
    path: "/notes/",
    pageTitle: "Notes — Yukino",
    description: "Applicant-authored explanations of academic ideas.",
    type: "website",
  },
  {
    path: "/about/",
    pageTitle: "About — Yukino",
    description: "Identity details are pending for this technical preview.",
    type: "website",
  },
  {
    path: "/works/fixture-correlation-regression/",
    pageTitle: "Correlation and regression experiment — Yukino",
    description:
      "An interactive experiment showing how sample size, outliers, and confounding variables reshape the apparent relationship between two quantities.",
    type: "article",
  },
  {
    path: "/works/fixture-sorting-algorithm-visualiser/",
    pageTitle: "Sorting algorithm visualiser — Yukino",
    description:
      "An interactive comparison of how common sorting algorithms move data.",
    type: "article",
  },
  {
    path: "/works/fixture-model-check/",
    pageTitle: "Fixture model check — Yukino",
    description: "A separate Work used to test evidence navigation.",
    type: "article",
    updated: "2026-08-15",
  },
  {
    path: "/notes/completing-the-square/",
    pageTitle: "Completing the square, visually — Yukino",
    description:
      "A geometric route from a quadratic expression to vertex form.",
    type: "article",
    updated: "2026-09-10",
  },
  {
    path: "/notes/tracing-a-loop/",
    pageTitle: "Tracing a loop — Yukino",
    description: "Test fixture for a computational explanation.",
    type: "article",
  },
];

const hiddenSlugs = ["hidden-draft", "hidden-review"];

test("sitemap.xml contains only public stable routes with no draft or review content", async ({
  request,
}) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/xml");
  const body = await response.text();

  for (const route of publishedRoutes) {
    expect(body).toContain(
      `<loc>https://yukino1-3.github.io${route.path}</loc>`,
    );
  }
  for (const slug of hiddenSlugs) {
    expect(body).not.toContain(`/works/${slug}/`);
    expect(body).not.toContain(`/notes/${slug}/`);
  }
  expect(body).not.toContain("/notes/drafts/");
  expect(body).not.toContain("/404");
  expect(body.match(/<url>/g)).toHaveLength(publishedRoutes.length);
});

test("rss.xml aggregates published Work, Notes, and Recent Activity in chronological order", async ({
  request,
}) => {
  const response = await request.get("/rss.xml");
  expect(response.status()).toBe(200);
  // The static file host determines the served Content-Type from the .xml extension;
  // RSS readers and crawlers rely on the <rss> root element, not this header, to identify the feed.
  expect(response.headers()["content-type"]).toContain("xml");
  const body = await response.text();

  const itemTitles = [
    ...body.matchAll(/<item>\s*<title>([^<]*)<\/title>/g),
  ].map((match) => match[1]);
  expect(itemTitles).toEqual([
    "Fixture research presentation",
    "Sorting algorithm visualiser",
    "Completing the square, visually",
    "Tracing a loop",
    "Fixture model check",
    "Correlation and regression experiment",
  ]);

  expect(body).not.toContain("Hidden draft");
  expect(body).not.toContain("Hidden review");
  for (const slug of hiddenSlugs) {
    expect(body).not.toContain(`/works/${slug}/`);
    expect(body).not.toContain(`/notes/${slug}/`);
  }
});

for (const route of publishedRoutes) {
  test(`${route.path} has a matching canonical URL and Open Graph metadata`, async ({
    page,
  }) => {
    await page.goto(route.path);

    await expect(page).toHaveTitle(route.pageTitle);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://yukino1-3.github.io${route.path}`,
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      "content",
      route.type,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      `https://yukino1-3.github.io${route.path}`,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      route.pageTitle,
    );
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute("content", route.description);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      route.description,
    );
    // Still a technical preview: every route stays noindex until the readiness gate is explicitly lifted.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
  });
}

for (const route of publishedRoutes.filter(
  (route) => route.type === "article",
)) {
  test(`${route.path} publishes an article:published_time${route.updated ? " and article:modified_time" : ""}`, async ({
    page,
  }) => {
    await page.goto(route.path);
    const publishedTime = await page
      .locator('meta[property="article:published_time"]')
      .getAttribute("content");
    expect(publishedTime).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
    if (route.updated) {
      await expect(
        page.locator('meta[property="article:modified_time"]'),
      ).toHaveAttribute("content", `${route.updated}T00:00:00.000Z`);
    } else {
      await expect(
        page.locator('meta[property="article:modified_time"]'),
      ).toHaveCount(0);
    }
  });
}

test("published pages have unique <title> elements", async ({ page }) => {
  const titles: string[] = [];
  for (const route of publishedRoutes) {
    await page.goto(route.path);
    titles.push(await page.title());
  }
  expect(new Set(titles).size).toBe(titles.length);
});

test("the 404 page stays noindex and never masquerades as a successful page", async ({
  page,
}) => {
  const response = await page.goto("/missing-page/");
  expect(response?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await expect(page).toHaveTitle("Page not found — Yukino");
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Return home" })).toHaveAttribute(
    "href",
    "/",
  );
});
