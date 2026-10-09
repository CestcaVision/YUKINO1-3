import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { check, LinkState } from "linkinator";

// Mirror the Pages mount point so project-site links are checked locally too.
const site = new URL(process.env.SITE_URL || "https://yukino1-3.github.io/");
const root = await mkdtemp(join(tmpdir(), "yukino-links-"));
try {
  const destination = join(root, decodeURIComponent(site.pathname));
  await mkdir(destination, { recursive: true });
  await cp("dist", destination, { recursive: true });
  const result = await check({
    path: relative(root, join(destination, "index.html")),
    serverRoot: root,
    recurse: true,
    timeout: 30000,
    linksToSkip: async (url) => new URL(url).origin === site.origin,
  });
  for (const link of result.links.filter(
    (link) => link.state === LinkState.BROKEN,
  )) {
    console.error(
      `Broken link: ${link.url} (${link.status ?? "network error"})`,
    );
  }
  console.log(`Checked ${result.links.length} links; passed: ${result.passed}`);
  if (!result.passed) process.exitCode = 1;
} finally {
  await rm(root, { recursive: true, force: true });
}
