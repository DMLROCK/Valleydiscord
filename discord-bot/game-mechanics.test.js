"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  MAX_SECURITY_GUARDS,
  SECURITY_GUARD_PRICE,
  SECURITY_GUARD_WAGE,
  resolveBusinessSecurity,
  resolveSportsBet
} = require("./game-mechanics");

test("sports bets return the correct fake-cash win and loss amounts", () => {
  assert.deepEqual(resolveSportsBet(100, "home", "home"), {
    won: true,
    payout: 200,
    netChange: 100
  });
  assert.deepEqual(resolveSportsBet(100, "away", "home"), {
    won: false,
    payout: 0,
    netChange: -100
  });
  assert.throws(() => resolveSportsBet(0, "home", "home"), RangeError);
});

test("unguarded business collections can have a simulated security loss", () => {
  const result = resolveBusinessSecurity(1000, 0, 0);
  assert.equal(result.incidentAttempted, true);
  assert.equal(result.incidentLoss, 400);
  assert.equal(result.payroll, 0);
  assert.equal(result.net, 600);
});

test("maximum guard coverage blocks collection losses and caps payroll", () => {
  assert.equal(MAX_SECURITY_GUARDS, 5);
  assert.equal(SECURITY_GUARD_PRICE, 1200);
  assert.equal(SECURITY_GUARD_WAGE, 10);

  const result = resolveBusinessSecurity(1000, 10, 0);
  assert.equal(result.guards, 5);
  assert.equal(result.incidentAttempted, true);
  assert.equal(result.incidentLoss, 0);
  assert.equal(result.payroll, 50);
  assert.equal(result.net, 950);
});

test("guard payroll never drives a business collection below zero", () => {
  const result = resolveBusinessSecurity(20, 5, 1);
  assert.equal(result.incidentLoss, 0);
  assert.equal(result.payroll, 20);
  assert.equal(result.net, 0);
});