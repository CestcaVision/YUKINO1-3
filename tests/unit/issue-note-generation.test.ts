import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import matter from "gray-matter";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  completionURL,
  generateIssueNote,
  publicationSubject,
  requestNote,
  validateGeneratedNote,
  type Issue,
} from "../../scripts/generate-issue-note.ts";

const issue: Issue = {
  number: 42,
  title: "理解二次函数",
  body: "从配方推导顶点，解释如何用几何图像理解它。",
  state: "open",
  author_association: "OWNER",
  labels: [{ name: "notes" }, { name: "math" }],
};
const generated = {
  title: "理解二次函数",
  summary: "从配方和几何图像理解二次函数。",
  markdown: `## 从一个问题开始\n\n${"先说明二次函数中的系数如何影响函数图像，明确讨论的是实数范围内的情况。".repeat(12)}\n\n## 配方与顶点\n\n通过 $x^2 + 2x + 1 = (x+1)^2$ 观察顶点。\n\n${"代入不同的横坐标可以核对结果；这个例子不能代替一般情形的完整推导。".repeat(12)}`,
};
const config = {
  baseURL: "https://api.xiaomimimo.com/v1",
  apiKey: "test-key",
  model: "fixture-mimo",
};
const response = (
  content = JSON.stringify(generated),
  finish_reason = "stop",
) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content }, finish_reason }],
    }),
    { status: 200 },
  );
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});
async function directory() {
  const path = await mkdtemp(join(tmpdir(), "issue-note-generation-"));
  directories.push(path);
  return path;
}

describe("Issue eligibility", () => {
  it("requires a trusted author, notes label, one subject, and an open Issue", () => {
    expect(publicationSubject(issue)).toBe("Mathematics");
    expect(
      publicationSubject({ ...issue, author_association: "NONE" }),
    ).toBeNull();
    expect(publicationSubject({ ...issue, state: "closed" })).toBeNull();
    expect(
      publicationSubject({ ...issue, labels: [{ name: "math" }] }),
    ).toBeNull();
    expect(() =>
      publicationSubject({ ...issue, labels: [{ name: "notes" }] }),
    ).toThrow("exactly one");
    expect(() =>
      publicationSubject({
        ...issue,
        labels: [...issue.labels, { name: "cs" }],
      }),
    ).toThrow("exactly one");
    expect(() => publicationSubject({ ...issue, body: " " })).toThrow(
      "non-empty",
    );
    expect(
      publicationSubject({
        ...issue,
        labels: [{ name: "notes" }, { name: "cs" }],
      }),
    ).toBe("Computer Science");
  });
});

describe("MiMo interface", () => {
  it("uses the configured base URL, key, model, and JSON response mode", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response());
    await requestNote(issue, "Mathematics", config, fetcher);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.xiaomimimo.com/v1/chat/completions");
    expect(options?.headers).toEqual({
      "Content-Type": "application/json",
      "api-key": "test-key",
    });
    const body = JSON.parse(String(options?.body));
    expect(body.model).toBe("fixture-mimo");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(JSON.parse(body.messages[1].content).sourceBrief).toBe(issue.body);
    expect(options?.redirect).toBe("error");
  });
  it("normalizes a trailing slash and supports the official Token Plan base", () => {
    expect(completionURL("https://token-plan-cn.xiaomimimo.com/v1/")).toBe(
      "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
    );
    for (const url of [
      "http://api.example/v1",
      "https://key@api.example/v1",
      "https://api.example/v1?key=secret",
    ])
      expect(() => completionURL(url)).toThrow("HTTPS");
  });
  it("rejects missing credentials before sending a request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      requestNote(issue, "Mathematics", { ...config, apiKey: "" }, fetcher),
    ).rejects.toThrow("Configure");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects API errors without printing response bodies or secrets", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("secret-key-and-private-provider-response", {
        status: 429,
      }),
    );
    await expect(
      requestNote(issue, "Mathematics", config, fetcher),
    ).rejects.toThrow("HTTP 429");
  });
  it("rejects truncated, empty, and malformed responses", async () => {
    for (const payload of [
      response(JSON.stringify(generated), "length"),
      response(""),
      response("not JSON"),
    ]) {
      await expect(
        requestNote(
          issue,
          "Mathematics",
          config,
          vi.fn<typeof fetch>().mockResolvedValue(payload),
        ),
      ).rejects.toThrow();
    }
  });
});

