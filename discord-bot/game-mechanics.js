"use strict";

const MAX_SECURITY_GUARDS = 5;
const SECURITY_GUARD_PRICE = 1200;
const SECURITY_GUARD_WAGE = 10;

function normalizeSide(side) {
  if (typeof side !== "string") return null;
  const normalized = side.trim().toLowerCase();
  return ["home", "away"].includes(normalized) ? normalized : null;
}

function resolveSportsBet(amount, pickedSide, winningSide) {
  const stake = Number(amount);
  if (!Number.isSafeInteger(stake) || stake < 1) {
    throw new RangeError("A Valley bet must be a positive whole number.");
  }

  const normalizedPicked = normalizeSide(pickedSide);
  const normalizedWinning = normalizeSide(winningSide);

  if (!normalizedPicked || !normalizedWinning) {
    throw new RangeError("A Valley bet must use a valid match side.");
  }

  const won = normalizedPicked === normalizedWinning;
  return {
    won,
    payout: won ? stake * 2 : 0,
    netChange: won ? stake : -stake
  };
}

function resolveBusinessSecurity(baseIncome, guardCount, roll = Math.random()) {
  const gross = Math.max(0, Math.floor(Number(baseIncome) || 0));
  const guards = Math.max(0, Math.min(MAX_SECURITY_GUARDS, Math.floor(Number(guardCount) || 0)));

  const numericRoll = Number(roll);
  const safeRoll = Number.isFinite(numericRoll) ? numericRoll : 0;

  const incidentChance = Math.max(0.05, 0.25 - guards * 0.04);
  const lossRate = Math.max(0, 0.4 - guards * 0.08);
  const incidentAttempted = safeRoll < incidentChance;
  const incidentLoss = incidentAttempted ? Math.floor(gross * lossRate) : 0;
  const payrollCap = guards * SECURITY_GUARD_WAGE;
  const payroll = Math.min(Math.max(0, gross - incidentLoss), payrollCap);

  return {
    gross,
    guards,
    incidentChance,
    incidentAttempted,
    incidentLoss,
    payroll,
    net: gross - incidentLoss - payroll
  };
}

module.exports = {
  MAX_SECURITY_GUARDS,
  SECURITY_GUARD_PRICE,
  SECURITY_GUARD_WAGE,
  resolveBusinessSecurity,
  resolveSportsBet
};
