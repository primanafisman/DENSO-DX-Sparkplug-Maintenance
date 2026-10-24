import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { zipSync } from "../Backend/node_modules/fflate/esm/index.mjs";
import { releaseFiles } from "../Backend/scripts/package-release.js";
import { verifyModels } from "../Backend/scripts/verify-models.js";
export async function applicationFiles(root) {
  const files = (await releaseFiles(path.join(root, "Backend"))).map(
    (p) => "Backend/" + p,
  );
  async function scan(relative, dist = false) {
    let entries;
    try {
      entries = await fs.readdir(path.join(root, relative), {
        withFileTypes: true,
      });
    } catch (e) {
      if (e.code === "ENOENT") return;
      throw e;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink())
        throw new Error("Application bundle refuses symlinks.");
      if (
        entry.name.startsWith(".") ||
        [
          "runtime",
          "node_modules",
          ".venv",
          "coverage",
          "release",
          "__pycache__",
        ].includes(entry.name)
      )
        continue;
      const name = relative + "/" + entry.name;
      if (entry.isDirectory()) await scan(name, dist);
      else if (
        !/(?:test-access|online-access|password|secret)|\.(?:log|db|sqlite|pem|key|pfx|p12|zip)$/i.test(
          name,
        ) &&
        (dist ||
          name === "Frontend/src/assets/denso-logo.png" ||
          /\.(?:[cm]?js|tsx?|json|css|html|md|cmd|ps1|svg)$/.test(name))
      )
        files.push(name);
    }
  }
  for (const directory of [
    "Frontend/src",
    "Frontend/scripts",
    "Frontend/docs",
    "Frontend/public",
    "scripts",
  ])
    await scan(directory);
  await scan("Frontend/dist", true);
  for (const file of [
    "setup.cmd",
    "start.cmd",
    "stop.cmd",
    "README.md",
    "Frontend/package.json",
    "Frontend/package-lock.json",
    "Frontend/index.html",
    "Frontend/vite.config.ts",
    "Frontend/tsconfig.json",
    "Frontend/eslint.config.js",
    "Frontend/.env.example",
    "Frontend/.gitignore",
    "Frontend/.prettierrc.json",
    "Frontend/README.md",
    "Frontend/setup.cmd",
    "Frontend/check.cmd",
  ])
    try {
      const stat = await fs.lstat(path.join(root, file));
      if (!stat.isFile() || stat.isSymbolicLink())
        throw new Error("Bundle requires regular source files.");
      files.push(file);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  return [...new Set(files)].sort();
}
export async function packageApplication(root) {
  await verifyModels(path.join(root, "Backend/cv_engine/models/ocr"));
  await fs.access(path.join(root, "Frontend/dist/index.html"));
  const files = await applicationFiles(root),
    entries = {},
    manifest = [];
  for (const file of files) {
    const bytes = await fs.readFile(path.join(root, file));
    entries[file] = bytes;
    manifest.push({
      path: file,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  entries["APPLICATION-MANIFEST.json"] = Buffer.from(
    JSON.stringify(
      {
        version: "1.1.0",
        generated_at: new Date().toISOString(),
        files: manifest,
      },
      null,
      2,
    ),
  );
  await fs.mkdir(path.join(root, "release"), { recursive: true });
  const output = path.join(
    root,
    "release",
    "sparkplug-maintenance-1.1.0-application.zip",
  );
  await fs.writeFile(output, zipSync(entries, { level: 6 }));
  return {
    output,
    files: files.length,
    bytes: (await fs.stat(output)).size,
    sha256: createHash("sha256")
      .update(await fs.readFile(output))
      .digest("hex"),
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(
    JSON.stringify(
      await packageApplication(
        path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
      ),
      null,
      2,
    ),
  );

