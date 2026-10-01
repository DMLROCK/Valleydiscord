"use strict";

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fs = require("fs");

const TOKEN = process.env.DISCORD_TOKEN;
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || "Eddies valley";
const ALERT_CHANNEL_ID = process.env.ALERT_CHANNEL_ID || "";

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing from Replit Secrets.");
  process.exit(1);
}

const DATA_FILE = "stoner-valley-data.json";
const BACKUP_FILE = "stoner-valley-backup.json";

let database = {
  users: {},
  market: {
    weed: 25,
    lastUpdate: Date.now()
  }
};

function loadDatabase() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      database = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch (error) {
    console.error("Database load error:", error);
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(database, null, 2));
  } catch (error) {
    console.error("Database save error:", error);
  }
}

function backupDatabase() {
  try {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(database, null, 2));
  } catch (error) {
    console.error("Backup error:", error);
  }
}

loadDatabase();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

function getUser(user) {
  if (!database.users[user.id]) {
    database.users[user.id] = {
      id: user.id,
      name: user.username,
      cash: 500,
      weed: 25,
      seeds: 5,
      storage: 100,
      xp: 0,
      level: 1,
      planted: 0,
      fertilizer: 0,
      premiumSeeds: 0,
      luckyCharm: 0,
      businessLevel: 0,
      greenhouseLevel: 0,
      dailyStreak: 0,
      lastDaily: 0,
      lastWork: 0,
      missionsCompleted: 0,
      achievements: [],
      joined: Date.now()
    };
  }

  database.users[user.id].name = user.username;
  return database.users[user.id];
}

function addXP(player, amount) {
  player.xp += amount;

  let leveled = false;

  while (player.xp >= player.level * 100 && player.level < 100) {
    player.xp -= player.level * 100;
    player.level++;
    leveled = true;
  }

  return leveled;
}

function money(amount) {
  return `$${Math.floor(amount).toLocaleString()}`;
}

function cooldownRemaining(last, cooldown) {
  const remaining = cooldown - (Date.now() - last);

  if (remaining <= 0) return null;

  const seconds = Math.ceil(remaining / 1000);

  if (seconds < 60) return `${seconds}s`;

  return `${Math.ceil(seconds / 60)}m`;
}

function randomMarket() {
  const change = Math.floor(Math.random() * 31) - 15;

  database.market.weed = Math.max(
    10,
    Math.min(50, database.market.weed + change)
  );

  database.market.lastUpdate = Date.now();
}

function getBusinessIncome(player) {
  if (player.businessLevel <= 0) return 0;

  const hours = (Date.now() - player.joined) / 3600000;
  return Math.floor(hours * player.businessLevel * 10);
}

function mainEmbed(player) {
  return new EmbedBuilder()
    .setTitle("🌿 STONER VALLEY")
    .setDescription(
      `Welcome to the Valley, **${player.name}**.\n\n` +
      `Build your stash, level up, upgrade your operation, complete missions and climb the leaderboard.`
    )
    .addFields(
      { name: "💰 Cash", value: money(player.cash), inline: true },
      { name: "🌿 Weed", value: `${player.weed}`, inline: true },
      { name: "⭐ Level", value: `${player.level}`, inline: true },
      { name: "🌱 Seeds", value: `${player.seeds}`, inline: true },
      { name: "🏭 Business", value: `Level ${player.businessLevel}`, inline: true },
      { name: "🏡 Greenhouse", value: `Level ${player.greenhouseLevel}`, inline: true }
    )
    .setFooter({ text: "Stoner Valley • Fictional in-server economy" });
}

