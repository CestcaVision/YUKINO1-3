import react from "@astrojs/react";
import { unified as astroUnified } from "@astrojs/markdown-remark";
import type { AstroIntegration } from "astro";
import { defineConfig } from "astro/config";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import matter from "gray-matter";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

function validateContentFiles(): AstroIntegration {
  return {
    name: "validate-content-files",
    hooks: {
      "astro:config:setup": ({ logger }) => {
        const contentDirectories = [
          {
            name: "Note",
            path: process.env.NOTE_CONTENT_DIRECTORY ?? "src/content/notes",
          },
          {
            name: "Work",
            path: process.env.WORK_CONTENT_DIRECTORY ?? "src/content/works",
          },
        ];
        const executableExtensions = new Set([
          ".astro",
          ".jsx",
          ".mdx",
          ".tsx",
        ]);
        for (const contentDirectory of contentDirectories) {
          const directory = resolve(process.cwd(), contentDirectory.path);
          const files = readdirSync(directory, {
            recursive: true,
            withFileTypes: true,
          }).filter((entry) => entry.isFile());
          const invalidFile = files.find((entry) =>
            executableExtensions.has(extname(entry.name)),
          );
          if (invalidFile) {
            logger.error(
              `Unsupported executable ${contentDirectory.name} file "${invalidFile.name}". MDX, Astro, and React content are not allowed.`,
            );
            throw new Error(
              `Executable ${contentDirectory.name} content is not allowed`,
            );
          }
          const fileBySlug = new Map<string, string>();
          for (const file of files.filter(
            (entry) => extname(entry.name) === ".md",
          )) {
            const filePath = join(file.parentPath, file.name);
            const parsedContent = matter(readFileSync(filePath, "utf8"));
            const slug = parsedContent.data.slug;
            if (typeof slug !== "string") continue;
            const markdownTree = unified()
              .use(remarkParse)
              .parse(parsedContent.content);
            visit(markdownTree, "html", (node) => {
              if (/^<\/?(?:kbd|mark|sub|sup)>$/i.test(node.value.trim()))
                return;
              throw new Error(
                `Unsafe executable or embedded markup in ${file.name}: ${node.value.slice(0, 60)}. Use Markdown, fenced code, math, or harmless inline kbd/mark/sub/sup markup.`,
              );
            });
            const existingFile = fileBySlug.get(slug);
            if (existingFile)
              throw new Error(
                `Duplicate ${contentDirectory.name} slug "${slug}" in "${existingFile}" and "${file.name}". Give every ${contentDirectory.name} a unique stable slug.`,
              );
            fileBySlug.set(slug, file.name);
          }
        }
      },
    },
  };
}

const deploymentURL = new URL(
  process.env.SITE_URL || "https://yukino1-3.github.io/",
);

export default defineConfig({
  integrations: [validateContentFiles(), react()],
  markdown: {
    processor: astroUnified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  },
  output: "static",
  site: deploymentURL.origin,
  base: deploymentURL.pathname,
});
