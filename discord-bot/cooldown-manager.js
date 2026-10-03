"use strict";

/**
 * Centralized cooldown management for commands and actions.
 * Prevents spam and rate-limiting issues.
 */
class CooldownManager {
  constructor() {
    this.cooldowns = new Map();
  }

  /**
   * Check if a user is on cooldown for a command.
   */
  isOnCooldown(userId, commandName, cooldownMs) {
    const key = `${userId}:${commandName}`;
    const cooldownEnd = this.cooldowns.get(key);
    return cooldownEnd && cooldownEnd > Date.now();
  }

  /**
   * Get remaining cooldown time in milliseconds.
   */
  getRemaining(userId, commandName) {
    const key = `${userId}:${commandName}`;
    const cooldownEnd = this.cooldowns.get(key);
    if (!cooldownEnd || cooldownEnd <= Date.now()) return 0;
    return cooldownEnd - Date.now();
  }

  /**
   * Set or reset a cooldown for a user/command.
   */
  setCooldown(userId, commandName, cooldownMs) {
    const key = `${userId}:${commandName}`;
    this.cooldowns.set(key, Date.now() + cooldownMs);
  }

  /**
   * Clear a specific cooldown.
   */
  clearCooldown(userId, commandName) {
    const key = `${userId}:${commandName}`;
    this.cooldowns.delete(key);
  }

  /**
   * Clear all expired cooldowns (cleanup).
   */
  clearExpired() {
    const now = Date.now();
    for (const [key, cooldownEnd] of this.cooldowns.entries()) {
      if (cooldownEnd <= now) {
        this.cooldowns.delete(key);
      }
    }
  }
}

module.exports = { CooldownManager };
