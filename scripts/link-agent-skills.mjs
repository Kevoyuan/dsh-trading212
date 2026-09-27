#!/usr/bin/env node
/**
 * link-agent-skills — 把外部技能库按需软链进 WorkBuddy 的用户级技能目录。
 *
 * 背景：WorkBuddy 只扫描固定目录（`~/.workbuddy-ai/skills` 等）。
 * 外部的技能集合（比如 /Volumes/SSD/dotdirs/agents/skills，近千个技能）
 * 不能直接配置为搜索路径，但可以逐个软链进来——**软链立即生效，无需重启**。
 *
 * ⚠️ 为什么默认不整目录链接：
 * 每个可见技能都会把 name + description 注入每次会话的上下文。
 * 实测该库 968 个可见技能 ≈ 95k tokens —— 会吃掉大半个上下文窗口。
 * 所以本工具只做**按需挑选**。
 *
 * 用法：
 *   node scripts/link-agent-skills.mjs list [关键词]     列出源库技能
 *   node scripts/link-agent-skills.mjs search <关键词>   按名称/描述搜索
 *   node scripts/link-agent-skills.mjs add <名称...>     链接技能
 *   node scripts/link-agent-skills.mjs add --all         链接全部（会先警告）
 *   node scripts/link-agent-skills.mjs remove <名称...>  取消链接
 *   node scripts/link-agent-skills.mjs status            查看已链接 + 上下文开销
 *   node scripts/link-agent-skills.mjs cost              估算当前开销
 *
 * 环境变量：
 *   SKILLS_SRC   源技能库目录（默认 /Volumes/SSD/dotdirs/agents/skills）
 *   SKILLS_DEST  目标目录（默认 ~/.workbuddy-ai/skills）
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SRC = path.resolve(process.env.SKILLS_SRC || '/Volumes/SSD/dotdirs/agents/skills');
const DEST = path.resolve(process.env.SKILLS_DEST || path.join(os.homedir(), '.workbuddy-ai', 'skills'));

/** 每个技能注入上下文的固定开销（路径 + 标签），粗略但稳定。 */
const PER_SKILL_OVERHEAD = 120;
/** 单技能描述超过这个长度就值得警惕。 */
const DESC_WARN_LEN = 500;

// ---------------------------------------------------------------- frontmatter

