"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { AttachmentBuilder, MessageFlags } = require("discord.js");
const { buildV2MessagePayload } = require("./components-v2");

test("Components V2 payloads attach the green banner and media gallery", () => {
  const payload = buildV2MessagePayload({
    userId: "123456789012345678",
    section: "sports",
    response: {
      content: "A fictional Valley match.",
      files: [new AttachmentBuilder(Buffer.from("clip"), { name: "basketball.gif" })],
      media: [{ url: "attachment://basketball.gif", description: "Animated play" }]
    },
    actions: [{ label: "Open board", value: "sports:board" }]
  });

  assert.ok(payload.flags & MessageFlags.IsComponentsV2);
  assert.deepEqual(
    payload.files.map(file => file.name),
    ["valley-leaf-banner.gif", "basketball.gif"]
  );

  const serialized = payload.components[0].toJSON();
  const gallery = serialized.components.find(component => component.type === 12);
  assert.ok(gallery);
  assert.deepEqual(
    gallery.items.map(item => item.media.url),
    ["attachment://valley-leaf-banner.gif", "attachment://basketball.gif"]
  );
});

test("Components V2 updates clear old attachments and omit initial-response flags", () => {
  const payload = buildV2MessagePayload({
    userId: "123456789012345678",
    section: "home",
    response: { content: "Updated Valley page." },
    actions: [],
    update: true
  });

  assert.equal(payload.flags, undefined);
  assert.deepEqual(payload.attachments, []);
  assert.ok(payload.files.some(file => file.name === "valley-leaf-banner.gif"));
});