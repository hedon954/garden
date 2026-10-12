import assert from "node:assert/strict";
import test from "node:test";
import { bits32, bits64, bytes, fixed, formatValue, isValidFormat, percent, si, thousands } from "../ui/core/format.mjs";

test("bytes uses binary units with up to three significant digits", () => {
  assert.equal(bytes(536870912), "512 MiB");
  assert.equal(bytes(34359738368), "32 GiB");
  assert.equal(bytes(1536), "1.5 KiB");
  assert.equal(bytes(512), "512 B");
});

test("si, thousands, percent and fixed follow the documented rules", () => {
  assert.equal(si(32768), "32.8K");
  assert.equal(si(1200000), "1.2M");
  assert.equal(thousands(32768), "32,768");
  assert.equal(thousands(-1234.5), "-1,234.5");
  assert.equal(percent(0.125), "13%");
  assert.equal(percent(0.125, 1), "12.5%");
  assert.equal(fixed(3.14159, 2), "3.14");
});

test("formatValue maps format names and hides non-finite values", () => {
  assert.equal(formatValue(0.30000000000000004), "0.30000000000000004");
  assert.equal(formatValue(536870912, "bytes"), "512 MiB");
  assert.equal(formatValue(0.5, "percent:1"), "50.0%");
  assert.equal(formatValue(2, "fixed:2"), "2.00");
  assert.equal(formatValue(Number.POSITIVE_INFINITY), "—");
  assert.equal(formatValue(undefined), "—");
});

test("validates format names", () => {
  assert.equal(isValidFormat("fixed:3"), true);
  assert.equal(isValidFormat("percent"), true);
  assert.equal(isValidFormat("money"), false);
});

test("shows IEEE-754 bit layouts", () => {
  assert.equal(bits64(0.5), "0 01111111110 0000000000000000000000000000000000000000000000000000");
  assert.equal(bits32(1), "0 01111111 00000000000000000000000");
});
