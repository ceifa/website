// Cuts the built fonts down to the characters the built site contains.
//
// Runs after the build, over everything it wrote: the pages (with their inline
// styles) and the scripts, whose strings the canvas scenes draw in these fonts.
// A new character in a post lands in the fonts on the next build, so nothing
// ever falls back to a system font. Glyph outlines, variation axes and the
// OpenType features browsers apply by default are kept as they are.
import { createHash } from "node:crypto";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";

const TEXT = /\.(html|js|css)$/;

async function files(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries.filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name));
}

export default function subsetFonts() {
  return {
    name: "subset-fonts",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const all = await files(root);
        const texts = new Map();
        for (const file of all.filter((f) => TEXT.test(f)))
          texts.set(file, await readFile(file, "utf8"));
        const chars = [...new Set([...texts.values()].join(""))].join("");

        const renames = [];
        for (const font of all.filter((f) => f.endsWith(".woff2"))) {
          const before = await readFile(font);
          const after = await subsetFont(before, chars, { targetFormat: "woff2" });
          // Fonts are cached forever under a name taken from their content.
          const name = `${createHash("sha256").update(after).digest("hex").slice(0, 16)}.woff2`;
          const path = join(font, "..", name);
          await writeFile(path, after);
          await rm(font);
          renames.push([relative(root, font), relative(root, path)]);
          logger.info(
            `${relative(root, font)} -> ${name} (${(before.length / 1024).toFixed(1)} kB -> ${(after.length / 1024).toFixed(1)} kB)`,
          );
        }
        for (const [file, text] of texts) {
          let out = text;
          for (const [from, to] of renames) out = out.replaceAll(`/${from}`, `/${to}`);
          if (out !== text) await writeFile(file, out);
        }
      },
    },
  };
}
