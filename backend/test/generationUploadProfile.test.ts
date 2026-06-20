import test from "node:test";
import assert from "node:assert/strict";

import {
  APP_BASIC_MAX_PDF_PAGES,
  LANDING_UPLOAD_PROFILE,
  applyPdfPagePolicy,
  applyTextLengthPolicy,
  buildAppUploadProfile,
} from "../src/config/generationUploadProfile.js";

test("landing profile truncates long text", () => {
  const long = "a".repeat(LANDING_UPLOAD_PROFILE.maxTextChars + 100);
  const result = applyTextLengthPolicy(long, LANDING_UPLOAD_PROFILE);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.text.length, LANDING_UPLOAD_PROFILE.maxTextChars);
    assert.equal(result.truncated, true);
  }
});

test("app profile rejects long text", () => {
  const profile = buildAppUploadProfile("basic");
  const long = "b".repeat(profile.maxTextChars + 1);
  const result = applyTextLengthPolicy(long, profile);
  assert.equal(result.ok, false);
});

test("landing profile keeps first 3 pdf pages only", () => {
  const pages = Array.from({ length: 50 }, (_, index) => ({
    pageIndex: index,
    text: `page ${index}`,
  }));
  const result = applyPdfPagePolicy(pages, 50, LANDING_UPLOAD_PROFILE);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.pages.length, 3);
    assert.equal(LANDING_UPLOAD_PROFILE.maxPdfPages, 3);
    assert.equal(result.truncated, true);
  }
});

test("basic app profile errors on too many pdf pages", () => {
  const profile = buildAppUploadProfile("basic");
  const pages = Array.from({ length: APP_BASIC_MAX_PDF_PAGES + 1 }, (_, index) => ({
    pageIndex: index,
    text: `page ${index}`,
  }));
  const result = applyPdfPagePolicy(pages, pages.length, profile);
  assert.equal(result.ok, false);
});

test("premium app profile allows large pdfs for page selection", () => {
  const profile = buildAppUploadProfile("premium");
  const pages = Array.from({ length: 50 }, (_, index) => ({
    pageIndex: index,
    text: `page ${index}`,
  }));
  const result = applyPdfPagePolicy(pages, 50, profile);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.pages.length, 50);
    assert.equal(result.truncated, false);
    assert.equal(profile.maxSelectablePages, 10);
  }
});

test("premium app profile errors beyond max pdf pages", () => {
  const profile = buildAppUploadProfile("premium");
  const pages = Array.from({ length: profile.maxPdfPages + 1 }, (_, index) => ({
    pageIndex: index,
    text: `page ${index}`,
  }));
  const result = applyPdfPagePolicy(pages, pages.length, profile);
  assert.equal(result.ok, false);
});
