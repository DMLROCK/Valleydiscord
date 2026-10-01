"use strict";

const {
  ActionRowBuilder,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder
} = require("discord.js");

const NAVIGATION_OPTIONS = [
  { label: "Home", value: "home", description: "Overview and quick links" },
  { label: "Economy", value: "economy", description: "Cash, bank, daily rewards, and leaderboard" },
  { label: "Work", value: "work", description: "Jobs and shifts" },
  { label: "Shop", value: "shop", description: "Browse and buy Valley products" },
  { label: "Inventory", value: "inventory", description: "Your items and quick-use actions" },
  { label: "Phone", value: "phone", description: "Phone and message shortcuts" },
  { label: "Property", value: "property", description: "House and storage" },
  { label: "Businesses", value: "business", description: "Business ownership and earnings" }
];

const SECTION_TITLES = {
  home: "Valley Home",
  economy: "Economy",
  work: "Work",
  shop: "Dispensary",
  inventory: "Inventory",
  phone: "Phone",
  property: "Property",
  business: "Businesses"
};

function truncateText(text, maxLength) {
  const value = String(text || "");
  if (value.length <= maxLength) return value;

  const suffix = "…";
  let result = "";

  for (const character of value) {
    if (result.length + character.length > maxLength - suffix.length) break;
    result += character;
  }

  return `${result}${suffix}`;
}

function responseText(response) {
  if (typeof response === "string") return response;
  if (!response || typeof response !== "object") return "The Valley is ready.";

  const sections = [];
  if (response.content) sections.push(String(response.content));

  for (const embedLike of response.embeds || []) {
    const embed = typeof embedLike?.toJSON === "function"
      ? embedLike.toJSON()
      : (embedLike?.data || embedLike);

    if (embed.title) sections.push(`### ${embed.title}`);
    if (embed.description) sections.push(embed.description);

    for (const field of embed.fields || []) {
      sections.push(`**${field.name}**\n${field.value}`);
    }

    if (embed.footer?.text) sections.push(`*${embed.footer.text}*`);
  }

  return sections.join("\n\n") || "The Valley is ready.";
}

function makeSelectRow(customId, placeholder, options) {
  const safeOptions = (options || [])
    .filter(option => option?.label && option?.value)
    .slice(0, 25)
    .map(option => ({
      label: truncateText(option.label, 100),
      value: truncateText(option.value, 100),
      ...(option.description
        ? { description: truncateText(option.description, 100) }
        : {}),
      ...(option.emoji ? { emoji: option.emoji } : {})
    }));

  const menuOptions = safeOptions.length
    ? safeOptions
    : [{ label: "Command guide", value: "cmd:info", description: "See all Valley commands" }];

  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(truncateText(placeholder, 150))
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(...menuOptions);

  return new ActionRowBuilder().addComponents(menu);
}

function buildV2Container({ userId, section, content, actions }) {
  const title = SECTION_TITLES[section] || "Valley";
  const body = truncateText(content, 3650);
  const container = new ContainerBuilder()
    .setAccentColor(0x3d765c)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## 🌿 Stoner Valley\n**${title}**`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(body)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("*Navigate to a section or choose a quick action below.*")
    )
    .addActionRowComponents(
      makeSelectRow(
        `sv2:navigate:${userId}`,
        "Navigate to a section",
        NAVIGATION_OPTIONS
      )
    )
    .addActionRowComponents(
      makeSelectRow(
        `sv2:actions:${userId}:${section}`,
        `Quick actions · ${title}`,
        actions
      )
    );

  return container;
}

function buildV2MessagePayload({
  userId,
  section,
  response,
  actions,
  update = false
}) {
  const payload = {
    components: [
      buildV2Container({
        userId,
        section,
        content: responseText(response),
        actions
      })
    ],
    allowedMentions: response?.allowedMentions || { parse: [] }
  };

  if (!update) {
    let flags = (response?.flags || 0) | MessageFlags.IsComponentsV2;
    if (response?.ephemeral) flags |= MessageFlags.Ephemeral;
    payload.flags = flags;
  }

  return payload;
}

module.exports = {
  NAVIGATION_OPTIONS,
  SECTION_TITLES,
  buildV2MessagePayload
};