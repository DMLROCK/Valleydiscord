"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createDefaultUser, normalizeUserRecord } = require("./user-data");

test("new Valley profiles receive safe defaults", () => {
  const user = normalizeUserRecord(createDefaultUser("new-user", "New Player"), "new-user", "New Player");

  assert.equal(user.username, "New Player");
  assert.equal(user.cash, 250);
  assert.equal(user.bank, 0);
  assert.equal(user.house.owned, false);
  assert.equal(user.inventory.flower, 0);
  assert.deepEqual(user.celebritySessions, { snoop: 0 });
  assert.deepEqual(user.sportsStats, { bets: 0, wins: 0, losses: 0, net: 0 });
});

test("legacy balances, inventory, house, and unknown fields survive normalization", () => {
  const legacy = {
    id: "old-user",
    name: "Legacy Player",
    cash: 725,
    vault: 310,
    weed: 4.5,
    carts: 2,
    house: true,
    storage: 180,
    lastDaily: 1234,
    lastJob: 4321,
    oldAchievement: "kept"
  };

  const user = normalizeUserRecord(legacy, "old-user", "Discord Name");

  assert.equal(user.username, "Legacy Player");
  assert.equal(user.cash, 725);
  assert.equal(user.bank, 310);
  assert.equal(user.inventory.flower, 4.5);
  assert.equal(user.inventory.carts, 2);
  assert.equal(user.house.owned, true);
  assert.equal(user.house.storage, 180);
  assert.equal(user.dailyClaimed, 1234);
  assert.equal(user.lastWork, 4321);
  assert.equal(user.oldAchievement, "kept");
});

test("bad legacy data is sanitized without crashing", () => {
  const user = normalizeUserRecord({
    id: "bad-user",
    username: "",
    cash: "NaN",
    house: true,
    inventory: { flower: "invalid" },
    celebritySessions: null,
    sportsStats: { wins: "oops" }
  }, "bad-user", "Bad User");

  assert.equal(user.username, "Bad User");
  assert.equal(user.cash, 250);
  assert.equal(user.house.owned, true);
  assert.equal(user.house.storage, 100);
  assert.equal(user.inventory.flower, 0);
  assert.deepEqual(user.celebritySessions, { snoop: 0 });
  assert.equal(user.sportsStats.wins, 0);
});

test("current inventory and player data are preserved while new fields are added", () => {
  const user = normalizeUserRecord({
    id: "current-user",
    username: "Current Player",
    cash: 0,
    bank: 500,
    inventory: {
      flower: 1.5,
      carts: 0.5,
      edibles: { gummy_10: 2 },
      bongs: { basic_bong: 1 }
    },
    house: { owned: true, storage: 240 },
    businesses: ["business-1"]
  }, "current-user", "Current Player");

  assert.equal(user.cash, 0);
  assert.equal(user.bank, 500);
  assert.equal(user.inventory.flower, 1.5);
  assert.equal(user.inventory.edibles.gummy_10, 2);
  assert.equal(user.inventory.bongs.basic_bong, 1);
  assert.equal(user.house.storage, 240);
  assert.deepEqual(user.businesses, ["business-1"]);
});
