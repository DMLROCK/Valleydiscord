"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PRODUCTS, SPORTS } = require("./index");
const { PRODUCT_DESCRIPTIONS } = require("./catalog-content");

test("every dispensary product has original artwork and detail copy", () => {
  for (const [productId, product] of Object.entries(PRODUCTS)) {
    assert.ok(
      fs.existsSync(path.join(__dirname, "assets", "products", `${productId}.jpg`)),
      `missing artwork for ${productId}`
    );
    assert.ok(PRODUCT_DESCRIPTIONS[productId], `missing description for ${product.name}`);
  }
});

test("every fictional sports matchup has an animated play asset", () => {
  for (const sport of Object.values(SPORTS)) {
    assert.ok(
      fs.existsSync(path.join(__dirname, "assets", "sports", sport.image)),
      `missing animated play for ${sport.label}`
    );
  }
});