// Round 1's checks: the clock (the round's brief has the interface). Run them yourself from the
// repository's root: node .launchpad/checks/round-1/run.mjs
import { entry, refuses, succeeds } from "./lib/entry.mjs";
import { check, harness } from "./lib/harness.mjs";

const { test, done } = harness();
const clock = entry("node", ["clock.mjs"]);
const NOW = "2026-10-07T12:00:00Z";
const at = (secs) => new Date(Date.parse(NOW) + secs * 1000).toISOString();

/** The one line clock.mjs prints for a deadline `secs` seconds from NOW. */
async function line(secs, deadline = at(secs)) {
  const r = await succeeds(clock, [deadline, "--now", NOW], `deadline ${deadline}`);
  check(r.out.endsWith("\n") && !r.out.slice(0, -1).includes("\n"), `deadline ${deadline}: expected one line ending in a newline, got ${JSON.stringify(r.out)}`);
  return r.out.trim();
}
const expect = async (secs, want, deadline) => {
  const got = await line(secs, deadline);
  check(got === want, `${secs} s: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
};

await test("counts down to a deadline", async () => {
  await expect(9, "9s left");
  await expect(69, "1m 09s left");
  await expect(7509, "2h 05m 09s left");
  await expect(3600, "1h 00m 00s left");
  await expect(93784, "1d 02h 03m 04s left");
  await expect(9.9, "9s left", at(9.9)); // whole seconds, cut toward zero
});

await test("says when the deadline is now or past", async () => {
  await expect(0, "closing now");
  await expect(0.4, "closing now", at(0.4));
  await expect(-190, "closed 3m 10s ago");
  await expect(-90061, "closed 1d 01h 01m 01s ago");
});

await test("reads the clock when --now is left out", async () => {
  const soon = await succeeds(clock, [new Date(Date.now() + 3 * 86400_000).toISOString()], "a deadline in three days");
  check(/^[23]d \d\dh \d\dm \d\ds left\n$/.test(soon.out), `three days ahead: got ${JSON.stringify(soon.out)}`);
  const past = await succeeds(clock, ["2020-01-01T00:00:00Z"], "a deadline in 2020");
  check(/^closed \d+d \d\dh \d\dm \d\ds ago\n$/.test(past.out), `2020: got ${JSON.stringify(past.out)}`);
});

await test("refuses bad input with a reason on stderr and nothing on stdout", async () => {
  await succeeds(clock, [at(60), "--now", NOW], "a valid deadline"); // so a program that refuses everything fails here
  await refuses(clock, [], "no deadline");
  await refuses(clock, ["tomorrow"], "a deadline that is not a date");
  await refuses(clock, ["2026-10-07T12:00:00"], "a deadline without Z");
  await refuses(clock, ["2026-02-30T12:00:00Z"], "a date that does not exist");
  await refuses(clock, [at(60), "--now"], "--now without a value");
  await refuses(clock, [at(60), "--now", "noon"], "--now that is not a date");
  await refuses(clock, [at(60), "--soon"], "an unknown flag");
  await refuses(clock, [at(60), at(120)], "two deadlines");
});

done();
