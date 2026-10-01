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

/* =========================================================
   FILES
========================================================= */

const DATA_FILE = "stoner-valley-data.json";
const BACKUP_FILE = "stoner-valley-backup.json";

let database = {
  users: {},
  market: {
    weed: 25,
    lastUpdate: Date.now()
  }
};

/* =========================================================
   DATABASE
========================================================= */

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
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(database, null, 2)
    );
  } catch (error) {
    console.error("Database save error:", error);
  }
}

function backupDatabase() {
  try {
    fs.writeFileSync(
      BACKUP_FILE,
      JSON.stringify(database, null, 2)
    );
  } catch (error) {
    console.error("Backup error:", error);
  }
}

loadDatabase();

/* =========================================================
   CLIENT
========================================================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* =========================================================
   USER DATA
========================================================= */

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

      dailyStreak: 0,
      lastDaily: 0,
      lastWork: 0,

      achievements: [],

      /* NEW ITEMS */
      papers: {
        raw_cone: 0,
        king_size: 0,
        blunt_wrap: 0
      },

      joints: 0,
      carts: 0,
      wax: 0,

      jointUses: 0,
      cartUses: 0,
      waxUses: 0,

      /* PROPERTY */
      house: false,
      houseLevel: 0,

      vault: false,
      vaultLevel: 0,
      vaultWeed: 0,

      security: 0,

      /* JOB */
      job: null,
      jobLevel: 1,
      lastJob: 0,
      applications: [],

      /* STATS */
      jointsRolled: 0,
      smokeSessions: 0,
      raids: 0,
      successfulRaids: 0,
      jobsWorked: 0,

      joined: Date.now()
    };
  }

  const p = database.users[user.id];

  /* Repair older accounts created before new systems */
  p.name = user.username;

  p.papers ??= {
    raw_cone: 0,
    king_size: 0,
    blunt_wrap: 0
  };

  p.joints ??= 0;
  p.carts ??= 0;
  p.wax ??= 0;

  p.jointUses ??= 0;
  p.cartUses ??= 0;
  p.waxUses ??= 0;

  p.house ??= false;
  p.houseLevel ??= 0;
  p.vault ??= false;
  p.vaultLevel ??= 0;
  p.vaultWeed ??= 0;
  p.security ??= 0;

  p.job ??= null;
  p.jobLevel ??= 1;
  p.lastJob ??= 0;
  p.applications ??= [];

  p.jointsRolled ??= 0;
  p.smokeSessions ??= 0;
  p.raids ??= 0;
  p.successfulRaids ??= 0;
  p.jobsWorked ??= 0;

  return p;
}

/* =========================================================
   UTILITIES
========================================================= */

function money(amount) {
  return `$${Math.floor(amount).toLocaleString()}`;
}

function cooldownRemaining(last, cooldown) {
  const remaining = cooldown - (Date.now() - last);

  if (remaining <= 0) return null;

  const seconds = Math.ceil(remaining / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  if (seconds < 3600) {
    return `${Math.ceil(seconds / 60)}m`;
  }

  return `${Math.ceil(seconds / 3600)}h`;
}

function addXP(player, amount) {
  player.xp += amount;

  let leveled = false;

  while (
    player.xp >= player.level * 100 &&
    player.level < 100
  ) {
    player.xp -= player.level * 100;
    player.level++;
    leveled = true;
  }

  return leveled;
}

function randomMarket() {
  const change =
    Math.floor(Math.random() * 31) - 15;

  database.market.weed = Math.max(
    10,
    Math.min(50, database.market.weed + change)
  );

  database.market.lastUpdate = Date.now();
}

function getUserById(id) {
  return database.users[id];
}

/* =========================================================
   SECURITY
========================================================= */

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
    const channel =
      await client.channels.fetch(ALERT_CHANNEL_ID);

    if (channel) {
      await channel.send(
        `🚨 **BOT SECURITY ALERT**\n${message}`
      );
    }
  } catch (error) {
    console.error(
      "Security alert failed:",
      error.message
    );
  }
}

/* =========================================================
   CELEBRITY ROLEPLAY
========================================================= */

const celebrities = {
  snoop: {
    name: "Snoop Dogg",
    emoji: "🌿🎤",
    message:
      "You kicked back for a fictional Valley smoke session with Snoop Dogg."
  },

  wiz: {
    name: "Wiz Khalifa",
    emoji: "🌿🎶",
    message:
      "You joined a fictional late-night smoke session with Wiz Khalifa."
  },

  willie: {
    name: "Willie Nelson",
    emoji: "🌿🤠",
    message:
      "You kicked back in a fictional Valley session with Willie Nelson."
  },

  seth: {
    name: "Seth Rogen",
    emoji: "🌿🎬",
    message:
      "You joined a fictional comedy smoke session with Seth Rogen."
  },

  cheech: {
    name: "Cheech & Chong",
    emoji: "🌿😂",
    message:
      "You joined a fictional comedy smoke session with Cheech & Chong."
  },

  flight: {
    name: "FlightReacts",
    emoji: "🌿🏀",
    message:
      "You joined a fictional smoke-and-game session with FlightReacts."
  }
};

/* =========================================================
   JOBS
========================================================= */

const jobs = {
  dispensary: {
    name: "Dispensary Worker",
    emoji: "🌿",
    pay: [250, 600],
    cooldown: 30 * 60 * 1000
  },

  security: {
    name: "Valley Security",
    emoji: "🛡️",
    pay: [300, 700],
    cooldown: 30 * 60 * 1000
  },

  delivery: {
    name: "Valley Delivery",
    emoji: "🚗",
    pay: [200, 550],
    cooldown: 30 * 60 * 1000
  },

  budtender: {
    name: "Budtender",
    emoji: "🍃",
    pay: [350, 800],
    cooldown: 30 * 60 * 1000
  }
};

/* =========================================================
   SHOP
========================================================= */

const shopItems = {
  seeds: {
    name: "Seeds",
    price: 50,
    emoji: "🌱"
  },

  fertilizer: {
    name: "Fertilizer",
    price: 150,
    emoji: "🧪"
  },

  premium: {
    name: "Premium Seeds",
    price: 300,
    emoji: "✨"
  },

  charm: {
    name: "Lucky Charm",
    price: 500,
    emoji: "🍀"
  },

  raw_cone: {
    name: "RAW Cone",
    price: 75,
    emoji: "📜"
  },

  king_size: {
    name: "King Size Papers",
    price: 100,
    emoji: "📜"
  },

  blunt_wrap: {
    name: "Blunt Wrap",
    price: 125,
    emoji: "📜"
  },

  cart: {
    name: "Fictional Weed Cart",
    price: 750,
    emoji: "💨"
  },

  wax: {
    name: "Fictional Wax",
    price: 900,
    emoji: "🍯"
  }
};

