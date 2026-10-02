"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { commands } = require("./index");

const serializedCommands = commands.map(command => command.toJSON());

function walkOptions(commandName, options = []) {
  for (const option of options) {
    assert.ok(option.name.length <= 32, `${commandName}/${option.name} name is too long`);
    assert.ok(option.description.length <= 100, `${commandName}/${option.name} description is too long`);
    assert.ok((option.choices || []).length <= 25, `${commandName}/${option.name} has too many choices`);
    for (const choice of option.choices || []) {
      assert.ok(choice.name.length <= 100, `${commandName}/${option.name} choice is too long`);
    }
    walkOptions(`${commandName}/${option.name}`, option.options);
  }
}

test("all Valley slash commands serialize with unique Discord names", () => {
  const names = serializedCommands.map(command => command.name);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.includes("character"));
  assert.ok(names.includes("sports"));
  assert.ok(names.includes("security"));
  assert.ok(names.includes("staff"));
});

test("all slash command options stay within Discord's published limits", () => {
  for (const command of serializedCommands) {
    assert.ok(command.name.length <= 32);
    assert.ok(command.description.length <= 100);
    assert.ok((command.options || []).length <= 25);
    walkOptions(command.name, command.options);
  }
});

test("staff controls do not register destructive account reset or delete actions", () => {
  const staff = serializedCommands.find(command => command.name === "staff");
  const subcommands = staff.options.map(option => option.name);
  assert.deepEqual(subcommands, [
    "login",
    "logout",
    "inspect",
    "currency",
    "grant-item",
    "remove-item",
    "xp",
    "audit"
  ]);
});