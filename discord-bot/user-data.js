"use strict";

const INVENTORY_BUCKETS = [
  "edibles",
  "bongs",
  "lighters",
  "drinks",
  "batteries"
];

function numberOr(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function createDefaultUser(id, username) {
  return {
    id,
    username: username || "Player",
    cash: 250,
    bank: 0,
    xp: 0,
    level: 1,
    phone: null,
    inventory: {
      flower: 0,
      carts: 0,
      edibles: {},
      bongs: {},
      lighters: {},
      drinks: {},
      batteries: {}
    },
    house: {
      owned: false,
      storage: 100
    },
    job: null,
    businesses: [],
    messages: [],
    dailyClaimed: 0,
    lastWork: 0,
    character: null,
    smokeSessions: 0,
    celebritySessions: { snoop: 0 },
    sportsStats: { bets: 0, wins: 0, losses: 0, net: 0 },
    securityGuards: 0
  };
}

function normalizeUserRecord(record, id, username) {
  const user = record && typeof record === "object" && !Array.isArray(record)
    ? { ...record }
    : createDefaultUser(id, username);

  user.id = user.id ?? id ?? "unknown-user";
  user.username = String(user.username || user.name || username || "Player");
  user.cash = numberOr(user.cash, 250);
  user.bank = numberOr(user.bank, numberOr(user.vault, 0));
  user.xp = numberOr(user.xp, 0);
  user.level = Math.max(1, numberOr(user.level, 1));
  user.phone = user.phone ?? null;
  user.job = user.job ?? null;

  const inventory = user.inventory && typeof user.inventory === "object" && !Array.isArray(user.inventory)
    ? { ...user.inventory }
    : {};

  inventory.flower = Math.max(0, numberOr(inventory.flower, numberOr(user.weed, 0)));
  inventory.carts = Math.max(0, numberOr(inventory.carts, numberOr(user.carts, 0)));

  for (const bucket of INVENTORY_BUCKETS) {
    inventory[bucket] = inventory[bucket] &&
      typeof inventory[bucket] === "object" &&
      !Array.isArray(inventory[bucket])
      ? { ...inventory[bucket] }
      : {};
  }
  user.inventory = inventory;

  const previousHouse = user.house;
  const house = previousHouse && typeof previousHouse === "object" && !Array.isArray(previousHouse)
    ? { ...previousHouse }
    : {};

  house.owned = typeof house.owned === "boolean"
    ? house.owned
    : Boolean(previousHouse);
  house.storage = Math.max(
    0,
    numberOr(house.storage, numberOr(user.storage, 100))
  );
  user.house = house;

  user.businesses = Array.isArray(user.businesses) ? user.businesses : [];
  user.messages = Array.isArray(user.messages) ? user.messages : [];
  user.dailyClaimed = numberOr(user.dailyClaimed, numberOr(user.lastDaily, 0));
  user.lastWork = numberOr(user.lastWork, numberOr(user.lastJob, 0));
  user.character = user.character && typeof user.character === "object"
    ? { ...user.character }
    : null;
  user.smokeSessions = Math.max(0, numberOr(user.smokeSessions, 0));

  user.celebritySessions = user.celebritySessions &&
    typeof user.celebritySessions === "object" &&
    !Array.isArray(user.celebritySessions)
    ? { ...user.celebritySessions }
    : {};
  user.celebritySessions.snoop = Math.max(0, numberOr(user.celebritySessions.snoop, 0));

  const sportsStats = user.sportsStats &&
    typeof user.sportsStats === "object" &&
    !Array.isArray(user.sportsStats)
    ? { ...user.sportsStats }
    : {};

  user.sportsStats = {
    bets: Math.max(0, numberOr(sportsStats.bets, 0)),
    wins: Math.max(0, numberOr(sportsStats.wins, 0)),
    losses: Math.max(0, numberOr(sportsStats.losses, 0)),
    net: numberOr(sportsStats.net, 0)
  };

  user.securityGuards = Math.max(0, numberOr(user.securityGuards, 0));
  user.dailyClaimed = Math.max(0, user.dailyClaimed);
  user.lastWork = Math.max(0, user.lastWork);

  return user;
}

module.exports = {
  createDefaultUser,
  normalizeUserRecord
};