const commands = [
  new SlashCommandBuilder()
    .setName("valley")
    .setDescription("Open your Stoner Valley dashboard"),

  new SlashCommandBuilder()
    .setName("info")
    .setDescription("View all Stoner Valley commands"),

  new SlashCommandBuilder()
    .setName("plant")
    .setDescription("Plant fictional crops"),

  new SlashCommandBuilder()
    .setName("harvest")
    .setDescription("Harvest your planted crops"),

  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your Valley balance"),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your Valley profile"),

  new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("View your inventory"),

  new SlashCommandBuilder()
    .setName("shop")
    .setDescription("View the Valley shop"),

  new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Buy an item")
    .addStringOption(option =>
      option
        .setName("item")
        .setDescription("Item to buy")
        .setRequired(true)
        .addChoices(
          { name: "Seeds", value: "seeds" },
          { name: "Fertilizer", value: "fertilizer" },
          { name: "Premium Seeds", value: "premium" },
          { name: "Lucky Charm", value: "charm" }
        )
    )
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("Amount")
        .setMinValue(1)
        .setMaxValue(50)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("sell")
    .setDescription("Sell fictional weed for Valley cash")
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("Amount to sell")
        .setMinValue(1)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("market")
    .setDescription("Check the current Valley market"),

  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily reward"),

  new SlashCommandBuilder()
    .setName("work")
    .setDescription("Work a Valley job for cash"),

  new SlashCommandBuilder()
    .setName("risk")
    .setDescription("Try a risky fictional cash gamble"),

  new SlashCommandBuilder()
    .setName("missions")
    .setDescription("View your missions"),

  new SlashCommandBuilder()
    .setName("achievements")
    .setDescription("View your achievements"),

  new SlashCommandBuilder()
    .setName("business")
    .setDescription("View or upgrade your business"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the Valley leaderboard"),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Get help with the game"),

  new SlashCommandBuilder()
    .setName("staff")
    .setDescription("Open staff tools")
    .addSubcommand(sub =>
      sub
        .setName("login")
        .setDescription("Log into staff mode")
        .addStringOption(option =>
          option
            .setName("password")
            .setDescription("Staff password")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("logout")
        .setDescription("Log out of staff mode")
    )
    .addSubcommand(sub =>
      sub
        .setName("panel")
        .setDescription("Open staff panel")
    )
    .addSubcommand(sub =>
      sub
        .setName("stats")
        .setDescription("View bot statistics")
    )
    .addSubcommand(sub =>
      sub
        .setName("addcash")
        .setDescription("Give a member fictional cash")
        .addUserOption(option =>
          option
            .setName("user")
            .setDescription("Member")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName("amount")
            .setDescription("Amount")
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("addweed")
        .setDescription("Give a member fictional weed")
        .addUserOption(option =>
          option
            .setName("user")
            .setDescription("Member")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName("amount")
            .setDescription("Amount")
            .setMinValue(1)
            .setRequired(true)
        )
    )
];

const staffSessions = new Map();

function isStaff(userId) {
  const expires = staffSessions.get(userId);

  if (!expires) return false;

  if (Date.now() > expires) {
    staffSessions.delete(userId);
    return false;
  }

  return true;
}

async function securityAlert(message) {
  console.log(`🚨 ${message}`);

  if (!ALERT_CHANNEL_ID) return;

  try {
    const channel = await client.channels.fetch(ALERT_CHANNEL_ID);

    if (channel) {
      await channel.send(`🚨 **BOT SECURITY ALERT**\n${message}`);
    }
  } catch (error) {
    console.error("Could not send security alert:", error.message);
  }
}

function infoText() {
  return [
    "**🌿 STONER VALLEY COMMANDS**",
    "",
    "`/valley` — Open your main dashboard",
    "`/plant` — Plant fictional crops",
    "`/harvest` — Harvest crops",
    "`/balance` — Check your cash and stash",
    "`/profile` — View your player profile",
    "`/inventory` — View your items",
    "`/shop` — Browse the shop",
    "`/buy` — Purchase items",
    "`/sell` — Sell fictional weed",
    "`/market` — Check current market price",
    "`/daily` — Claim your daily reward",
    "`/work` — Earn fictional cash",
    "`/risk` — Try your luck",
    "`/missions` — View missions",
    "`/achievements` — View achievements",
    "`/business` — Manage your business",
    "`/leaderboard` — See the Valley leaderboard",
    "`/help` — Game help",
    "",
    "**🛡️ STAFF**",
    "`/staff login` — Staff authentication",
    "`/staff panel` — Staff controls",
    "`/staff stats` — Bot statistics",
    "`/staff addcash` — Add fictional cash",
    "`/staff addweed` — Add fictional weed",
    "`/staff logout` — End staff session"
  ].join("\n");
}

client.once("ready", async () => {
  console.log(`🌿 Logged in as ${client.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands.map(command => command.toJSON()) }
    );

    console.log("✅ Slash commands registered.");
    console.log("🌿 Stoner Valley is online!");
  } catch (error) {
    console.error("❌ Slash command registration failed:", error);
    await securityAlert(`Slash command registration failed: ${error.message}`);
  }
});

client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isButton()) {
      const player = getUser(interaction.user);

      if (interaction.customId === "dash_balance") {
        return interaction.reply({
          content: `💰 **Cash:** ${money(player.cash)}\n🌿 **Weed:** ${player.weed}`,
          ephemeral: true
        });
      }

      if (interaction.customId === "dash_profile") {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`🌿 ${player.name}'s Profile`)
              .addFields(
                { name: "⭐ Level", value: `${player.level}`, inline: true },
                { name: "✨ XP", value: `${player.xp}`, inline: true },
                { name: "💰 Cash", value: money(player.cash), inline: true },
                { name: "🌿 Weed", value: `${player.weed}`, inline: true },
                { name: "🌱 Seeds", value: `${player.seeds}`, inline: true },
                { name: "🏡 Greenhouse", value: `${player.greenhouseLevel}`, inline: true }
              )
          ],
          ephemeral: true
        });
      }

      if (interaction.customId === "dash_market") {
        return interaction.reply({
          content: `📈 **Current Weed Market:** ${money(database.market.weed)} per unit`,
          ephemeral: true
        });
      }

      if (interaction.customId === "dash_missions") {
        return interaction.reply({
          content:
            "🎯 **Current Missions**\n\n" +
            "🌱 Plant 5 crops\n" +
            "🌿 Harvest 10 crops\n" +
            "💰 Earn $1,000\n\n" +
            "Complete activities to progress!",
          ephemeral: true
        });
      }

      if (interaction.customId === "dash_achievements") {
        return interaction.reply({
          content:
            `🏆 **Achievements Unlocked:** ${player.achievements.length}\n\n` +
            "Keep playing to unlock more.",
          ephemeral: true
        });
      }

      if (interaction.customId === "dash_help") {
        return interaction.reply({
          content: infoText(),
          ephemeral: true
        });
      }
    }

    if (!interaction.isChatInputCommand()) return;

    const player = getUser(interaction.user);
    const command = interaction.commandName;

    if (command === "valley") {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("dash_balance")
          .setLabel("Balance")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("dash_profile")
          .setLabel("Profile")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("dash_market")
          .setLabel("Market")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("dash_missions")
          .setLabel("Missions")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("dash_help")
          .setLabel("Help")
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        embeds: [mainEmbed(player)],
        components: [row]
      });
    }

    if (command === "info" || command === "help") {
      return interaction.reply(infoText());
    }

    if (command === "balance") {
      const income = getBusinessIncome(player);

      if (income > 0) {
        player.cash += income;
        player.joined = Date.now();
      }

      saveDatabase();

      return interaction.reply(
        `💰 **Your Valley Balance**\n\n` +
        `Cash: **${money(player.cash)}**\n` +
        `🌿 Weed: **${player.weed}**\n` +
        `🌱 Seeds: **${player.seeds}**\n` +
        `⭐ Level: **${player.level}**`
      );
    }

    if (command === "profile") {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`🌿 ${player.name}`)
            .setDescription("Your Stoner Valley profile")
            .addFields(
              { name: "⭐ Level", value: `${player.level}`, inline: true },
              { name: "✨ XP", value: `${player.xp}`, inline: true },
              { name: "💰 Cash", value: money(player.cash), inline: true },
              { name: "🌿 Weed", value: `${player.weed}`, inline: true },
              { name: "🌱 Seeds", value: `${player.seeds}`, inline: true },
              { name: "🏡 Greenhouse", value: `${player.greenhouseLevel}`, inline: true },
              { name: "🏭 Business", value: `${player.businessLevel}`, inline: true },
              { name: "🔥 Daily Streak", value: `${player.dailyStreak}`, inline: true },
              { name: "🏆 Achievements", value: `${player.achievements.length}`, inline: true }
            )
        ]
      });
    }

    if (command === "inventory") {
      return interaction.reply(
        `🎒 **Inventory**\n\n` +
        `🌱 Seeds: **${player.seeds}**\n` +
        `🌿 Weed: **${player.weed}/${player.storage}**\n` +
        `🧪 Fertilizer: **${player.fertilizer}**\n` +
        `✨ Premium Seeds: **${player.premiumSeeds}**\n` +
        `🍀 Lucky Charms: **${player.luckyCharm}**`
      );
    }

    if (command === "plant") {
      if (player.seeds <= 0) {
        return interaction.reply("❌ You're out of seeds. Visit `/shop`.");
      }

      const space = player.storage - player.weed;

      if (space <= 0) {
        return interaction.reply("📦 Your storage is full. Sell some weed first.");
      }

      player.seeds--;
      player.planted++;

      const xpGain = addXP(player, 15);

      saveDatabase();

      return interaction.reply(
        `🌱 **Crop planted!**\n\n` +
        `You now have **${player.planted}** crop(s) growing.\n` +
        `🌱 Seeds left: **${player.seeds}**\n` +
        `✨ +15 XP${xpGain ? `\n🎉 **LEVEL UP! You reached level ${player.level}!**` : ""}`
      );
    }

    if (command === "harvest") {
      if (player.planted <= 0) {
        return interaction.reply("🌱 You don't have anything ready to harvest. Use `/plant` first.");
      }

      let amount = Math.floor(Math.random() * 11) + 10;

      if (player.fertilizer > 0) {
        amount += 10;
        player.fertilizer--;
      }

      if (player.premiumSeeds > 0 && Math.random() < 0.5) {
        amount += 15;
        player.premiumSeeds--;
      }

      if (player.luckyCharm > 0 && Math.random() < 0.25) {
        amount *= 2;
        player.luckyCharm--;
      }

      const available = player.storage - player.weed;
      amount = Math.min(amount, available);

      player.planted--;
      player.weed += amount;

      const xpGain = addXP(player, 25);

      if (amount >= 35 && !player.achievements.includes("Big Harvest")) {
        player.achievements.push("Big Harvest");
      }

      saveDatabase();

      return interaction.reply(
        `🌿 **Harvest complete!**\n\n` +
        `You harvested **${amount} weed**.\n` +
        `🌿 Storage: **${player.weed}/${player.storage}**\n` +
        `✨ +25 XP${xpGain ? `\n🎉 **LEVEL UP! Level ${player.level}!**` : ""}`
      );
    }

    if (command === "shop") {
      return interaction.reply(
        `🛒 **VALLEY SHOP**\n\n` +
        `🌱 Seeds — **$50 each**\n` +
        `🧪 Fertilizer — **$150 each**\n` +
        `✨ Premium Seeds — **$300 each**\n` +
        `🍀 Lucky Charm — **$500 each**\n\n` +
        `Use \`/buy item amount\` to purchase.`
      );
    }

    if (command === "buy") {
      const item = interaction.options.getString("item");
      const amount = interaction.options.getInteger("amount");

      const prices = {
        seeds: 50,
        fertilizer: 150,
        premium: 300,
        charm: 500
      };

      const total = prices[item] * amount;

      if (player.cash < total) {
        return interaction.reply(
          `❌ You need **${money(total)}** but only have **${money(player.cash)}**.`
        );
      }

      player.cash -= total;

      if (item === "seeds") player.seeds += amount;
      if (item === "fertilizer") player.fertilizer += amount;
      if (item === "premium") player.premiumSeeds += amount;
      if (item === "charm") player.luckyCharm += amount;

      saveDatabase();

      return interaction.reply(
        `🛒 Purchase complete!\n\nYou bought **${amount} ${item}** for **${money(total)}**.`
      );
    }

    if (command === "sell") {
      const amount = interaction.options.getInteger("amount");

      if (player.weed < amount) {
        return interaction.reply("❌ You don't have that much weed.");
      }

      const total = amount * database.market.weed;

      player.weed -= amount;
      player.cash += total;

      const xpGain = addXP(player, 10);

      saveDatabase();

      return interaction.reply(
        `💰 **Sale complete!**\n\n` +
        `Sold: **${amount} weed**\n` +
        `Earned: **${money(total)}**\n` +
        `✨ +10 XP${xpGain ? `\n🎉 **LEVEL UP! Level ${player.level}!**` : ""}`
      );
    }

    if (command === "market") {
      return interaction.reply(
        `📈 **VALLEY MARKET**\n\n` +
        `🌿 Weed price: **${money(database.market.weed)} each**\n\n` +
        `Prices change automatically every 10 minutes.`
      );
    }

    if (command === "daily") {
      const cooldown = 24 * 60 * 60 * 1000;
      const remaining = cooldownRemaining(player.lastDaily, cooldown);

      if (remaining) {
        return interaction.reply(`⏳ Your daily reward is ready again in **${remaining}**.`);
      }

      player.dailyStreak++;
      player.lastDaily = Date.now();

      const reward = 250 + player.dailyStreak * 25;

      player.cash += reward;
      player.seeds += 2;

      const xpGain = addXP(player, 30);

      saveDatabase();

      return interaction.reply(
        `🎁 **DAILY REWARD!**\n\n` +
        `💰 +${money(reward)}\n` +
        `🌱 +2 Seeds\n` +
        `🔥 Streak: **${player.dailyStreak}**\n` +
        `✨ +30 XP${xpGain ? `\n🎉 **LEVEL UP! Level ${player.level}!**` : ""}`
      );
    }

    if (command === "work") {
      const cooldown = 30 * 60 * 1000;
      const remaining = cooldownRemaining(player.lastWork, cooldown);

      if (remaining) {
        return interaction.reply(`⏳ You can work again in **${remaining}**.`);
      }

      player.lastWork = Date.now();

      const reward = Math.floor(Math.random() * 201) + 100;

      player.cash += reward;

      const xpGain = addXP(player, 20);

      saveDatabase();

      return interaction.reply(
        `💼 **Work complete!**\n\n` +
        `You earned **${money(reward)}**.\n` +
        `✨ +20 XP${xpGain ? `\n🎉 **LEVEL UP! Level ${player.level}!**` : ""}`
      );
    }

    if (command === "risk") {
      if (player.cash < 50) {
        return interaction.reply("❌ You need at least $50 to play.");
      }

      const bet = Math.min(
        player.cash,
        Math.floor(Math.random() * 451) + 50
      );

      const win = Math.random() < 0.45;

      if (win) {
        const winnings = bet * 2;
        player.cash += winnings;
        saveDatabase();

        return interaction.reply(
          `🎰 **YOU HIT!**\n\nYou risked **${money(bet)}** and won **${money(winnings)}**!`
        );
      } else {
        player.cash -= bet;
        saveDatabase();

        return interaction.reply(
          `💀 **BAD LUCK!**\n\nYou lost **${money(bet)}**. Better luck next time.`
        );
      }
    }

    if (command === "missions") {
      return interaction.reply(
        `🎯 **VALLEY MISSIONS**\n\n` +
        `🌱 Plant 5 crops\n` +
        `🌿 Harvest 10 crops\n` +
        `💰 Earn $1,000\n` +
        `⭐ Reach level 10\n\n` +
        `Complete normal gameplay to progress toward bigger rewards.`
      );
    }

    if (command === "achievements") {
      return interaction.reply(
        `🏆 **ACHIEVEMENTS**\n\n` +
        `${player.achievements.length
          ? player.achievements.map(a => `🏆 ${a}`).join("\n")
          : "You haven't unlocked any yet."}`
      );
    }

    if (command === "business") {
      const cost = 1000 * (player.businessLevel + 1);

      return interaction.reply(
        `🏭 **VALLEY BUSINESS**\n\n` +
        `Current level: **${player.businessLevel}**\n` +
        `Next upgrade: **${money(cost)}**\n\n` +
        `Business upgrades increase your passive income.\n\n` +
        `Use this command again after saving enough to upgrade.`
      );
    }

    if (command === "leaderboard") {
      const users = Object.values(database.users)
        .sort((a, b) => b.cash - a.cash)
        .slice(0, 10);

      const lines = users.map(
        (u, index) =>
          `**${index + 1}.** ${u.name} — ${money(u.cash)}`
      );

      return interaction.reply(
        `🏆 **STONER VALLEY LEADERBOARD**\n\n${lines.join("\n") || "Nobody is on the leaderboard yet."}`
      );
    }

    if (command === "staff") {
      const sub = interaction.options.getSubcommand();

      if (sub === "login") {
        const password = interaction.options.getString("password");

        if (password !== STAFF_PASSWORD) {
          await securityAlert(
            `Failed staff login attempt by ${interaction.user.tag} (${interaction.user.id})`
          );

          return interaction.reply({
            content: "❌ Incorrect staff password.",
            ephemeral: true
          });
        }

        staffSessions.set(
          interaction.user.id,
          Date.now() + 2 * 60 * 60 * 1000
        );

        return interaction.reply({
          content: "🛡️ **Staff login successful.** Session active for 2 hours.",
          ephemeral: true
        });
      }

      if (sub === "logout") {
        staffSessions.delete(interaction.user.id);

        return interaction.reply({
          content: "🔒 Staff session ended.",
          ephemeral: true
        });
      }

      if (!isStaff(interaction.user.id)) {
        return interaction.reply({
          content: "🔒 You must use `/staff login` first.",
          ephemeral: true
        });
      }

      if (sub === "panel") {
        return interaction.reply({
          content:
            "🛡️ **STAFF PANEL**\n\n" +
            "Use `/staff stats` for statistics.\n" +
            "Use `/staff addcash` to give fictional cash.\n" +
            "Use `/staff addweed` to give fictional weed.",
          ephemeral: true
        });
      }

      if (sub === "stats") {
        const totalUsers = Object.keys(database.users).length;

        const totalCash = Object.values(database.users)
          .reduce((sum, user) => sum + user.cash, 0);

        return interaction.reply({
          content:
            `📊 **BOT STATS**\n\n` +
            `👥 Players: **${totalUsers}**\n` +
            `💰 Economy cash: **${money(totalCash)}**\n` +
            `🌿 Market price: **${money(database.market.weed)}**`,
          ephemeral: true
        });
      }

      if (sub === "addcash") {
        const target = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");

        const targetPlayer = getUser(target);

        targetPlayer.cash += amount;

        saveDatabase();

        return interaction.reply({
          content: `💰 Added **${money(amount)}** to ${target}.`,
          ephemeral: true
        });
      }

      if (sub === "addweed") {
        const target = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");

        const targetPlayer = getUser(target);

        targetPlayer.weed = Math.min(
          targetPlayer.storage,
          targetPlayer.weed + amount
        );

        saveDatabase();

        return interaction.reply({
          content: `🌿 Added **${amount} weed** to ${target}.`,
          ephemeral: true
        });
      }
    }
  } catch (error) {
    console.error("Interaction error:", error);

    await securityAlert(
      `Interaction error: ${error.message}`
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Something went wrong. The error has been logged.",
        ephemeral: true
      });
    }
  }
});

setInterval(() => {
  saveDatabase();
}, 30000);

setInterval(() => {
  backupDatabase();
}, 5 * 60 * 1000);

setInterval(() => {
  randomMarket();
  saveDatabase();
  console.log(`📈 Market updated: ${database.market.weed}`);
}, 10 * 60 * 1000);

process.on("unhandledRejection", error => {
  console.error("Unhandled rejection:", error);
  securityAlert(`Unhandled rejection: ${error.message || error}`);
});

process.on("uncaughtException", error => {
  console.error("Uncaught exception:", error);
  securityAlert(`Uncaught exception: ${error.message || error}`);
});

client.login(TOKEN);
