#!/usr/bin/env node
/**
 * npm workspaces 会把 @dcloudio/* 提升到仓库根 node_modules。
 * HBuilderX 只在 apps/<miniapp>/node_modules 下解析 uni.js，
 * 本脚本为指定小程序包补齐指向根目录的软链接。
 *
 * 另：HBuilderX 在 Apple Silicon 上常以 Rosetta(x64) Node 运行，
 * 需额外安装 rollup/esbuild 的 darwin-x64 原生包。
 *
 * Usage:
 *   node scripts/link-uni-local-deps.mjs
 *   node scripts/link-uni-local-deps.mjs miniapp-customer
 *   node scripts/link-uni-local-deps.mjs miniapp-customer miniapp-worker
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const DEFAULT_APPS = ['miniapp-customer', 'miniapp-worker'];
const PACKAGES = ['vite-plugin-uni', 'uni-mp-weixin', 'uni-automator'];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Force-install a platform-specific optional package for HBuilderX/Rosetta (x64).
 * @param {{ parentPkg: string, scopedPkg: string, checkDir: string }} opts
 */
function ensureNativeX64Package({ parentPkg, scopedPkg, checkDir }) {
  const targetDir = path.join(repoRoot, 'node_modules', ...checkDir.split('/'));
  if (fs.existsSync(path.join(targetDir, 'package.json'))) {
    console.log(`[ok] ${scopedPkg} already present`);
    return true;
  }

  const parentPkgPath = path.join(repoRoot, 'node_modules', parentPkg, 'package.json');
  if (!fs.existsSync(parentPkgPath)) {
    console.error(`[missing] ${parentPkg} — run npm install at repo root first`);
    return false;
  }
  const { version } = JSON.parse(fs.readFileSync(parentPkgPath, 'utf8'));
  console.log(`[info] installing ${scopedPkg}@${version} (--force for Rosetta/HBuilderX)`);
  try {
    execSync(`npm install ${scopedPkg}@${version} --force --no-save`, {
      cwd: repoRoot,
      stdio: 'inherit',
    });
  } catch (err) {
    console.error(`[fail] could not install ${scopedPkg}`, err.message);
    return false;
  }

  if (!fs.existsSync(path.join(targetDir, 'package.json'))) {
    console.error(`[fail] ${scopedPkg} still missing after install`);
    return false;
  }
  console.log(`[ok] ${scopedPkg} installed`);
  return true;
}

function ensureRosettaNativeDeps() {
  let ok = true;
  ok =
    ensureNativeX64Package({
      parentPkg: 'rollup',
      scopedPkg: '@rollup/rollup-darwin-x64',
      checkDir: '@rollup/rollup-darwin-x64',
    }) && ok;
  ok =
    ensureNativeX64Package({
      parentPkg: 'esbuild',
      scopedPkg: '@esbuild/darwin-x64',
      checkDir: '@esbuild/darwin-x64',
    }) && ok;
  return ok;
}

function linkPath(target, linkPathAbs) {
  try {
    fs.lstatSync(linkPathAbs);
    fs.rmSync(linkPathAbs, { recursive: true, force: true });
  } catch {
    // path does not exist
  }
  fs.symlinkSync(target, linkPathAbs);
}

function linkApp(appName) {
  const appRoot = path.join(repoRoot, 'apps', appName);
  if (!fs.existsSync(appRoot)) {
    console.error(`[skip] apps/${appName} not found`);
    return false;
  }

  const dcloudLocal = path.join(appRoot, 'node_modules', '@dcloudio');
  const binLocal = path.join(appRoot, 'node_modules', '.bin');
  ensureDir(dcloudLocal);
  ensureDir(binLocal);

  let ok = true;
  for (const pkg of PACKAGES) {
    const dst = path.join(dcloudLocal, pkg);

    // When npm installs a package workspace-local as a real directory (e.g.
    // vite-plugin-uni when there is a vite peer-dep version conflict between
    // miniapp apps and the admin app), leave it in place and skip the symlink.
    try {
      const st = fs.lstatSync(dst);
      if (st.isDirectory() && !st.isSymbolicLink()) {
        console.log(`[ok] apps/${appName}/node_modules/@dcloudio/${pkg} (workspace-local, kept)`);
        continue;
      }
    } catch {
      // not present yet — fall through to symlink creation
    }

    const src = path.join(repoRoot, 'node_modules', '@dcloudio', pkg);
    if (!fs.existsSync(src)) {
      console.error(`[missing] root node_modules/@dcloudio/${pkg}`);
      ok = false;
      continue;
    }
    // from apps/<app>/node_modules/@dcloudio -> repo root: ../../../../
    const rel = path.join('..', '..', '..', '..', 'node_modules', '@dcloudio', pkg);
    linkPath(rel, dst);
    console.log(`[ok] apps/${appName}/node_modules/@dcloudio/${pkg}`);
  }

  // .bin/uni: prefer root symlink; accept workspace-local if npm put vite-plugin-uni
  // there due to vite peer-dep version conflict (root .bin/uni won't exist then).
  const rootBinUni = path.join(repoRoot, 'node_modules', '.bin', 'uni');
  const localBinUni = path.join(binLocal, 'uni');
  if (fs.existsSync(rootBinUni)) {
    const rel = path.join('..', '..', '..', '..', 'node_modules', '.bin', 'uni');
    linkPath(rel, localBinUni);
    console.log(`[ok] apps/${appName}/node_modules/.bin/uni`);
  } else {
    // Accept an existing workspace-local .bin/uni created by npm
    try {
      fs.lstatSync(localBinUni);
      console.log(`[ok] apps/${appName}/node_modules/.bin/uni (workspace-local)`);
    } catch {
      console.error('[missing] node_modules/.bin/uni (root and workspace-local)');
      ok = false;
    }
  }

  const uniJs = path.join(dcloudLocal, 'vite-plugin-uni', 'bin', 'uni.js');
  if (!fs.existsSync(uniJs)) {
    console.error(`[fail] cannot resolve ${uniJs}`);
    ok = false;
  } else {
    console.log(`[ok] uni.js -> ${fs.realpathSync(uniJs)}`);
  }

  return ok;
}

