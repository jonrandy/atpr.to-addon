// Builds unpacked, loadable extension folders for Chrome and Firefox into
// dist/<target>/, then packages each: a .zip for Chrome (what the Web
// Store itself wants on upload — Chrome's signed .crx format needs a
// private key and isn't installable by regular users outside the Store or
// an enterprise policy anyway, so it's not a useful local artifact here)
// and a .xpi for Firefox, via web-ext. An .xpi is just a .zip by
// definition — Mozilla's format spec adds nothing else — so renaming
// web-ext's own output is the whole of that step.
//
// Both targets start from the same src/ — the only per-browser difference
// is manifest.json: Firefox needs browser_specific_settings.gecko (a
// stable extension ID across reloads) and supports theme_icons (light/dark
// toolbar icon variants); Chrome has no equivalent for either, so those
// keys are stripped from its copy rather than left in to be silently
// ignored.
//
// Usage:
//   node scripts/build.mjs                 build both targets
//   node scripts/build.mjs --target=chrome  build one target only

import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs/promises"
import { createWriteStream } from "node:fs"
import archiver from "archiver"
import webExt from "web-ext"

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const srcDir = path.join(root, "src")
const distDir = path.join(root, "dist")

const targetArg = process.argv.find(a => a.startsWith("--target="))
const targets = targetArg ? [targetArg.split("=")[1]] : ["chrome", "firefox"]

const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"))
const version = pkg.version

async function prepareUnpacked(target) {
  const outDir = path.join(distDir, target)
  await fs.rm(outDir, { recursive: true, force: true })
  await fs.cp(srcDir, outDir, { recursive: true })

  const manifestPath = path.join(outDir, "manifest.json")
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"))
  manifest.version = version

  if (target === "chrome") {
    delete manifest.browser_specific_settings
    if (manifest.action) delete manifest.action.theme_icons
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n")
  console.log(`[${target}] unpacked build ready: ${path.relative(root, outDir)}/`)
  return outDir
}

function zipDir(dir, zipPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath)
    const archive = archiver("zip", { zlib: { level: 9 } })
    output.on("close", resolve)
    archive.on("error", reject)
    archive.pipe(output)
    archive.directory(dir, false)
    archive.finalize()
  })
}

async function buildChrome() {
  const outDir = await prepareUnpacked("chrome")
  const zipPath = path.join(distDir, `atpr-to-addon-${version}-chrome.zip`)
  await zipDir(outDir, zipPath)
  console.log(`[chrome] packed: ${path.relative(root, zipPath)}`)
}

async function buildFirefox() {
  const outDir = await prepareUnpacked("firefox")
  // web-ext owns the Firefox packaging step: it validates the manifest
  // against Firefox's schema (catching mistakes a hand-rolled zip
  // wouldn't) and names/writes the artifact itself.
  const result = await webExt.cmd.build({ sourceDir: outDir, artifactsDir: distDir, overwriteDest: true }, { shouldExitProgram: false })
  // web-ext always names its output *.zip — an .xpi is byte-for-byte the
  // same format, so this rename is the whole conversion, not a shortcut.
  const finalName = `atpr-to-addon-${version}-firefox.xpi`
  const finalPath = path.join(distDir, finalName)
  if (result.extensionPath !== finalPath) {
    await fs.rename(result.extensionPath, finalPath)
  }
  console.log(`[firefox] packed: ${path.relative(root, finalPath)}`)
}

for (const target of targets) {
  if (target === "chrome") await buildChrome()
  else if (target === "firefox") await buildFirefox()
  else throw new Error(`Unknown target: ${target}`)
}