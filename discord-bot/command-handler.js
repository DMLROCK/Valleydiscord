"use strict";

const { EmbedBuilder } = require("discord.js");

/**
 * Centralized command handler with error recovery and logging.
 * Handles all command execution, deferral, and error responses.
 */
class CommandHandler {
  constructor(logger = console) {
    this.logger = logger;
    this.commandLog = [];
    this.MAX_LOG_ENTRIES = 1000;
  }

  /**
   * Log a command execution for debugging and auditing.
   */
  logCommand(userId, commandName, status, duration, error = null) {
    const entry = {
      timestamp: Date.now(),
      userId,
      commandName,
      status,
      durationMs: duration,
      error: error ? error.message : null
    };
    this.commandLog.unshift(entry);
    if (this.commandLog.length > this.MAX_LOG_ENTRIES) {
      this.commandLog.pop();
    }
    if (status === "error") {
      this.logger.error(`❌ /${commandName} (${userId}): ${error?.message || "Unknown error"}`);
    }
  }

  /**
   * Defer a command response with automatic timeout recovery.
   */
  async deferWithTimeout(interaction, ephemeral = false) {
    try {
      await interaction.deferReply({ ephemeral });
      return true;
    } catch (error) {
      this.logger.warn(`Defer failed for /${interaction.commandName}:`, error.message);
      return false;
    }
  }

  /**
   * Safe command execution wrapper.
   */
  async execute(interaction, commandFn) {
    const commandName = interaction.commandName;
    const userId = interaction.user.id;
    const startTime = Date.now();

    try {
      // Defer if not already deferred and command might take time
      if (!interaction.deferred && !interaction.replied) {
        await this.deferWithTimeout(interaction, false);
      }

      // Execute the command
      const result = await commandFn(interaction);
      const duration = Date.now() - startTime;
      this.logCommand(userId, commandName, "success", duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logCommand(userId, commandName, "error", duration, error);
      return this.sendErrorResponse(interaction, error);
    }
  }

  /**
   * Send a standardized error response.
   */
  async sendErrorResponse(interaction, error) {
    const content = {
      content: "❌ That command encountered an error. Try again or contact a staff member.",
      ephemeral: true
    };

    try {
      if (interaction.deferred || interaction.replied) {
        return await interaction.followUp(content);
      } else {
        return await interaction.reply(content);
      }
    } catch (responseError) {
      this.logger.error("Could not send error response:", responseError.message);
    }
  }

  /**
   * Get recent command log entries (for debugging).
   */
  getRecentCommands(limit = 50) {
    return this.commandLog.slice(0, limit);
  }

  /**
   * Get command statistics.
   */
  getStats() {
    const total = this.commandLog.length;
    const errors = this.commandLog.filter(e => e.status === "error").length;
    const avgDuration = this.commandLog.length
      ? Math.round(
          this.commandLog.reduce((sum, e) => sum + e.durationMs, 0) /
            this.commandLog.length
        )
      : 0;

    return { total, errors, avgDuration, errorRate: total ? (errors / total * 100).toFixed(1) : 0 };
  }
}

module.exports = { CommandHandler };