/**
 * CLI 工程用 HBuilderX 运行时，旧版 uni-mp-vite 会用 runByHBuilderX() 加载 bytenode，
 * 易触发 cachedDataRejected。与 HX 新版对齐：改为 isInHBuilderX()。
 */
function patchUniMpViteForHBuilderX() {
  const target = path.join(
    repoRoot,
    'node_modules',
    '@dcloudio',
    'uni-mp-vite',
    'dist',
    'index.js',
  );
  if (!fs.existsSync(target)) {
    console.error('[skip] @dcloudio/uni-mp-vite/dist/index.js not found');
    return false;
  }
  const before = fs.readFileSync(target, 'utf8');
  const needle =
    'if ((0, uni_cli_shared_1.runByHBuilderX)() && process.env.UNI_PLATFORM === \'mp-weixin\')';
  const replacement =
    'if ((0, uni_cli_shared_1.isInHBuilderX)() && process.env.UNI_PLATFORM === \'mp-weixin\')';
  if (before.includes(replacement) && !before.includes(needle)) {
    console.log('[ok] uni-mp-vite already patched for isInHBuilderX');
    return true;
  }
  if (!before.includes(needle)) {
    console.log('[skip] uni-mp-vite UUVP guard pattern not found (maybe already newer)');
    return true;
  }
  fs.writeFileSync(target, before.replace(needle, replacement));
  console.log('[ok] patched uni-mp-vite: runByHBuilderX -> isInHBuilderX');
  return true;
}

/**
 * npm 会给 @dcloudio/vite-plugin-uni、uni-mp-compiler 等各自嵌一套 uni-cli-shared。
 * easycom 的组件表在模块顶层缓存；init 与 match 若不在同一份模块实例上，
 * 小程序编译会 matchEasycom miss，uni-nav-bar 等进不了 usingComponents。
 *
 * 策略：以 vite-plugin-uni 内嵌的那份为唯一真源（含其配套 node_modules），
 * 其余副本全部改成指向它的相对软链。不要提升到仓库根目录——会丢私有依赖解析。
 */
function collectDcloudPackageCopies(pkgName) {
  /** @type {string[]} */
  const found = [];
  const roots = [
    path.join(repoRoot, 'node_modules', '@dcloudio'),
    ...DEFAULT_APPS.map((app) =>
      path.join(repoRoot, 'apps', app, 'node_modules', '@dcloudio'),
    ),
  ];

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    let pkgs = [];
    try {
      pkgs = fs.readdirSync(root);
    } catch {
      continue;
    }
    for (const pkg of pkgs) {
      const direct = path.join(root, pkg);
      // include broken symlinks via lstat
      if (pkg === pkgName) {
        try {
          fs.lstatSync(direct);
          found.push(direct);
        } catch {
          // ignore
        }
      }
      const nested = path.join(root, pkg, 'node_modules', '@dcloudio', pkgName);
      try {
        fs.lstatSync(nested);
        found.push(nested);
      } catch {
        // ignore
      }
    }
  }
  return [...new Set(found.map((p) => path.resolve(p)))];
}

function ensureRealPackageAt(target, sourceHint) {
  ensureDir(path.dirname(target));
  try {
    const st = fs.lstatSync(target);
    if (st.isSymbolicLink()) {
      fs.rmSync(target, { recursive: true, force: true });
    } else if (st.isDirectory()) {
      // Validate completeness: a partial copy lacks package.json
      if (fs.existsSync(path.join(target, 'package.json'))) {
        return true;
      }
      // Partial copy — remove and redo
      fs.rmSync(target, { recursive: true, force: true });
    }
  } catch {
    // missing
  }
  // Use path.resolve (not fs.realpathSync) to avoid \\?\ extended-path prefix on Windows,
  // which can cause ENOENT in fs.cpSync internals on some Node versions.
  const source = path.resolve(sourceHint);
  // dereference:true copies symlink targets as plain files, avoiding Windows
  // symlink-creation privilege requirements and broken-symlink ENOENT errors.
  fs.cpSync(source, target, { recursive: true, dereference: true });
  return true;
}