describe("generated Markdown", () => {
  it("retains supported Markdown and mathematical notation", () => {
    expect(validateGeneratedNote(JSON.stringify(generated))).toEqual(generated);
  });
  it("rejects executable markup, images, unsafe links, and metadata injection", () => {
    for (const extra of [
      "<script>alert(1)</script>",
      "![image](https://example.com/tracker.png)",
      "[click](javascript:alert%281%29)",
    ])
      expect(() =>
        validateGeneratedNote(
          JSON.stringify({
            ...generated,
            markdown: generated.markdown + "\n\n" + extra,
          }),
        ),
      ).toThrow();
    expect(() =>
      validateGeneratedNote(
        JSON.stringify({ ...generated, lifecycle: "published" }),
      ),
    ).toThrow();
    expect(() =>
      validateGeneratedNote(
        JSON.stringify({
          ...generated,
          markdown: "---\nlifecycle: published\n---\n" + generated.markdown,
        }),
      ),
    ).toThrow("frontmatter");
  });
});

describe("note creation and updates", () => {
  it("uses a stable Issue filename and records provenance, regardless of title content", async () => {
    const contentDirectory = await directory();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response());
    const result = await generateIssueNote({
      issue: { ...issue, title: "../../somewhere\n`$(bad)`" },
      repository: "owner/site",
      contentDirectory,
      config,
      fetcher,
      now: new Date("2026-10-10"),
    });
    expect(result.path).toBe(join(contentDirectory, "issue-42.md"));
    const note = matter(await readFile(result.path, "utf8"));
    expect(note.data).toMatchObject({
      slug: "issue-42",
      date: "2026-10-10",
      lifecycle: "published",
      authorship: "ai-generated",
      sourceIssue: "https://github.com/owner/site/issues/42",
      generationModel: "fixture-mimo",
      subject: "Mathematics",
    });
    expect(note.data.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(note.content.trim()).toBe(generated.markdown);
  });
  it("skips duplicate triggers, updates edited Issues, and preserves the publication date", async () => {
    const contentDirectory = await directory();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => response());
    const options = {
      issue,
      repository: "owner/site",
      contentDirectory,
      config,
      fetcher,
      now: new Date("2026-10-10"),
    };
    const first = await generateIssueNote(options);
    expect(first.changed).toBe(true);
    expect((await generateIssueNote(options)).changed).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await generateIssueNote({
      ...options,
      issue: { ...issue, body: "增加一个关于判别式的例子。" },
      now: new Date("2026-10-11"),
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    const note = matter(await readFile(first.path, "utf8"));
    expect(note.data.date).toBe("2026-10-10");
    expect(note.data.updated).toBe("2026-10-11");
  });
  it("does not overwrite an existing student-authored note", async () => {
    const contentDirectory = await directory();
    const path = join(contentDirectory, "issue-42.md");
    await writeFile(path, "---\nauthorship: student\n---\nMy own note.");
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      generateIssueNote({
        issue,
        repository: "owner/site",
        contentDirectory,
        config,
        fetcher,
      }),
    ).rejects.toThrow("refusing to overwrite");
    expect(fetcher).not.toHaveBeenCalled();
    expect(await readFile(path, "utf8")).toContain("My own note.");
  });
  it("leaves the old note intact when generation fails", async () => {
    const contentDirectory = await directory();
    const options = {
      issue,
      repository: "owner/site",
      contentDirectory,
      config,
    };
    const first = await generateIssueNote({
      ...options,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(response()),
    });
    const original = await readFile(first.path, "utf8");
    await expect(
      generateIssueNote({
        ...options,
        issue: { ...issue, body: "New source" },
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(response("not JSON")),
      }),
    ).rejects.toThrow();
    expect(await readFile(first.path, "utf8")).toBe(original);
  });
});

it("removes a duplicated article title and keeps code fences untouched", () => {
  const note = validateGeneratedNote(
    JSON.stringify({
      ...generated,
      markdown: `# Article title\n\n${generated.markdown}\n\n# Another section\n\n\`\`\`python\n# a code comment\n\`\`\``,
    }),
  );
  expect(note.markdown).not.toContain("# Article title");
  expect(note.markdown).toContain("## Another section");
  expect(note.markdown).toContain("# a code comment");
});

it("normalizes multi-line display math without rewriting code samples", () => {
  const note = validateGeneratedNote(
    JSON.stringify({
      ...generated,
      markdown: generated.markdown + "\n\n$$a=b\nc=d$$\n\n`$$literal$$`",
    }),
  );
  expect(note.markdown).toContain("$$\na=b\nc=d\n$$");
  expect(note.markdown).toContain("`$$literal$$`");
});
