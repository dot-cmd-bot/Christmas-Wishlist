#!/usr/bin/env node
/**
 * Copies the face-api model weights bundled with @vladmandic/face-api
 * into public/models so they are served statically (and committed).
 *
 * The models are already committed in public/models, so this only needs
 * to be re-run if you upgrade the face-api package.
 */
import { copyFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const sourceDir = join(
  root,
  "node_modules",
  "@vladmandic",
  "face-api",
  "model",
);
const targetDir = join(root, "public", "models");

if (!existsSync(sourceDir)) {
  console.error("Could not find face-api model directory. Run `npm install` first.");
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });

const keep = [
  "ssd_mobilenetv1_model",
  "face_landmark_68_model",
  "face_recognition_model",
];

let count = 0;
for (const file of readdirSync(sourceDir)) {
  const base = file.replace("-weights_manifest.json", "").replace(".bin", "");
  if (keep.includes(base)) {
    copyFileSync(join(sourceDir, file), join(targetDir, file));
    console.log("copied", file);
    count += 1;
  }
}

console.log(`Done. Copied ${count} model files into public/models.`);