function readFrontmatter(skillDir) {
  const file = path.join(skillDir, 'SKILL.md');
  let text;
  try {
    text = fs.readFileSync(file, 'utf8').slice(0, 8000);
  } catch {
    return null;
  }
  const m = text.match(/^---\s*\n([\s\S]*?)\n---/);
  const fm = m ? m[1] : '';
  const pick = (key) => {
    const r = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    return r ? r[1].trim().replace(/^["']|["']$/g, '') : '';
  };
  const dmi = pick('disable-model-invocation');
  return {
    name: pick('name') || path.basename(skillDir),
    description: pick('description'),
    quiet: dmi.toLowerCase() === 'true',
  };
}

// ---------------------------------------------------------------------- scan

function scanSource() {
  if (!fs.existsSync(SRC)) {
    fail(`源技能库不存在: ${SRC}`);
  }
  const out = [];
  for (const entry of fs.readdirSync(SRC, { withFileTypes: true })) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const dir = path.join(SRC, entry.name);
    const meta = readFrontmatter(dir);
    if (!meta) continue; // 没有 SKILL.md 就不是技能
    out.push({ dir, folder: entry.name, ...meta });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function scanLinked() {
  if (!fs.existsSync(DEST)) return [];
  const out = [];
  for (const entry of fs.readdirSync(DEST, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    // 只认目录 / 软链：目录里散落的 .json 迁移标记等不是技能
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const p = path.join(DEST, entry.name);
    const isLink = entry.isSymbolicLink();
    let target = '';
    if (isLink) {
      try { target = fs.readlinkSync(p); } catch { /* ignore */ }
    }
    out.push({ name: entry.name, path: p, isLink, target, meta: readFrontmatter(p) });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// ------------------------------------------------------------------- helpers

function fail(msg) {
  console.error(`错误: ${msg}`);
  process.exit(1);
}

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

function contextCost(skills) {
  // 归一化：源库条目把元数据摊平，已链接条目挂在 meta 下
  const norm = skills.map((s) => ({
    name: s.name || '',
    description: s.description ?? s.meta?.description ?? '',
    quiet: Boolean(s.quiet ?? s.meta?.quiet),
  }));
  const visible = norm.filter((s) => !s.quiet);
  const chars = visible.reduce(
    (n, s) => n + s.name.length + s.description.length + PER_SKILL_OVERHEAD,
    0,
  );
  return { visibleCount: visible.length, chars, tokens: Math.round(chars / 4) };
}

// ------------------------------------------------------------------ commands

function cmdList(filter) {
  const all = scanSource();
  const kw = (filter || '').toLowerCase();
  const rows = kw
    ? all.filter((s) => s.name.toLowerCase().includes(kw) || s.description.toLowerCase().includes(kw))
    : all;
  console.log(`${C.bold('源技能库')} ${SRC}`);
  console.log(`${C.dim(`共 ${all.length} 个技能${kw ? `，匹配 "${filter}" 的 ${rows.length} 个` : ''}`)}\n`);
  for (const s of rows.slice(0, 200)) {
    const tag = s.quiet ? C.dim(' [quiet]') : '';
    console.log(`  ${C.cyan(s.name)}${tag}`);
    if (s.description) console.log(`    ${C.dim(s.description.slice(0, 110))}`);
  }
  if (rows.length > 200) console.log(C.dim(`\n  … 还有 ${rows.length - 200} 个，用关键词收窄`));
}

function cmdAdd(names, all, dryRun) {
  const available = scanSource();
  const byName = new Map(available.map((s) => [s.name, s]));
  const byFolder = new Map(available.map((s) => [s.folder, s]));

  const targets = all
    ? available
    : names.map((n) => byName.get(n) || byFolder.get(n)).filter(Boolean);

  const missing = all ? [] : names.filter((n) => !byName.get(n) && !byFolder.get(n));
  if (missing.length) {
    console.error(C.red(`找不到技能: ${missing.join(', ')}`));
    console.error(C.dim('  用 `list <关键词>` 或 `search <关键词>` 先确认名称'));
    if (!targets.length) process.exit(1);
  }
  if (!targets.length) fail('没有要链接的技能');

  const cost = contextCost(targets);
  if (all || cost.tokens > 20000) {
    console.log(C.yellow(`⚠️  这会向每次会话注入约 ${cost.tokens.toLocaleString()} tokens 的技能清单（${cost.visibleCount} 个技能）。`));
    if (all) {
      console.log(C.dim('   强烈建议改用按需链接：先 search 再 add。'));
    }
  }

  if (dryRun) {
    console.log(C.dim(`\n[dry-run] 将链接 ${targets.length} 个技能，未做任何改动。`));
    return;
  }

  fs.mkdirSync(DEST, { recursive: true });
  let linked = 0, skipped = 0;
  for (const s of targets) {
    const dest = path.join(DEST, s.folder);
    if (fs.existsSync(dest) || isBrokenLink(dest)) {
      const st = safeLstat(dest);
      if (st?.isSymbolicLink()) {
        fs.unlinkSync(dest); // 覆盖旧的软链
      } else {
        console.log(C.yellow(`  跳过 ${s.folder}：目标已存在且不是软链，不覆盖`));
        skipped++;
        continue;
      }
    }
    fs.symlinkSync(s.dir, dest, 'dir');
    console.log(`  ${C.green('✓')} ${s.folder} ${C.dim('→ ' + s.dir)}`);
    linked++;
  }
  console.log(`\n链接 ${linked} 个${skipped ? `，跳过 ${skipped} 个` : ''}。`);
  console.log(C.dim('  软链立即生效，无需重启 WorkBuddy。'));
}

function safeLstat(p) {
  try { return fs.lstatSync(p); } catch { return null; }
}

function isBrokenLink(p) {
  const st = safeLstat(p);
  return !!st?.isSymbolicLink() && !fs.existsSync(p);
}

function cmdRemove(names) {
  let removed = 0, refused = 0;
  for (const n of names) {
    const dest = path.join(DEST, n);
    const st = safeLstat(dest);
    if (!st) {
      console.log(C.yellow(`  未找到 ${n}`));
      continue;
    }
    if (!st.isSymbolicLink()) {
      // 安全护栏：绝不删真实目录
      console.log(C.red(`  拒绝删除 ${n}：不是软链（真实目录/文件），请手动处理`));
      refused++;
      continue;
    }
    fs.unlinkSync(dest);
    console.log(`  ${C.green('✓')} 已取消 ${n}`);
    removed++;
  }
  console.log(`\n取消 ${removed} 个${refused ? `，拒绝 ${refused} 个` : ''}。`);
}

function cmdStatus() {
  const linked = scanLinked();
  const cost = contextCost(linked);
  console.log(`${C.bold('目标目录')} ${DEST}`);
  console.log(`${C.bold('源技能库')} ${SRC}\n`);
  if (!linked.length) {
    console.log(C.dim('  （空）'));
    return;
  }
  for (const s of linked) {
    const kind = s.isLink ? C.cyan('link') : C.yellow('dir ');
    const q = s.meta?.quiet ? C.dim(' [quiet]') : '';
    console.log(`  ${kind} ${s.name}${q}`);
    if (s.isLink && !fs.existsSync(s.path)) {
      console.log(`       ${C.red('断链')} → ${s.target}`);
    }
  }
  console.log(`\n${C.bold('上下文开销')} 可见 ${cost.visibleCount} 个技能 ≈ ${cost.tokens.toLocaleString()} tokens`);
  const broken = linked.filter((s) => s.isLink && !fs.existsSync(s.path));
  if (broken.length) console.log(C.red(`  ${broken.length} 个断链（源目录可能未挂载）`));
}

// ---------------------------------------------------------------------- main

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const names = rest.filter((a) => !a.startsWith('--'));
  const flags = new Set(rest.filter((a) => a.startsWith('--')));

  switch (cmd) {
    case 'list':
      return cmdList(rest[0]);
    case 'search': {
      if (!names.length) fail('用法: search <关键词>');
      return cmdList(names.join(' '));
    }
    case 'add':
      if (!names.length && !flags.has('--all')) fail('用法: add <名称...> 或 add --all');
      return cmdAdd(names, flags.has('--all'), flags.has('--dry-run'));
    case 'remove':
    case 'rm':
      if (!names.length) fail('用法: remove <名称...>');
      return cmdRemove(names);
    case 'status':
      return cmdStatus();
    case 'cost': {
      const cost = contextCost(scanLinked());
      console.log(`可见 ${cost.visibleCount} 个 ≈ ${cost.tokens.toLocaleString()} tokens`);
      return;
    }
    default:
      console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*?/, '').replace(/^ \* ?/gm, ''));
      process.exit(cmd ? 1 : 0);
  }
}

main();