function dedupeUniCliShared() {
  const pkgName = 'uni-cli-shared';
  const preferred = path.join(
    repoRoot,
    'node_modules',
    '@dcloudio',
    'vite-plugin-uni',
    'node_modules',
    '@dcloudio',
    pkgName,
  );
  const unique = collectDcloudPackageCopies(pkgName);
  if (unique.length === 0 && !fs.existsSync(preferred)) {
    console.error(`[missing] no @dcloudio/${pkgName} found`);
    return false;
  }

  // 若先前错误提升到了仓库根，先删掉
  const badRoot = path.join(repoRoot, 'node_modules', '@dcloudio', pkgName);
  if (fs.existsSync(badRoot) || (() => { try { fs.lstatSync(badRoot); return true; } catch { return false; } })()) {
    const underVite = path.resolve(badRoot) === path.resolve(preferred);
    if (!underVite) {
      let preferredOk = false;
      try {
        preferredOk = fs.lstatSync(preferred).isDirectory() && !fs.lstatSync(preferred).isSymbolicLink();
      } catch {
        preferredOk = false;
      }
      if (!preferredOk) {
        // If badRoot is the ONLY copy across the whole project, npm has already
        // hoisted uni-cli-shared to root and it is already a singleton.
        // Copying it to a nested location is unnecessary and harmful on Windows.
        const allCopies = collectDcloudPackageCopies(pkgName);
        const uniqueReals = [
          ...new Set(
            allCopies.map((p) => {
              try { return path.resolve(fs.realpathSync(p)); } catch { return path.resolve(p); }
            }),
          ),
        ];
        const badRootReal = (() => {
          try { return path.resolve(fs.realpathSync(badRoot)); } catch { return path.resolve(badRoot); }
        })();
        const isSingleton =
          uniqueReals.length === 1 && uniqueReals[0] === badRootReal;
        if (isSingleton) {
          console.log(
            `[ok] @dcloudio/${pkgName} is singleton at root (npm hoisted) — no dedup needed`,
          );
          return true;
        }
        try {
          ensureRealPackageAt(preferred, badRoot);
          console.log(`[ok] restored canonical ${path.relative(repoRoot, preferred)}`);
        } catch (e) {
          console.error('[fail] cannot restore canonical uni-cli-shared', e.message);
          return false;
        }
      }
      fs.rmSync(badRoot, { recursive: true, force: true });
      console.log('[ok] removed hoisted root @dcloudio/uni-cli-shared');
    }
  }

  let preferredOk = false;
  try {
    preferredOk = fs.lstatSync(preferred).isDirectory() && !fs.lstatSync(preferred).isSymbolicLink();
  } catch {
    preferredOk = false;
  }
  if (!preferredOk) {
    console.error(
      `[fail] canonical missing: ${path.relative(repoRoot, preferred)}. Reinstall @dcloudio/uni-cli-shared under vite-plugin-uni first.`,
    );
    return false;
  }
  console.log(`[ok] canonical @dcloudio/${pkgName} -> ${path.relative(repoRoot, preferred)}`);

  const preferredReal = fs.realpathSync(preferred);
  let linked = 0;
  for (const copy of collectDcloudPackageCopies(pkgName)) {
    // apps/*/node_modules/@dcloudio/vite-plugin-uni 常是指向根目录的软链，
    // 其下的 uni-cli-shared 与 preferred 是同一 inode，绝不能再 link 覆盖真源
    let copyReal = null;
    try {
      copyReal = fs.realpathSync(copy);
    } catch {
      copyReal = null; // broken symlink
    }
    if (copyReal && path.resolve(copyReal) === path.resolve(preferredReal)) {
      continue;
    }
    if (path.resolve(copy) === path.resolve(preferred)) {
      continue;
    }
    const rel = path.relative(path.dirname(copy), preferred);
    linkPath(rel, copy);
    linked += 1;
    console.log(`[ok] dedupe ${path.relative(repoRoot, copy)} -> ${rel}`);
  }
  console.log(`[ok] uni-cli-shared deduped (${linked} nested copies linked)`);
  return true;
}

const isDarwin = process.platform === 'darwin';
console.log('\nEnsuring Rosetta (darwin-x64) native deps for HBuilderX ...');
let allOk = isDarwin
  ? ensureRosettaNativeDeps()
  : (console.log('[skip] not darwin — skipping Rosetta x64 deps'), true);

console.log('\nPatching uni-mp-vite for HBuilderX CLI projects ...');
allOk = patchUniMpViteForHBuilderX() && allOk;

console.log('\nDeduping @dcloudio/uni-cli-shared (easycom singleton) ...');
allOk = dedupeUniCliShared() && allOk;

const apps = process.argv.slice(2);
const targets = apps.length > 0 ? apps : DEFAULT_APPS;
for (const app of targets) {
  console.log(`\nLinking HBuilderX deps for apps/${app} ...`);
  if (!linkApp(app)) allOk = false;
}

if (!allOk) {
  process.exit(1);
}
console.log('\nDone.');