/* =========================================================
   COMMANDS
========================================================= */

const commands = [

  new SlashCommandBuilder()
    .setName("valley")
    .setDescription("Open your Stoner Valley dashboard"),

  new SlashCommandBuilder()
    .setName("info")
    .setDescription("View all Stoner Valley commands"),

  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your Valley balance"),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your Valley profile"),

  new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("View your Valley inventory"),

  new SlashCommandBuilder()
    .setName("plant")
    .setDescription("Plant fictional crops"),

  new SlashCommandBuilder()
    .setName("harvest")
    .setDescription("Harvest fictional crops"),

  new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Open the Valley shop"),

  new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Buy a Valley item")
    .addStringOption(option =>
      option
        .setName("item")
        .setDescription("Item to buy")
        .setRequired(true)
        .addChoices(
          { name: "🌱 Seeds", value: "seeds" },
          { name: "🧪 Fertilizer", value: "fertilizer" },
          { name: "✨ Premium Seeds", value: "premium" },
          { name: "🍀 Lucky Charm", value: "charm" },
          { name: "📜 RAW Cone", value: "raw_cone" },
          { name: "📜 King Size Papers", value: "king_size" },
          { name: "📜 Blunt Wrap", value: "blunt_wrap" },
          { name: "💨 Fictional Cart", value: "cart" },
          { name: "🍯 Fictional Wax", value: "wax" }
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
    .setDescription("Sell fictional Valley weed")
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("Amount")
        .setMinValue(1)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("market")
    .setDescription("Check the fictional Valley market"),

  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily reward"),

  new SlashCommandBuilder()
    .setName("work")
    .setDescription("Work a general Valley job"),

  new SlashCommandBuilder()
    .setName("risk")
    .setDescription("Try your luck with fictional cash"),

  new SlashCommandBuilder()
    .setName("missions")
    .setDescription("View Valley missions"),

  new SlashCommandBuilder()
    .setName("achievements")
    .setDescription("View your achievements"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the Valley leaderboard"),

  /* JOINT */
  new SlashCommandBuilder()
    .setName("joint")
    .setDescription("Roll a fictional joint")
    .addSubcommand(sub =>
      sub
        .setName("roll")
        .setDescription("Roll a joint using papers")
        .addStringOption(option =>
          option
            .setName("paper")
            .setDescription("Choose your paper")
            .setRequired(true)
            .addChoices(
              { name: "📜 RAW Cone", value: "raw_cone" },
              { name: "📜 King Size", value: "king_size" },
              { name: "📜 Blunt Wrap", value: "blunt_wrap" }
            )
        )
    ),

  /* USE */
  new SlashCommandBuilder()
    .setName("use")
    .setDescription("Use a fictional item")
    .addStringOption(option =>
      option
        .setName("item")
        .setDescription("Item to use")
        .setRequired(true)
        .addChoices(
          { name: "🌿 Joint", value: "joint" },
          { name: "💨 Cart", value: "cart" },
          { name: "🍯 Wax", value: "wax" }
        )
    ),

  /* CELEBRITY */
  new SlashCommandBuilder()
    .setName("celebrity")
    .setDescription("Have a fictional smoke session with a celebrity")
    .addStringOption(option =>
      option
        .setName("person")
        .setDescription("Choose your fictional session")
        .setRequired(true)
        .addChoices(
          { name: "🌿 Snoop Dogg", value: "snoop" },
          { name: "🌿 Wiz Khalifa", value: "wiz" },
          { name: "🌿 Willie Nelson", value: "willie" },
          { name: "🌿 Seth Rogen", value: "seth" },
          { name: "🌿 Cheech & Chong", value: "cheech" },
          { name: "🌿 FlightReacts", value: "flight" }
        )
    ),

  /* PROPERTY */
  new SlashCommandBuilder()
    .setName("property")
    .setDescription("Manage your Valley property")
    .addSubcommand(sub =>
      sub
        .setName("view")
        .setDescription("View your property")
    )
    .addSubcommand(sub =>
      sub
        .setName("buy")
        .setDescription("Buy your own Valley house")
    )
    .addSubcommand(sub =>
      sub
        .setName("upgrade")
        .setDescription("Upgrade your house")
    )
    .addSubcommand(sub =>
      sub
        .setName("vault")
        .setDescription("Buy or upgrade your vault")
    )
    .addSubcommand(sub =>
      sub
        .setName("deposit")
        .setDescription("Put fictional weed into your vault")
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
        .setName("withdraw")
        .setDescription("Take fictional weed from your vault")
        .addIntegerOption(option =>
          option
            .setName("amount")
            .setDescription("Amount")
            .setMinValue(1)
            .setRequired(true)
        )
    ),

  /* BUSINESS */
  new SlashCommandBuilder()
    .setName("business")
    .setDescription("Manage your Valley business")
    .addSubcommand(sub =>
      sub
        .setName("view")
        .setDescription("View your business")
    )
    .addSubcommand(sub =>
      sub
        .setName("upgrade")
        .setDescription("Upgrade your business")
    ),

  /* JOB */
  new SlashCommandBuilder()
    .setName("job")
    .setDescription("Manage your Valley job")
    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("View available jobs")
    )
    .addSubcommand(sub =>
      sub
        .setName("apply")
        .setDescription("Apply for a job")
        .addStringOption(option =>
          option
            .setName("job")
            .setDescription("Job")
            .setRequired(true)
            .addChoices(
              { name: "🌿 Dispensary Worker", value: "dispensary" },
              { name: "🛡️ Valley Security", value: "security" },
              { name: "🚗 Valley Delivery", value: "delivery" },
              { name: "🍃 Budtender", value: "budtender" }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("work")
        .setDescription("Work your current job")
    )
    .addSubcommand(sub =>
      sub
        .setName("quit")
        .setDescription("Quit your current job")
    ),

  /* RAID */
  new SlashCommandBuilder()
    .setName("raid")
    .setDescription("Attempt a fictional Valley raid")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Player to raid")
        .setRequired(true)
    ),

  /* FUN */
  new SlashCommandBuilder()
    .setName("dice")
    .setDescription("Roll a dice"),

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin"),

  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the Valley 8-ball")
    .addStringOption(option =>
      option
        .setName("question")
        .setDescription("Your question")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("high")
    .setDescription("Get a random Valley high message"),

  new SlashCommandBuilder()
    .setName("smoke")
    .setDescription("Post a random fictional smoke message"),

  /* STAFF */
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
        .setDescription("Give fictional cash")
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
        .setDescription("Give fictional weed")
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

/* =========================================================
   INFO
========================================================= */

function infoText() {
  return [
    "**🌿 STONER VALLEY COMMANDS**",
    "",
    "💰 **ECONOMY**",
    "`/balance` — View your cash and stash",
    "`/daily` — Claim your daily reward",
    "`/work` — Work for cash",
    "`/risk` — Try your luck",
    "`/market` — View the market",
    "`/sell` — Sell fictional weed",
    "`/leaderboard` — Top Valley players",
    "",
    "🌱 **GROWING**",
    "`/plant` — Plant a crop",
    "`/harvest` — Harvest crops",
    "`/shop` — Open the shop",
    "`/buy` — Buy items",
    "",
    "🚬 **SMOKE SYSTEM**",
    "`/joint roll` — Roll a fictional joint",
    "`/use` — Use a joint, cart or wax",
    "`/celebrity` — Fictional celebrity smoke session",
    "",
    "🏠 **PROPERTY**",
    "`/property view` — View your house",
    "`/property buy` — Buy a house",
    "`/property upgrade` — Upgrade your house",
    "`/property vault` — Buy/upgrade your vault",
    "`/property deposit` — Store weed",
    "`/property withdraw` — Withdraw weed",
    "",
    "🏪 **BUSINESS**",
    "`/business view` — View business",
    "`/business upgrade` — Upgrade business",
    "",
    "💼 **JOBS**",
    "`/job list` — View jobs",
    "`/job apply` — Apply for a job",
    "`/job work` — Work your job",
    "`/job quit` — Leave your job",
    "",
    "🥷 **RAIDS**",
    "`/raid @user` — Attempt a fictional raid",
    "",
    "🎮 **FUN**",
    "`/dice` — Roll a dice",
    "`/coinflip` — Flip a coin",
    "`/8ball` — Ask the Valley 8-ball",
    "`/high` — Random Valley message",
    "`/smoke` — Random smoke message",
    "",
    "🏆 **PROGRESSION**",
    "`/profile` — View your profile",
    "`/inventory` — View inventory",
    "`/missions` — View missions",
    "`/achievements` — View achievements",
    "",
    "🛡️ **STAFF**",
    "`/staff login` — Staff authentication",
    "`/staff panel` — Staff controls",
    "`/staff stats` — Bot statistics"
  ].join("\n");
}

/* =========================================================
   READY
========================================================= */

client.once("ready", async () => {
  console.log(
    `🌿 Logged in as ${client.user.tag}`
  );

  try {
    const rest = new REST({ version: "10" })
      .setToken(TOKEN);

    await rest.put(
      Routes.applicationCommands(
        client.user.id
      ),
      {
        body: commands.map(command =>
          command.toJSON()
        )
      }
    );

    console.log("✅ Slash commands registered.");
    console.log("🌿 Stoner Valley is online!");
  } catch (error) {
    console.error(
      "❌ Slash command registration failed:",
      error
    );

    await securityAlert(
      `Slash command registration failed: ${error.message}`
    );
  }
});

/* =========================================================
   INTERACTIONS
========================================================= */

client.on(
  "interactionCreate",
  async interaction => {

    try {

      if (!interaction.isChatInputCommand()) {
        return;
      }

      const player =
        getUser(interaction.user);

      const command =
        interaction.commandName;

      /* =====================================================
         BASIC
      ===================================================== */

      if (command === "info") {
        return interaction.reply(infoText());
      }

      if (command === "valley") {

        const embed =
          new EmbedBuilder()
            .setTitle("🌿 STONER VALLEY")
            .setDescription(
              `Welcome back, **${player.name}**.\n\n` +
              `Build your stash, roll joints, buy property, work jobs, upgrade businesses, raid rival vaults and climb the Valley.`
            )
            .addFields(
              {
                name: "💰 Cash",
                value: money(player.cash),
                inline: true
              },
              {
                name: "🌿 Weed",
                value: `${player.weed}`,
                inline: true
              },
              {
                name: "⭐ Level",
                value: `${player.level}`,
                inline: true
              },
              {
                name: "🚬 Joints",
                value: `${player.joints}`,
                inline: true
              },
              {
                name: "💨 Carts",
                value: `${player.carts}`,
                inline: true
              },
              {
                name: "🍯 Wax",
                value: `${player.wax}`,
                inline: true
              }
            )
            .setFooter({
              text:
                "Stoner Valley • Fictional in-server economy"
            });

        return interaction.reply({
          embeds: [embed]
        });
      }

      /* =====================================================
         BALANCE
      ===================================================== */

      if (command === "balance") {

        return interaction.reply(
          `💰 **VALLEY BALANCE**\n\n` +
          `Cash: **${money(player.cash)}**\n` +
          `🌿 Weed: **${player.weed}**\n` +
          `⭐ Level: **${player.level}**`
        );
      }

      /* =====================================================
         PROFILE
      ===================================================== */

      if (command === "profile") {

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(
                `🌿 ${player.name}'s Profile`
              )
              .addFields(
                {
                  name: "⭐ Level",
                  value: `${player.level}`,
                  inline: true
                },
                {
                  name: "✨ XP",
                  value: `${player.xp}`,
                  inline: true
                },
                {
                  name: "💰 Cash",
                  value: money(player.cash),
                  inline: true
                },
                {
                  name: "🌿 Weed",
                  value: `${player.weed}`,
                  inline: true
                },
                {
                  name: "🚬 Joints",
                  value: `${player.joints}`,
                  inline: true
                },
                {
                  name: "🏠 House",
                  value:
                    player.house
                      ? `Level ${player.houseLevel}`
                      : "None",
                  inline: true
                },
                {
                  name: "🔐 Vault",
                  value:
                    player.vault
                      ? `Level ${player.vaultLevel}`
                      : "None",
                  inline: true
                },
                {
                  name: "💼 Job",
                  value:
                    player.job
                      ? jobs[player.job].name
                      : "Unemployed",
                  inline: true
                },
                {
                  name: "🏆 Achievements",
                  value:
                    `${player.achievements.length}`,
                  inline: true
                }
              ]
          ]
        });
      }

      /* =====================================================
         INVENTORY
      ===================================================== */

      if (command === "inventory") {

        return interaction.reply(
          `🎒 **VALLEY INVENTORY**\n\n` +

          `🌿 Weed: **${player.weed}/${player.storage}**\n` +

          `🌱 Seeds: **${player.seeds}**\n` +

          `🧪 Fertilizer: **${player.fertilizer}**\n` +

          `✨ Premium Seeds: **${player.premiumSeeds}**\n` +

          `🍀 Lucky Charms: **${player.luckyCharm}**\n\n` +

          `🚬 Joints: **${player.joints}**\n` +

          `💨 Carts: **${player.carts}**\n` +

          `🍯 Wax: **${player.wax}**\n\n` +

          `📜 RAW Cones: **${player.papers.raw_cone}**\n` +

          `📜 King Size: **${player.papers.king_size}**\n` +

          `📜 Blunt Wraps: **${player.papers.blunt_wrap}**`
        );
      }

      /* =====================================================
         PLANT
      ===================================================== */

      if (command === "plant") {

        if (player.seeds <= 0) {
          return interaction.reply(
            "❌ You're out of seeds. Visit `/shop`."
          );
        }

        player.seeds--;
        player.planted++;

        const leveled =
          addXP(player, 15);

        saveDatabase();

        return interaction.reply(
          `🌱 **CROP PLANTED!**\n\n` +
          `Growing crops: **${player.planted}**\n` +
          `Seeds remaining: **${player.seeds}**\n` +
          `✨ +15 XP` +
          (
            leveled
              ? `\n🎉 **LEVEL UP! Level ${player.level}!**`
              : ""
          )
        );
      }

      /* =====================================================
         HARVEST
      ===================================================== */

      if (command === "harvest") {

        if (player.planted <= 0) {
          return interaction.reply(
            "🌱 You don't have a crop ready. Use `/plant` first."
          );
        }

        let amount =
          Math.floor(Math.random() * 11) + 10;

        if (player.fertilizer > 0) {
          amount += 10;
          player.fertilizer--;
        }

        if (
          player.premiumSeeds > 0 &&
          Math.random() < 0.5
        ) {
          amount += 15;
          player.premiumSeeds--;
        }

        if (
          player.luckyCharm > 0 &&
          Math.random() < 0.25
        ) {
          amount *= 2;
          player.luckyCharm--;
        }

        const available =
          player.storage - player.weed;

        amount =
          Math.min(amount, available);

        if (amount <= 0) {
          return interaction.reply(
            "📦 Your storage is full. Upgrade your storage or sell some weed."
          );
        }

        player.planted--;
        player.weed += amount;

        const leveled =
          addXP(player, 25);

        if (
          amount >= 35 &&
          !player.achievements.includes(
            "Big Harvest"
          )
        ) {
          player.achievements.push(
            "Big Harvest"
          );
        }

        saveDatabase();

        return interaction.reply(
          `🌿 **HARVEST COMPLETE!**\n\n` +
          `Harvested: **${amount} weed**\n` +
          `Storage: **${player.weed}/${player.storage}**\n` +
          `✨ +25 XP` +
          (
            leveled
              ? `\n🎉 **LEVEL UP! Level ${player.level}!**`
              : ""
          )
        );
      }

      /* =====================================================
         SHOP
      ===================================================== */

      if (command === "shop") {

        return interaction.reply(
          `🛒 **STONER VALLEY SHOP**\n\n` +

          `🌱 Seeds — **$50**\n` +
          `🧪 Fertilizer — **$150**\n` +
          `✨ Premium Seeds — **$300**\n` +
          `🍀 Lucky Charm — **$500**\n\n` +

          `🚬 RAW Cone — **$75**\n` +
          `🚬 King Size Papers — **$100**\n` +
          `🚬 Blunt Wrap — **$125**\n\n` +

          `💨 Fictional Cart — **$750**\n` +
          `🍯 Fictional Wax — **$900**\n\n` +

          `Use **/buy item amount** to purchase.`
        );
      }

      /* =====================================================
         BUY
      ===================================================== */

      if (command === "buy") {

        const item =
          interaction.options.getString("item");

        const amount =
          interaction.options.getInteger("amount");

        const product =
          shopItems[item];

        if (!product) {
          return interaction.reply(
            "❌ That item doesn't exist."
          );
        }

        const total =
          product.price * amount;

        if (player.cash < total) {
          return interaction.reply(
            `❌ You need **${money(total)}** but only have **${money(player.cash)}**.`
          );
        }

        player.cash -= total;

        if (item === "seeds") {
          player.seeds += amount;
        }

        if (item === "fertilizer") {
          player.fertilizer += amount;
        }

        if (item === "premium") {
          player.premiumSeeds += amount;
        }

        if (item === "charm") {
          player.luckyCharm += amount;
        }

        if (item === "raw_cone") {
          player.papers.raw_cone += amount;
        }

        if (item === "king_size") {
          player.papers.king_size += amount;
        }

        if (item === "blunt_wrap") {
          player.papers.blunt_wrap += amount;
        }

        if (item === "cart") {
          player.carts += amount;
        }

        if (item === "wax") {
          player.wax += amount;
        }

        saveDatabase();

        return interaction.reply(
          `${product.emoji} **PURCHASE COMPLETE!**\n\n` +
          `Bought: **${amount} ${product.name}**\n` +
          `Paid: **${money(total)}**\n\n` +
          `Check your inventory with \`/inventory\`.`
        );
      }

      /* =====================================================
         SELL
      ===================================================== */

      if (command === "sell") {

        const amount =
          interaction.options.getInteger("amount");

        if (player.weed < amount) {
          return interaction.reply(
            "❌ You don't have that much fictional weed."
          );
        }

        const total =
          amount * database.market.weed;

        player.weed -= amount;
        player.cash += total;

        addXP(player, 10);

        saveDatabase();

        return interaction.reply(
          `💰 **SALE COMPLETE!**\n\n` +
          `Sold: **${amount} weed**\n` +
          `Earned: **${money(total)}**`
        );
      }

      /* =====================================================
         MARKET
      ===================================================== */

      if (command === "market") {

        return interaction.reply(
          `📈 **VALLEY MARKET**\n\n` +
          `🌿 Fictional weed price: **${money(database.market.weed)} each**\n\n` +
          `Market prices change automatically.`
        );
      }

      /* =====================================================
         DAILY
      ===================================================== */

      if (command === "daily") {

        const cooldown =
          24 * 60 * 60 * 1000;

        const remaining =
          cooldownRemaining(
            player.lastDaily,
            cooldown
          );

        if (remaining) {
          return interaction.reply(
            `⏳ Your daily reward is ready in **${remaining}**.`
          );
        }

        player.dailyStreak++;
        player.lastDaily = Date.now();

        const reward =
          250 +
          player.dailyStreak * 25;

        player.cash += reward;
        player.seeds += 2;

        addXP(player, 30);

        saveDatabase();

        return interaction.reply(
          `🎁 **DAILY REWARD!**\n\n` +
          `💰 +${money(reward)}\n` +
          `🌱 +2 Seeds\n` +
          `🔥 Streak: **${player.dailyStreak}**\n` +
          `✨ +30 XP`
        );
      }

      /* =====================================================
         GENERAL WORK
      ===================================================== */

      if (command === "work") {

        const cooldown =
          30 * 60 * 1000;

        const remaining =
          cooldownRemaining(
            player.lastWork,
            cooldown
          );

        if (remaining) {
          return interaction.reply(
            `⏳ You can work again in **${remaining}**.`
          );
        }

        player.lastWork = Date.now();

        const reward =
          Math.floor(Math.random() * 201) + 100;

        player.cash += reward;

        addXP(player, 20);

        saveDatabase();

        return interaction.reply(
          `💼 **WORK COMPLETE!**\n\n` +
          `You earned **${money(reward)}**.\n` +
          `✨ +20 XP`
        );
      }

      /* =====================================================
         RISK
      ===================================================== */

      if (command === "risk") {

        if (player.cash < 50) {
          return interaction.reply(
            "❌ You need at least $50."
          );
        }

        const bet =
          Math.min(
            player.cash,
            Math.floor(Math.random() * 451) + 50
          );

        const win =
          Math.random() < 0.45;

        if (win) {

          const winnings =
            bet * 2;

          player.cash += winnings;

          saveDatabase();

          return interaction.reply(
            `🎰 **YOU HIT!**\n\n` +
            `You risked **${money(bet)}**\n` +
            `You won **${money(winnings)}**!`
          );

        } else {

          player.cash -= bet;

          saveDatabase();

          return interaction.reply(
            `💀 **BAD LUCK!**\n\n` +
            `You lost **${money(bet)}**.`
          );
        }
      }

      /* =====================================================
         JOINT ROLL
      ===================================================== */

      if (command === "joint") {

        const paper =
          interaction.options.getString("paper");

        if (player.papers[paper] <= 0) {

          return interaction.reply(
            `❌ You don't have that paper.\n\n` +
            `Visit \`/shop\` to buy more.`
          );
        }

        if (player.weed < 5) {

          return interaction.reply(
            "🌿 You need at least **5 fictional weed** to roll a joint."
          );
        }

        player.papers[paper]--;
        player.weed -= 5;
        player.joints++;
        player.jointsRolled++;

        const paperName =
          paper === "raw_cone"
            ? "RAW Cone"
            : paper === "king_size"
              ? "King Size Papers"
              : "Blunt Wrap";

        addXP(player, 20);

        if (
          player.jointsRolled >= 10 &&
          !player.achievements.includes(
            "Valley Roller"
          )
        ) {
          player.achievements.push(
            "Valley Roller"
          );
        }

        saveDatabase();

        return interaction.reply(
          `🚬💨 **JOINT ROLLED!**\n\n` +
          `Paper: **${paperName}**\n` +
          `🌿 Used: **5 fictional weed**\n` +
          `🚬 Joints ready: **${player.joints}**\n` +
          `✨ +20 XP\n\n` +
          `Use \`/use item:joint\` to smoke it.`
        );
      }

      /* =====================================================
         USE ITEMS
      ===================================================== */

      if (command === "use") {

        const item =
          interaction.options.getString("item");

        if (item === "joint") {

          if (player.joints <= 0) {
            return interaction.reply(
              "🚬 You don't have a joint. Use `/joint roll` first."
            );
          }

          player.joints--;
          player.jointUses++;
          player.smokeSessions++;

          addXP(player, 15);

          saveDatabase();

          return interaction.reply(
            `🚬💨 **JOINT SESSION**\n\n` +
            `😮‍💨 You sparked up a fictional Valley joint.\n` +
            `🚬 Joints remaining: **${player.joints}**\n` +
            `✨ +15 XP`
          );
        }

        if (item === "cart") {

          if (player.carts <= 0) {
            return interaction.reply(
              "💨 You don't have a fictional cart. Buy one from `/shop`."
            );
          }

          player.carts--;
          player.cartUses++;
          player.smokeSessions++;

          addXP(player, 20);

          saveDatabase();

          return interaction.reply(
            `💨 **CART SESSION**\n\n` +
            `⚡ Fictional cart used!\n` +
            `💨 Carts remaining: **${player.carts}**\n` +
            `✨ +20 XP`
          );
        }

        if (item === "wax") {

          if (player.wax <= 0) {
            return interaction.reply(
              "🍯 You don't have fictional wax. Buy some from `/shop`."
            );
          }

          player.wax--;
          player.waxUses++;
          player.smokeSessions++;

          addXP(player, 25);

          saveDatabase();

          return interaction.reply(
            `🍯💨 **WAX SESSION**\n\n` +
            `😮‍💨 Fictional Valley session complete!\n` +
            `🍯 Wax remaining: **${player.wax}**\n` +
            `✨ +25 XP`
          );
        }
      }

      /* =====================================================
         CELEBRITY
      ===================================================== */

      if (command === "celebrity") {

        const person =
          interaction.options.getString("person");

        const celeb =
          celebrities[person];

        if (!celeb) {
          return interaction.reply(
            "❌ Celebrity not found."
          );
        }

        player.smokeSessions++;

        addXP(player, 10);

        saveDatabase();

        return interaction.reply(
          `${celeb.emoji} **FICTIONAL VALLEY SESSION**\n\n` +
          `**${celeb.name}**\n\n` +
          `${celeb.message}\n\n` +
          `✨ +10 XP\n\n` +
          `*This is fictional roleplay and is not affiliated with or endorsed by the person named.*`
        );
      }

      /* =====================================================
         PROPERTY VIEW
      ===================================================== */

      if (
        command === "property" &&
        interaction.options.getSubcommand() === "view"
      ) {

        const vaultCapacity =
          player.vault
            ? 100 * player.vaultLevel
            : 0;

        return interaction.reply(
          `🏠 **YOUR VALLEY PROPERTY**\n\n` +

          `🏠 House: **${
            player.house
              ? `Level ${player.houseLevel}`
              : "Not owned"
          }**\n` +

          `🔐 Vault: **${
            player.vault
              ? `Level ${player.vaultLevel}`
              : "Not owned"
          }**\n` +

          `🌿 Vault Storage: **${player.vaultWeed}/${vaultCapacity}**\n` +

          `🛡️ Security: **Level ${player.security}**`
        );
      }

      /* =====================================================
         BUY HOUSE
      ===================================================== */

      if (
        command === "property" &&
        interaction.options.getSubcommand() === "buy"
      ) {

        if (player.house) {
          return interaction.reply(
            "🏠 You already own a house."
          );
        }

        const cost = 5000;

        if (player.cash < cost) {
          return interaction.reply(
            `❌ You need **${money(cost)}** to buy a house.`
          );
        }

        player.cash -= cost;
        player.house = true;
        player.houseLevel = 1;

        saveDatabase();

        return interaction.reply(
          `🏠 **HOUSE PURCHASED!**\n\n` +
          `Welcome to your new Valley home.\n` +
          `💰 Paid: **${money(cost)}**\n\n` +
          `You can now upgrade your property and buy a vault.`
        );
      }

      /* =====================================================
         HOUSE UPGRADE
      ===================================================== */

      if (
        command === "property" &&
        interaction.options.getSubcommand() === "upgrade"
      ) {

        if (!player.house) {
          return interaction.reply(
            "❌ Buy a house first with `/property buy`."
          );
        }

        const cost =
          5000 * player.houseLevel;

        if (player.cash < cost) {
          return interaction.reply(
            `❌ House upgrade costs **${money(cost)}**.`
          );
        }

        player.cash -= cost;
        player.houseLevel++;

        player.storage += 50;

        saveDatabase();

        return interaction.reply(
          `🏠 **HOUSE UPGRADED!**\n\n` +
          `New level: **${player.houseLevel}**\n` +
          `Storage capacity increased to **${player.storage}**\n` +
          `💰 Paid: **${money(cost)}**`
        );
      }

      /* =====================================================
         VAULT
      ===================================================== */

      if (
        command === "property" &&
        interaction.options.getSubcommand() === "vault"
      ) {

        if (!player.house) {
          return interaction.reply(
            "❌ You need a house before you can have a vault."
          );
        }

        if (!player.vault) {

          const cost = 7500;

          if (player.cash < cost) {
            return interaction.reply(
              `❌ You need **${money(cost)}** for a vault.`
            );
          }

          player.cash -= cost;
          player.vault = true;
          player.vaultLevel = 1;

          saveDatabase();

          return interaction.reply(
            `🔐 **VAULT PURCHASED!**\n\n` +
            `Vault capacity: **100 weed**\n` +
            `💰 Paid: **${money(cost)}**`
          );
        }

        const cost =
          7500 * player.vaultLevel;

        if (player.cash < cost) {
          return interaction.reply(
            `❌ Vault upgrade costs **${money(cost)}**.`
          );
        }

        player.cash -= cost;
        player.vaultLevel++;

        saveDatabase();

        return interaction.reply(
          `🔐 **VAULT UPGRADED!**\n\n` +
          `Vault level: **${player.vaultLevel}**\n` +
          `Capacity: **${100 * player.vaultLevel} weed**\n` +
          `💰 Paid: **${money(cost)}**`
        );
      }

      /* =====================================================
         VAULT DEPOSIT
      ===================================================== */

      if (
        command === "property" &&
        interaction.options.getSubcommand() === "deposit"
      ) {

        if (!player.vault) {
          return interaction.reply(
            "❌ You don't own a vault."
          );
        }

        const amount =
          interaction.options.getInteger("amount");

        const capacity =
          100 * player.vaultLevel;

        if (player.weed < amount) {
          return interaction.reply(
            "❌ You don't have that much fictional weed."
          );
        }

        if (
          player.vaultWeed + amount >
          capacity
        ) {
          return interaction.reply(
            `🔐 Your vault can only hold **${capacity} weed**.`
          );
        }

        player.weed -= amount;
        player.vaultWeed += amount;

        saveDatabase();

        return interaction.reply(
          `🔐 **VAULT DEPOSIT**\n\n` +
          `Stored: **${amount} weed**\n` +
          `Vault: **${player.vaultWeed}/${capacity}**`
        );
      }

      /* =====================================================
         VAULT WITHDRAW
      ===================================================== */

      if (
        command === "property" &&
        interaction.options.getSubcommand() === "withdraw"
      ) {

        if (!player.vault) {
          return interaction.reply(
            "❌ You don't own a vault."
          );
        }

        const amount =
          interaction.options.getInteger("amount");

        if (player.vaultWeed < amount) {
          return interaction.reply(
            "❌ Your vault doesn't contain that much."
          );
        }

        if (
          player.weed + amount >
          player.storage
        ) {
          return interaction.reply(
            "📦 Your personal storage doesn't have enough room."
          );
        }

        player.vaultWeed -= amount;
        player.weed += amount;

        saveDatabase();

        return interaction.reply(
          `🔓 **VAULT WITHDRAWAL**\n\n` +
          `Removed: **${amount} weed**\n` +
          `Vault: **${player.vaultWeed}/${100 * player.vaultLevel}**`
        );
      }

      /* =====================================================
         BUSINESS VIEW
      ===================================================== */

      if (
        command === "business" &&
        interaction.options.getSubcommand() === "view"
      ) {

        const income =
          player.businessLevel * 100;

        return interaction.reply(
          `🏪 **YOUR VALLEY BUSINESS**\n\n` +
          `Level: **${player.businessLevel}**\n` +
          `Passive fictional income: **${money(income)}** per collection\n\n` +
          `Upgrade cost: **${money(1000 * (player.businessLevel + 1))}**`
        );
      }

      /* =====================================================
         BUSINESS UPGRADE
      ===================================================== */

      if (
        command === "business" &&
        interaction.options.getSubcommand() === "upgrade"
      ) {

        const cost =
          1000 * (player.businessLevel + 1);

        if (player.cash < cost) {
          return interaction.reply(
            `❌ You need **${money(cost)}** to upgrade.`
          );
        }

        player.cash -= cost;
        player.businessLevel++;

        saveDatabase();

        return interaction.reply(
          `🏪 **BUSINESS UPGRADED!**\n\n` +
          `Business level: **${player.businessLevel}**\n` +
          `💰 Paid: **${money(cost)}**`
        );
      }

      /* =====================================================
         JOB LIST
      ===================================================== */

      if (
        command === "job" &&
        interaction.options.getSubcommand() === "list"
      ) {

        return interaction.reply(
          `💼 **VALLEY JOB BOARD**\n\n` +

          `🌿 **Dispensary Worker**\n` +
          `Pay: $250–$600\n\n` +

          `🛡️ **Valley Security**\n` +
          `Pay: $300–$700\n\n` +

          `🚗 **Valley Delivery**\n` +
          `Pay: $200–$550\n\n` +

          `🍃 **Budtender**\n` +
          `Pay: $350–$800\n\n` +

          `Apply with \`/job apply\`.`
        );
      }

      /* =====================================================
         JOB APPLY
      ===================================================== */

      if (
        command === "job" &&
        interaction.options.getSubcommand() === "apply"
      ) {

        const job =
          interaction.options.getString("job");

        if (!jobs[job]) {
          return interaction.reply(
            "❌ That job doesn't exist."
          );
        }

        if (player.job === job) {
          return interaction.reply(
            `💼 You're already a **${jobs[job].name}**.`
          );
        }

        player.job = job;
        player.jobLevel = 1;
        player.applications.push(job);

        saveDatabase();

        return interaction.reply(
          `📋 **APPLICATION ACCEPTED!**\n\n` +
          `${jobs[job].emoji} Job: **${jobs[job].name}**\n` +
          `⭐ Job Level: **1**\n\n` +
          `Use \`/job work\` when you're ready to work.`
        );
      }

      /* =====================================================
         JOB WORK
      ===================================================== */

      if (
        command === "job" &&
        interaction.options.getSubcommand() === "work"
      ) {

        if (!player.job) {
          return interaction.reply(
            "❌ You don't have a job. Use `/job list`."
          );
        }

        const job =
          jobs[player.job];

        const remaining =
          cooldownRemaining(
            player.lastJob,
            job.cooldown
          );

        if (remaining) {
          return interaction.reply(
            `⏳ Your next shift is available in **${remaining}**.`
          );
        }

        player.lastJob = Date.now();

        const basePay =
          Math.floor(
            Math.random() *
              (job.pay[1] - job.pay[0] + 1)
          ) + job.pay[0];

        const reward =
          basePay +
          (player.jobLevel - 1) * 50;

        player.cash += reward;
        player.jobsWorked++;

        const leveled =
          addXP(player, 30);

        if (
          player.jobsWorked >= 10 &&
          !player.achievements.includes(
            "Hard Worker"
          )
        ) {
          player.achievements.push(
            "Hard Worker"
          );
        }

        saveDatabase();

        return interaction.reply(
          `${job.emoji} **SHIFT COMPLETE!**\n\n` +
          `Job: **${job.name}**\n` +
          `💰 Pay: **${money(reward)}**\n` +
          `✨ +30 XP` +
          (
            leveled
              ? `\n🎉 **LEVEL UP! Level ${player.level}!**`
              : ""
          )
        );
      }

      /* =====================================================
         JOB QUIT
      ===================================================== */

      if (
        command === "job" &&
        interaction.options.getSubcommand() === "quit"
      ) {

        if (!player.job) {
          return interaction.reply(
            "❌ You don't currently have a job."
          );
        }

        const oldJob =
          jobs[player.job].name;

        player.job = null;
        player.jobLevel = 1;

        saveDatabase();

        return interaction.reply(
          `📋 You quit your job as **${oldJob}**.`
        );
      }

      /* =====================================================
         RAID
      ===================================================== */

      if (command === "raid") {

        const target =
          interaction.options.getUser("user");

        if (target.id === interaction.user.id) {
          return interaction.reply(
            "😂 You can't raid yourself."
          );
        }

        if (target.bot) {
          return interaction.reply(
            "🤖 You can't raid a bot."
          );
        }

        const victim =
          getUser(target);

        if (!victim.vault) {
          return interaction.reply(
            "🔐 That player doesn't have a vault to raid."
          );
        }

        if (player.level < 5) {
          return interaction.reply(
            "🥷 You need to reach **level 5** before raiding."
          );
        }

        const cooldown =
          60 * 60 * 1000;

        const remaining =
          cooldownRemaining(
            player.lastWork,
            cooldown
          );

        /* Use a separate raid timestamp if possible */
        player.lastRaid ??= 0;

        const raidRemaining =
          cooldownRemaining(
            player.lastRaid,
            cooldown
          );

        if (raidRemaining) {
          return interaction.reply(
            `⏳ Your next raid is ready in **${raidRemaining}**.`
          );
        }

        player.lastRaid = Date.now();
        player.raids++;

        const securityChance =
          Math.min(
            0.75,
            0.20 +
            victim.security * 0.10
          );

        const caught =
          Math.random() < securityChance;

        if (caught) {

          const fine =
            Math.min(
              player.cash,
              Math.floor(
                Math.random() * 401
              ) + 100
            );

          player.cash -= fine;

          saveDatabase();

          return interaction.reply(
            `🚨 **RAID FAILED!**\n\n` +
            `🛡️ **${target.username}**'s security stopped you.\n` +
            `💸 Fine: **${money(fine)}**`
          );
        }

        if (victim.vaultWeed <= 0) {

          saveDatabase();

          return interaction.reply(
            `🥷 **RAID SUCCESSFUL!**\n\n` +
            `You broke into the vault, but it was empty.`
          );
        }

        const stolen =
          Math.max(
            1,
            Math.floor(
              victim.vaultWeed *
              (Math.random() * 0.25 + 0.10)
            )
          );

        victim.vaultWeed -= stolen;

        player.weed =
          Math.min(
            player.storage,
            player.weed + stolen
          );

        player.successfulRaids++;

        addXP(player, 50);

        saveDatabase();

        return interaction.reply(
          `🥷 **RAID SUCCESSFUL!**\n\n` +
          `Target: **${target.username}**\n` +
          `🌿 Stolen: **${stolen} fictional weed**\n` +
          `✨ +50 XP`
        );
      }

      /* =====================================================
         DICE
      ===================================================== */

      if (command === "dice") {

        const roll =
          Math.floor(Math.random() * 6) + 1;

        return interaction.reply(
          `🎲 **You rolled a ${roll}!**`
        );
      }

      /* =====================================================
         COINFLIP
      ===================================================== */

      if (command === "coinflip") {

        const result =
          Math.random() < 0.5
            ? "HEADS 🪙"
            : "TAILS 🪙";

        return interaction.reply(
          `🪙 **The Valley coin landed on ${result}!**`
        );
      }

      /* =====================================================
         8 BALL
      ===================================================== */

      if (command === "8ball") {

        const answers = [
          "🌿 Absolutely.",
          "😮‍💨 Probably.",
          "🤔 Ask again later.",
          "💨 The Valley says maybe.",
          "😂 Bro, I have no idea.",
          "🔥 Looking good.",
          "❌ Not happening.",
          "👀 You might be onto something.",
          "🌙 Try again tonight.",
          "🍃 The vibes say yes."
        ];

        const answer =
          answers[
            Math.floor(
              Math.random() * answers.length
            )
          ];

        return interaction.reply(
          `🎱 **VALLEY 8-BALL**\n\n${answer}`
        );
      }

      /* =====================================================
         HIGH
      ===================================================== */

      if (command === "high") {

        const messages = [
          "😮‍💨 You forgot what you were doing.",
          "🌿 The couch has officially claimed you.",
          "😂 You opened Discord and forgot why.",
          "💨 Your brain just entered airplane mode.",
          "👀 Wait... what were we talking about?",
          "🍕 Suddenly food sounds incredible.",
          "🎮 Time to play something.",
          "🌙 The Valley vibes are immaculate."
        ];

        const message =
          messages[
            Math.floor(
              Math.random() * messages.length
            )
          ];

        return interaction.reply(
          `🌿 **VALLEY MOMENT**\n\n${message}`
        );
      }

      /* =====================================================
         SMOKE
      ===================================================== */

      if (command === "smoke") {

        const messages = [
          "🚬💨 *passes the fictional Valley joint*",
          "🌿💨 The Valley session has officially started.",
          "😮‍💨 Somebody turn on the music.",
          "🎶🌿 Chill mode activated.",
          "🍃💨 Couch locked.",
          "😂💨 Somebody just said something hilarious."
        ];

        const message =
          messages[
            Math.floor(
              Math.random() * messages.length
            )
          ];

        return interaction.reply(
          message
        );
      }

      /* =====================================================
         MISSIONS
      ===================================================== */

      if (command === "missions") {

        return interaction.reply(
          `🎯 **VALLEY MISSIONS**\n\n` +
          `🌱 Plant 5 crops\n` +
          `🌿 Harvest 10 crops\n` +
          `💰 Earn $1,000\n` +
          `🚬 Roll 10 joints\n` +
          `💼 Work 10 shifts\n` +
          `🏠 Buy a house\n` +
          `🔐 Buy a vault\n` +
          `🥷 Complete a successful raid\n\n` +
          `Keep playing to unlock achievements!`
        );
      }

      /* =====================================================
         ACHIEVEMENTS
      ===================================================== */

      if (command === "achievements") {

        return interaction.reply(
          `🏆 **YOUR ACHIEVEMENTS**\n\n` +
          (
            player.achievements.length
              ? player.achievements
                  .map(
                    achievement =>
                      `🏆 ${achievement}`
                  )
                  .join("\n")
              : "You haven't unlocked any yet."
          )
        );
      }

      /* =====================================================
         LEADERBOARD
      ===================================================== */

      if (command === "leaderboard") {

        const users =
          Object.values(database.users)
            .sort(
              (a, b) =>
                b.cash - a.cash
            )
            .slice(0, 10);

        const lines =
          users.map(
            (u, index) =>
              `**${index + 1}.** ${u.name} — ${money(u.cash)}`
          );

        return interaction.reply(
          `🏆 **STONER VALLEY LEADERBOARD**\n\n` +
          (
            lines.length
              ? lines.join("\n")
              : "Nobody is on the leaderboard yet."
          )
        );
      }

      /* =====================================================
         STAFF
      ===================================================== */

      if (command === "staff") {

        const sub =
          interaction.options.getSubcommand();

        if (sub === "login") {

          const password =
            interaction.options.getString(
              "password"
            );

          if (password !== STAFF_PASSWORD) {

            await securityAlert(
              `Failed staff login attempt by ${interaction.user.tag} (${interaction.user.id})`
            );

            return interaction.reply({
              content:
                "❌ Incorrect staff password.",
              ephemeral: true
            });
          }

          staffSessions.set(
            interaction.user.id,
            Date.now() +
              2 * 60 * 60 * 1000
          );

          return interaction.reply({
            content:
              "🛡️ **Staff login successful.**\nSession active for 2 hours.",
            ephemeral: true
          });
        }

        if (sub === "logout") {

          staffSessions.delete(
            interaction.user.id
          );

          return interaction.reply({
            content:
              "🔒 Staff session ended.",
            ephemeral: true
          });
        }

        if (!isStaff(interaction.user.id)) {

          return interaction.reply({
            content:
              "🔒 You must use `/staff login` first.",
            ephemeral: true
          });
        }

        if (sub === "panel") {

          return interaction.reply({
            content:
              `🛡️ **STAFF PANEL**\n\n` +
              `📊 Players: **${Object.keys(database.users).length}**\n` +
              `🌿 Market: **${money(database.market.weed)}**\n\n` +
              `Use:\n` +
              `\`/staff stats\`\n` +
              `\`/staff addcash\`\n` +
              `\`/staff addweed\``,
            ephemeral: true
          });
        }

        if (sub === "stats") {

          const totalUsers =
            Object.keys(
              database.users
            ).length;

          const totalCash =
            Object.values(
              database.users
            ).reduce(
              (sum, user) =>
                sum + user.cash,
              0
            );

          return interaction.reply({
            content:
              `📊 **BOT STATISTICS**\n\n` +
              `👥 Players: **${totalUsers}**\n` +
              `💰 Economy Cash: **${money(totalCash)}**\n` +
              `🌿 Market Price: **${money(database.market.weed)}**`,
            ephemeral: true
          });
        }

        if (sub === "addcash") {

          const target =
            interaction.options.getUser(
              "user"
            );

          const amount =
            interaction.options.getInteger(
              "amount"
            );

          const targetPlayer =
            getUser(target);

          targetPlayer.cash += amount;

          saveDatabase();

          return interaction.reply({
            content:
              `💰 Added **${money(amount)}** to ${target}.`,
            ephemeral: true
          });
        }

        if (sub === "addweed") {

          const target =
            interaction.options.getUser(
              "user"
            );

          const amount =
            interaction.options.getInteger(
              "amount"
            );

          const targetPlayer =
            getUser(target);

          targetPlayer.weed =
            Math.min(
              targetPlayer.storage,
              targetPlayer.weed + amount
            );

          saveDatabase();

          return interaction.reply({
            content:
              `🌿 Added **${amount} fictional weed** to ${target}.`,
            ephemeral: true
          });
        }
      }

    } catch (error) {

      console.error(
        "Interaction error:",
        error
      );

      await securityAlert(
        `Interaction error: ${error.message}`
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            "❌ Something went wrong. The error has been logged.",
          ephemeral: true
        });
      }
    }
  }
);

/* =========================================================
   AUTOMATIC SAVES
========================================================= */

setInterval(() => {
  saveDatabase();
}, 30000);

setInterval(() => {
  backupDatabase();
}, 5 * 60 * 1000);

setInterval(() => {
  randomMarket();
  saveDatabase();

  console.log(
    `📈 Market updated: ${database.market.weed}`
  );
}, 10 * 60 * 1000);

/* =========================================================
   ERROR HANDLING
========================================================= */

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "Unhandled rejection:",
      error
    );

    securityAlert(
      `Unhandled rejection: ${
        error.message || error
      }`
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "Uncaught exception:",
      error
    );

    securityAlert(
      `Uncaught exception: ${
        error.message || error
      }`
    );
  }
);

/* =========================================================
   LOGIN
========================================================= */

client.login(TOKEN);