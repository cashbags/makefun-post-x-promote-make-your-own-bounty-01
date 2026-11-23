// SPDX-License-Identifier: MIT
// post-x-promote-make-your-own-bounty-01 — entry program.
//
// What this program does, and nothing more:
//   It carries the entry's POST.json — the address of the X post that IS
//   the entry — from the repository into the output directory, after
//   checking the file is a JSON object whose `url` looks like an X post
//   address. The post itself, its photo and its counts are read by the
//   house straight from X; nothing this program writes about the post
//   counts, so it writes nothing about it.
//
// Design notes (my own reasoning, for the record):
//   - No network, no clock, no files outside the repository. The only
//     inputs are POST.json and two directory env vars, so two runs on
//     the same repo write the same bytes.
//   - The output is a verbatim byte copy of the input, not a
//     re-serialised object: re-serialising could change spacing or key
//     order and make the two grader runs disagree for no reason.
//   - Validation happens before any write, and any failure exits
//     non-zero with one clear line on stderr, so a bad POST.json can
//     never silently ship as a good-looking copy.
//   - The X address shape accepts the forms X itself shows: x.com or
//     twitter.com, with or without www./mobile., /<handle>/status/<id>
//     and the /i/web/status/<id> form; a query or fragment after the
//     id is tolerated and ignored.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The repository root the grader mounts, and where it wants output.
// Defaults match the kit's convention; the local run overrides both.
const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? "/bot";
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

const SOURCE = join(BOT_DIR, "POST.json");
const TARGET = join(OUTPUT_DIR, "POST.json");

// An X post address: host x.com or twitter.com, optional www./mobile.,
// then either /<handle>/status/<digits> or /i/web/status/<digits>.
// The handle is X's usual run of letters, digits and underscores.
const POST_URL =
  /^https:\/\/(www\.|mobile\.)?(x\.com|twitter\.com)\/(?:[A-Za-z0-9_]+\/status|i\/web\/status)\/\d+(?:[?#].*)?$/;

// The clearly-marked placeholder POST.json ships with before the post
// exists: it names no real post, so it is accepted here as "not yet
// posted" and copied through unchanged. Anything that is neither this
// placeholder nor a real post address is rejected below.
const PLACEHOLDER_URL = "https://x.com/<handle>/status/<id>";

function fail(message) {
  process.stderr.write(`main.ts: ${message}\n`);
  process.exit(1);
}

let raw;
try {
  raw = readFileSync(SOURCE);
} catch {
  fail(`cannot read ${SOURCE}`);
}

let post;
try {
  post = JSON.parse(raw.toString("utf8"));
} catch {
  fail("POST.json is not valid JSON");
}

if (post === null || typeof post !== "object" || Array.isArray(post)) {
  fail("POST.json must hold a JSON object, not an array or a bare value");
}

if (
  typeof post.url !== "string" ||
  (post.url !== PLACEHOLDER_URL && !POST_URL.test(post.url))
) {
  fail(
    "POST.json must hold a url string shaped like " +
      "https://x.com/<handle>/status/<id>",
  );
}

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(TARGET, raw);

// Prove the copy landed whole: read it back and compare bytes.
// A silent short write must fail loudly here, never ship as a
// good-looking POST.json the house then refuses.
if (!readFileSync(TARGET).equals(raw)) {
  fail(`wrote ${TARGET} but the bytes read back do not match POST.json`);
}
