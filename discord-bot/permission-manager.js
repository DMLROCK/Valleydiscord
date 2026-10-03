"use strict";

/**
 * Permission and role-based access control for bot commands.
 */
class PermissionManager {
  constructor() {
    this.roleCache = new Map();
  }

  /**
   * Check if a user has staff/admin permissions.
   */
  isStaffMember(userId, guildId, staffMemberIds = []) {
    return staffMemberIds.includes(userId);
  }

  /**
   * Check if a command requires staff access.
   */
  commandRequiresStaff(commandName) {
    return ["staff"].includes(commandName);
  }

  /**
   * Validate that a user can execute a command.
   */
  canExecuteCommand(userId, guildId, commandName, staffMemberIds = []) {
    if (this.commandRequiresStaff(commandName)) {
      return this.isStaffMember(userId, guildId, staffMemberIds);
    }
    return true;
  }
}

module.exports = { PermissionManager };
