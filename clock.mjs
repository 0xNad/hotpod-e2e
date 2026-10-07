#!/usr/bin/env node
// Pod Clock: how long until (or since) a round's deadline.
//   node clock.mjs <deadline> [--now <date>]
import { parseArgs } from "node:util";

const die = (why) => {
  process.stderr.write(`clock: ${why}\n`);
  process.exit(1);
};

function toMs(s, label) {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/.test(s ?? "")) die(`${label}: expected YYYY-MM-DDTHH:MM:SSZ`);
  const ms = Date.parse(s);
  // Date.parse rolls 2026-02-30 over to March 2: the round trip catches it.
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 19) !== s.slice(0, 19)) die(`${label}: no such date ${s}`);
  return ms;
}

let opts;
try {
  opts = parseArgs({ options: { now: { type: "string" } }, allowPositionals: true, strict: true });
} catch (e) {
  die(e.message.split("\n")[0]);
}
const { values, positionals } = opts;
if (positionals.length !== 1) die(positionals.length ? "one deadline only" : "usage: node clock.mjs <deadline> [--now <date>]");

const deadline = toMs(positionals[0], "deadline");
const now = values.now === undefined ? Date.now() : toMs(values.now, "--now");
const secs = Math.trunc((deadline - now) / 1000);

const fmt = (t) => {
  const d = Math.floor(t / 86400), h = Math.floor(t / 3600) % 24, m = Math.floor(t / 60) % 60, s = t % 60;
  const two = (n) => String(n).padStart(2, "0");
  if (d) return `${d}d ${two(h)}h ${two(m)}m ${two(s)}s`;
  if (h) return `${h}h ${two(m)}m ${two(s)}s`;
  if (m) return `${m}m ${two(s)}s`;
  return `${s}s`;
};

console.log(secs === 0 ? "closing now" : secs > 0 ? `${fmt(secs)} left` : `closed ${fmt(-secs)} ago`);
