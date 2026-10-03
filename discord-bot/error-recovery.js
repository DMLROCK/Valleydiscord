"use strict";

/**
 * Error recovery and resilience utilities.
 * Handles common Discord.js and bot failures gracefully.
 */

function isDiscordError(error) {
  return error && (error.code || error.status || error.message?.includes("Discord"));
}

function isRateLimitError(error) {
  return error?.status === 429 || error?.code === "RATE_LIMITED" || error?.message?.includes("rate limited");
}

function isTimeoutError(error) {
  return error?.message?.includes("timeout") || error?.message?.includes("INTERACTION_TOKEN_INVALID");
}

function isPermissionError(error) {
  return error?.message?.includes("Missing Permissions") || error?.code === 50013;
}

/**
 * Retry a function with exponential backoff.
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelayMs = 100) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

/**
 * Handle interaction response errors gracefully.
 */
async function safeReply(interaction, content) {
  try {
    if (interaction.replied) {
      return await interaction.followUp(content);
    } else if (interaction.deferred) {
      return await interaction.editReply(content);
    } else {
      return await interaction.reply(content);
    }
  } catch (error) {
    if (isTimeoutError(error)) {
      console.warn("Interaction token expired; response could not be sent.");
    } else if (isRateLimitError(error)) {
      console.warn("Rate limited; attempting to resend after delay...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return safeReply(interaction, content);
    }
    throw error;
  }
}

module.exports = {
  isDiscordError,
  isRateLimitError,
  isTimeoutError,
  isPermissionError,
  retryWithBackoff,
  safeReply
};
