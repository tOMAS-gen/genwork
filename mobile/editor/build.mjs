// Run from repository root after npm ci: node mobile/editor/build.mjs
import { build } from "esbuild";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
const result = await build({
  entryPoints: ["mobile/editor/editor.ts"],
  bundle: true,
  minify: true,
  format: "iife",
  outfile: "mobile/assets/editor/editor.js",
  legalComments: "linked",
  metafile: true,
});
const seen = new Set();
const notices = [];
for (const input of Object.keys(result.metafile.inputs)) {
  if (!input.includes("node_modules/")) continue;
  let directory = dirname(resolve(input));
  while (!existsSync(join(directory, "package.json")) && dirname(directory) !== directory)
    directory = dirname(directory);
  if (seen.has(directory)) continue;
  seen.add(directory);
  const pkg = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
  const license = ["LICENSE", "LICENSE.md", "LICENSE.txt", "license", "license.md"].find((f) =>
    existsSync(join(directory, f)),
  );
  if (!license) throw new Error(`Missing bundled license: ${pkg.name}`);
  notices.push(`${pkg.name} ${pkg.version}\n${readFileSync(join(directory, license), "utf8")}`);
}
writeFileSync("mobile/assets/editor/THIRD_PARTY_NOTICES.txt", notices.join("\n\n-----\n\n"));
