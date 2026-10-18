import assert from "node:assert/strict";
import test from "node:test";
import { REFERENCE_SPLIT_AT, referenceColumns, referenceDomain } from "../ui/garden/references.mjs";

test("referenceDomain: the link's host, without www", () => {
  assert.equal(referenceDomain("https://platform.openai.com/docs/guides/prompt-caching"), "platform.openai.com");
  assert.equal(referenceDomain("https://www.anthropic.com/news"), "anthropic.com");
  assert.equal(referenceDomain("http://WWW.Example.COM:8080/a?b#c"), "example.com");
  assert.equal(referenceDomain("  https://help.aliyun.com/x  "), "help.aliyun.com");
  // www only comes off the front
  assert.equal(referenceDomain("https://docs.www.dev/"), "docs.www.dev");
});

test("referenceDomain: nothing for missing or unusable links", () => {
  assert.equal(referenceDomain(undefined), "");
  assert.equal(referenceDomain(""), "");
  assert.equal(referenceDomain("not a url"), "");
  assert.equal(referenceDomain("mailto:a@b.c"), "");
  assert.equal(referenceDomain("ftp://files.example.com/a"), "");
});

test("referenceColumns: short lists stay in one column", () => {
  assert.equal(REFERENCE_SPLIT_AT, 6);
  assert.equal(referenceColumns(1), 1);
  assert.equal(referenceColumns(5), 1);
  assert.equal(referenceColumns(6), 2);
  assert.equal(referenceColumns(40), 2);
});
