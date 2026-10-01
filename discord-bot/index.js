"use strict";

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = "1548055362740035686";
const STAFF_PASSWORD =
  process.env.STAFF_PASSWORD || "Eddies valley";
const ALERT_CHANNEL_ID =
  process.env.ALERT_CHANNEL_ID || "";

if (!TOKEN) {
  console.error(
    "❌ DISCORD_TOKEN is missing from Replit Secrets."
  );
  process.exit(1);
}

/* =========================
   DATABASE
========================= */

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
      const saved = JSON.parse(
        fs.readFileSync(DATA_FILE, "utf8")
      );

      database = {
        ...database,
        ...saved,
        users: saved.users || {},
        market: {
          ...database.market,
          ...(saved.market || {})
        }
      };
    }
  } catch (error) {
    console.error(
      "❌ Database load error:",
      error
    );
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(database, null, 2)
    );
  } catch (error) {
    console.error(
      "❌ Database save error:",
      error
    );
  }
}

function backupDatabase() {
  try {
    fs.writeFileSync(
      BACKUP_FILE,
      JSON.stringify(database, null, 2)
    );
  } catch (error) {
    console.error(
      "❌ Backup error:",
      error
    );
  }
}

loadDatabase();

/* =========================
   CLIENT
========================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* =========================
   USER DATA
========================= */

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
      lastRaid: 0,

      achievements: [],

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

      house: false,
      houseLevel: 0,

      vault: false,
      vaultLevel: 0,
      vaultWeed: 0,

      security: 0,

      job: null,
      jobLevel: 0,
      lastJob: 0,
      applications: [],

      jointsRolled: 0,
      smokeSessions: 0,
      raids: 0,
      successfulRaids: 0,
      jobsWorked: 0,

      joined: Date.now()
    };
  }

  const player = database.users[user.id];

  player.name = user.username;

  player.cash ??= 500;
  player.weed ??= 25;
  player.seeds ??= 5;
  player.storage ??= 100;

  player.xp ??= 0;
  player.level ??= 1;

  player.planted ??= 0;
  player.fertilizer ??= 0;
  player.premiumSeeds ??= 0;
  player.luckyCharm ??= 0;

  player.businessLevel ??= 0;

  player.dailyStreak ??= 0;
  player.lastDaily ??= 0;
  player.lastWork ??= 0;
  player.lastRaid ??= 0;

  player.achievements ??= [];

  player.papers ??= {};
  player.papers.raw_cone ??= 0;
  player.papers.king_size ??= 0;
  player.papers.blunt_wrap ??= 0;

  player.joints ??= 0;
  player.carts ??= 0;
  player.wax ??= 0;

  player.jointUses ??= 0;
  player.cartUses ??= 0;
  player.waxUses ??= 0;

  player.house ??= false;
  player.houseLevel ??= 0;

  player.vault ??= false;
  player.vaultLevel ??= 0;
  player.vaultWeed ??= 0;

  player.security ??= 0;

  player.job ??= null;
  player.jobLevel ??= 0;
  player.lastJob ??= 0;
  player.applications ??= [];

  player.jointsRolled ??= 0;
  player.smokeSessions ??= 0;
  player.raids ??= 0;
  player.successfulRaids ??= 0;
  player.jobsWorked ??= 0;

  player.joined ??= Date.now();

  return player;
}

/* =========================
   UTILITIES
========================= */

function money(amount) {
  return `$${Math.floor(amount).toLocaleString()}`;
}

function cooldownRemaining(lastTime, cooldown) {
  const remaining =
    cooldown - (Date.now() - lastTime);

  return Math.max(0, remaining);
}

function formatTime(ms) {
  const seconds = Math.ceil(ms / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);

  return `${hours}h ${minutes % 60}m`;
}

function addXP(player, amount) {
  player.xp += amount;

  const needed =
    player.level * 100;

  let leveled = false;

  while (player.xp >= needed) {
    player.xp -= player.level * 100;
    player.level++;
    leveled = true;
  }

  return leveled;
}

function randomMarket() {
  const change =
    Math.floor(Math.random() * 21) - 10;

  database.market.weed = Math.max(
    10,
    Math.min(
      75,
      database.market.weed + change
    )
  );

  database.market.lastUpdate = Date.now();
}

function getUserById(id) {
  return database.users[id] || null;
}

/* =========================
   SECURITY
========================= */

const staffSessions = new Map();

function isStaff(userId) {
  const session = staffSessions.get(userId);

  if (!session) {
    return false;
  }

  if (Date.now() > session.expires) {
    staffSessions.delete(userId);
    return false;
  }

  return true;
}

async function securityAlert(message) {
  console.log(`🚨 SECURITY: ${message}`);

  if (!ALERT_CHANNEL_ID) {
    return;
  }

  try {
    const channel =
      await client.channels.fetch(
        ALERT_CHANNEL_ID
      );

    if (channel) {
      await channel.send(
        `🚨 **SECURITY ALERT**\n${message}`
      );
    }
  } catch (error) {
    console.error(
      "Security alert failed:",
      error.message
    );
  }
}

/* =========================
   CELEBRITIES
========================= */

const celebrities = {
  snoop: {
    name: "Snoop Dogg",
    emoji: "🌴",
    message:
      "Snoop's fictional Valley session is underway. Keep it chill."
  },

  wiz: {
    name: "Wiz Khalifa",
    emoji: "🌿",
    message:
      "Wiz's fictional Valley session has you floating."
  },

  willie: {
    name: "Willie Nelson",
    emoji: "🎸",
    message:
      "Willie's fictional Valley session is nice and laid-back."
  },

  seth: {
    name: "Seth Rogen",
    emoji: "😂",
    message:
      "Seth's fictional Valley session has everybody laughing."
  },

  cheech: {
    name: "Cheech & Chong",
    emoji: "🔥",
    message:
      "Cheech & Chong's fictional Valley session is pure chaos."
  },

  flight: {
    name: "FlightReacts",
    emoji: "🏀",
    message:
      "Flight's fictional Valley session just went completely off the rails."
  }
};

/* =========================
   JOBS
========================= */

const jobs = {
  dispensary: {
    name: "Dispensary Worker",
    min: 250,
    max: 600
  },

  security: {
    name: "Valley Security",
    min: 300,
    max: 700
  },

  delivery: {
    name: "Valley Delivery",
    min: 200,
    max: 550
  },

  budtender: {
    name: "Budtender",
    min: 350,
    max: 800
  }
};

/* =========================
   SLASH COMMANDS
========================= */

const commands = [

  new SlashCommandBuilder()
    .setName("valley")
    .setDescription(
      "Open your Stoner Valley dashboard"
    ),

  new SlashCommandBuilder()
    .setName("info")
    .setDescription(
      "View all Stoner Valley commands"
    ),

  new SlashCommandBuilder()
    .setName("balance")
    .setDescription(
      "Check your Valley cash"
    ),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription(
      "View your Valley profile"
    ),

  new SlashCommandBuilder()
    .setName("inventory")
    .setDescription(
      "View your Valley inventory"
    ),

  new SlashCommandBuilder()
    .setName("plant")
    .setDescription(
      "Plant fictional Valley seeds"
    ),

  new SlashCommandBuilder()
    .setName("harvest")
    .setDescription(
      "Harvest your fictional crop"
    ),

  new SlashCommandBuilder()
    .setName("shop")
    .setDescription(
      "View the Valley shop"
    ),

  new SlashCommandBuilder()
    .setName("buy")
    .setDescription(
      "Buy an item from the shop"
    )
    .addStringOption(option =>
      option
        .setName("item")
        .setDescription("Item to buy")
        .setRequired(true)
        .addChoices(
          { name: "Seeds", value: "seeds" },
          { name: "Fertilizer", value: "fertilizer" },
          { name: "Premium Seeds", value: "premium" },
          { name: "Lucky Charm", value: "charm" },
          { name: "RAW Cone", value: "raw_cone" },
          { name: "King Size Papers", value: "king_size" },
          { name: "Blunt Wrap", value: "blunt_wrap" },
          { name: "Fictional Weed Cart", value: "cart" },
          { name: "Fictional Wax", value: "wax" }
        )
    )
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("Amount to buy")
        .setMinValue(1)
        .setMaxValue(50)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("sell")
    .setDescription(
      "Sell your fictional Valley weed"
    )
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("Amount to sell")
        .setMinValue(1)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("market")
    .setDescription(
      "Check the fictional Valley market"
    ),

  new SlashCommandBuilder()
    .setName("daily")
    .setDescription(
      "Claim your daily Valley reward"
    ),

  new SlashCommandBuilder()
    .setName("work")
    .setDescription(
      "Work a quick Valley side job"
    ),

  new SlashCommandBuilder()
    .setName("risk")
    .setDescription(
      "Take a fictional gamble with your cash"
    ),

  new SlashCommandBuilder()
    .setName("missions")
    .setDescription(
      "View Valley missions"
    ),

  new SlashCommandBuilder()
    .setName("achievements")
    .setDescription(
      "View your achievements"
    ),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription(
      "View the richest Valley members"
    ),

  new SlashCommandBuilder()
    .setName("joint")
    .setDescription(
      "Roll a fictional joint"
    )
    .addStringOption(option =>
      option
        .setName("paper")
        .setDescription("Paper type")
        .setRequired(true)
        .addChoices(
          { name: "RAW Cone", value: "raw_cone" },
          { name: "King Size", value: "king_size" },
          { name: "Blunt Wrap", value: "blunt_wrap" }
        )
    ),

  new SlashCommandBuilder()
    .setName("use")
    .setDescription(
      "Use a Valley item"
    )
    .addStringOption(option =>
      option
        .setName("item")
        .setDescription("Item to use")
        .setRequired(true)
        .addChoices(
          { name: "Joint", value: "joint" },
          { name: "Cart", value: "cart" },
          { name: "Wax", value: "wax" }
        )
    ),

  new SlashCommandBuilder()
    .setName("celebrity")
    .setDescription(
      "Start a fictional celebrity session"
    )
    .addStringOption(option =>
      option
        .setName("person")
        .setDescription("Choose a celebrity")
        .setRequired(true)
        .addChoices(
          { name: "Snoop Dogg", value: "snoop" },
          { name: "Wiz Khalifa", value: "wiz" },
          { name: "Willie Nelson", value: "willie" },
          { name: "Seth Rogen", value: "seth" },
          { name: "Cheech & Chong", value: "cheech" },
          { name: "FlightReacts", value: "flight" }
        )
    ),

  new SlashCommandBuilder()
    .setName("property")
    .setDescription(
      "Manage your Valley property"
    )
    .addStringOption(option =>
      option
        .setName("action")
        .setDescription("Property action")
        .setRequired(true)
        .addChoices(
          { name: "View", value: "view" },
          { name: "Buy House", value: "buy" },
          { name: "Upgrade House", value: "upgrade" },
          { name: "Vault", value: "vault" },
          { name: "Deposit", value: "deposit" },
          { name: "Withdraw", value: "withdraw" }
        )
    )
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("Amount of fictional weed")
        .setMinValue(1)
    ),

  new SlashCommandBuilder()
    .setName("business")
    .setDescription(
      "Manage your Valley business"
    )
    .addStringOption(option =>
      option
        .setName("action")
        .setDescription("Business action")
        .setRequired(true)
        .addChoices(
          { name: "View", value: "view" },
          { name: "Upgrade", value: "upgrade" }
        )
    ),

  new SlashCommandBuilder()
    .setName("job")
    .setDescription(
      "Manage your Valley job"
    )
    .addStringOption(option =>
      option
        .setName("action")
        .setDescription("Job action")
        .setRequired(true)
        .addChoices(
          { name: "List", value: "list" },
          { name: "Apply", value: "apply" },
          { name: "Work", value: "work" },
          { name: "Quit", value: "quit" }
        )
    )
    .addStringOption(option =>
      option
        .setName("job")
        .setDescription("Job to apply for")
        .addChoices(
          { name: "Dispensary Worker", value: "dispensary" },
          { name: "Valley Security", value: "security" },
          { name: "Valley Delivery", value: "delivery" },
          { name: "Budtender", value: "budtender" }
        )
    ),

  new SlashCommandBuilder()
    .setName("raid")
    .setDescription(
      "Attempt a fictional vault raid"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member to raid")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("dice")
    .setDescription(
      "Roll the Valley dice"
    ),

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription(
      "Flip a Valley coin"
    ),

  new SlashCommandBuilder()
    .setName("eightball")
    .setDescription(
      "Ask the Valley 8-ball"
    )
    .addStringOption(option =>
      option
        .setName("question")
        .setDescription("Ask a question")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("high")
    .setDescription(
      "Take a fictional highness test"
    ),

  new SlashCommandBuilder()
    .setName("smoke")
    .setDescription(
      "Start a fictional smoke session"
    ),

  new SlashCommandBuilder()
    .setName("staff")
    .setDescription(
      "Stoner Valley staff controls"
    )
    .addSubcommand(sub =>
      sub
        .setName("login")
        .setDescription("Log into staff controls")
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
        .setDescription("Log out of staff controls")
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

/* =========================
   INFO
========================= */

function infoText() {
  return [
    "🌿 **STONER VALLEY COMMANDS**",
    "",
    "**💰 Economy**",
    "`/balance` — Check your cash",
    "`/daily` — Claim your daily reward",
    "`/work` — Work for cash",
    "`/risk` — Risk your cash",
    "`/market` — Check the market",
    "`/buy` — Buy shop items",
    "`/sell` — Sell fictional weed",
    "",
    "**🌱 Growing**",
    "`/plant` — Plant seeds",
    "`/harvest` — Harvest your crop",
    "`/inventory` — View inventory",
    "",
    "**🏠 Property**",
    "`/property` — Manage your house and vault",
    "`/business` — Manage your business",
    "",
    "**💨 Sessions**",
    "`/joint` — Roll a fictional joint",
    "`/use` — Use a fictional item",
    "`/celebrity` — Fictional celebrity session",
    "`/smoke` — Start a smoke session",
    "`/high` — Take a fictional highness test",
    "",
    "**🎮 Fun**",
    "`/dice` — Roll dice",
    "`/coinflip` — Flip a coin",
    "`/eightball` — Ask the Valley 8-ball",
    "",
    "**💼 Jobs & Missions**",
    "`/job` — Manage your job",
    "`/missions` — View missions",
    "`/achievements` — View achievements",
    "`/leaderboard` — View leaderboard",
    "`/raid` — Attempt a fictional vault raid",
    "",
    "**🌿 Valley**",
    "`/valley` — Open your dashboard",
    "`/profile` — View your profile",
    "`/shop` — View the shop",
    "`/info` — View this menu",
    "",
    "**🛡️ Staff**",
    "`/staff login` — Staff login",
    "`/staff panel` — Staff panel",
    "`/staff stats` — Bot statistics",
    "`/staff addcash` — Give fictional cash",
    "`/staff addweed` — Give fictional weed"
  ].join("\n");
}

/* =========================
   READY / COMMAND REGISTRATION
========================= */

client.once("ready", async () => {
  console.log(
    `🌿 Logged in as ${client.user.tag}`
  );

  try {
    const rest = new REST({
      version: "10"
    }).setToken(TOKEN);

    console.log(
      `📡 Registering commands to Stoner Valley: ${GUILD_ID}`
    );

    await rest.put(
      Routes.applicationGuildCommands(
        client.user.id,
        GUILD_ID
      ),
      {
        body: commands.map(command =>
          command.toJSON()
        )
      }
    );

    console.log(
      "✅ Slash commands registered."
    );

    console.log(
      "🌿 Stoner Valley is online!"
    );

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

/* =========================
   INTERACTIONS
========================= */

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command =
      interaction.commandName;

    const player =
      getUser(interaction.user);

    try {

      /* =====================
         VALLEY
      ===================== */

      if (command === "valley") {

        const embed =
          new EmbedBuilder()
            .setTitle("🌿 STONER VALLEY")
            .setDescription(
              `Welcome back, **${interaction.user.username}**.`
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
                name: "💨 Joints",
                value: `${player.joints}`,
                inline: true
              },
              {
                name: "🛒 Carts",
                value: `${player.carts}`,
                inline: true
              },
              {
                name: "🧪 Wax",
                value: `${player.wax}`,
                inline: true
              }
            )
            .setFooter({
              text: "Stoner Valley • Fictional economy"
            });

        return interaction.reply({
          embeds: [embed]
        });
      }

      /* =====================
         INFO
      ===================== */

      if (command === "info") {
        return interaction.reply({
          content: infoText()
        });
      }

      /* =====================
         BALANCE
      ===================== */

      if (command === "balance") {
        return interaction.reply(
          `💰 **${interaction.user.username}** has **${money(player.cash)}**.`
        );
      }

      /* =====================
         PROFILE
      ===================== */

      if (command === "profile") {

        return interaction.reply(
          [
            `🌿 **${interaction.user.username}'s Valley Profile**`,
            "",
            `💰 Cash: ${money(player.cash)}`,
            `🌿 Weed: ${player.weed}`,
            `⭐ Level: ${player.level}`,
            `✨ XP: ${player.xp}`,
            `🌱 Seeds: ${player.seeds}`,
            `🏠 House: ${player.house ? "Owned" : "None"}`,
            `🏢 Business Level: ${player.businessLevel}`,
            `💼 Job: ${player.job ? jobs[player.job]?.name : "None"}`,
            `🏆 Achievements: ${player.achievements.length}`
          ].join("\n")
        );
      }

      /* =====================
         INVENTORY
      ===================== */

      if (command === "inventory") {

        return interaction.reply(
          [
            "🎒 **VALLEY INVENTORY**",
            "",
            `🌿 Weed: ${player.weed}/${player.storage}`,
            `🌱 Seeds: ${player.seeds}`,
            `🧪 Fertilizer: ${player.fertilizer}`,
            `✨ Premium Seeds: ${player.premiumSeeds}`,
            `🍀 Lucky Charms: ${player.luckyCharm}`,
            "",
            `📜 RAW Cones: ${player.papers.raw_cone}`,
            `📄 King Size: ${player.papers.king_size}`,
            `🟫 Blunt Wraps: ${player.papers.blunt_wrap}`,
            "",
            `💨 Joints: ${player.joints}`,
            `🛒 Carts: ${player.carts}`,
            `🧪 Wax: ${player.wax}`
          ].join("\n")
        );
      }

      /* =====================
         PLANT
      ===================== */

      if (command === "plant") {

        if (player.seeds <= 0) {
          return interaction.reply(
            "🌱 You're out of seeds. Visit `/shop`."
          );
        }

        player.seeds--;
        player.planted++;

        const leveled =
          addXP(player, 15);

        saveDatabase();

        return interaction.reply(
          `🌱 You planted a fictional Valley seed. You now have **${player.seeds}** seeds left.` +
          (leveled
            ? `\n🎉 **LEVEL UP!** You reached level **${player.level}**!`
            : "")
        );
      }

      /* =====================
         HARVEST
      ===================== */

      if (command === "harvest") {

        if (player.planted <= 0) {
          return interaction.reply(
            "🌱 You don't have anything planted."
          );
        }

        player.planted--;

        let amount =
          Math.floor(Math.random() * 11) + 10;

        if (player.fertilizer > 0) {
          player.fertilizer--;
          amount += 10;
        }

        if (
          player.premiumSeeds > 0 &&
          Math.random() < 0.5
        ) {
          player.premiumSeeds--;
          amount += 15;
        }

        if (
          player.luckyCharm > 0 &&
          Math.random() < 0.25
        ) {
          player.luckyCharm--;
          amount *= 2;
        }

        const space =
          Math.max(
            0,
            player.storage - player.weed
          );

        const harvested =
          Math.min(amount, space);

        player.weed += harvested;

        const leveled =
          addXP(player, 25);

        if (
          harvested >= 35 &&
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
          `🌿 You harvested **${harvested}** fictional weed.` +
          `\n📦 Storage: **${player.weed}/${player.storage}**` +
          (leveled
            ? `\n🎉 **LEVEL UP!** Level **${player.level}**!`
            : "")
        );
      }

      /* =====================
         SHOP
      ===================== */

      if (command === "shop") {

        return interaction.reply(
          [
            "🛒 **STONER VALLEY SHOP**",
            "",
            "🌱 Seeds — $50",
            "🧪 Fertilizer — $150",
            "✨ Premium Seeds — $300",
            "🍀 Lucky Charm — $500",
            "📜 RAW Cone — $75",
            "📄 King Size Papers — $100",
            "🟫 Blunt Wrap — $125",
            "🛒 Fictional Weed Cart — $750",
            "🧪 Fictional Wax — $900",
            "",
            "Use `/buy` to purchase."
          ].join("\n")
        );
      }

      /* =====================
         BUY
      ===================== */

      if (command === "buy") {

        const item =
          interaction.options.getString(
            "item"
          );

        const amount =
          interaction.options.getInteger(
            "amount"
          );

        const prices = {
          seeds: 50,
          fertilizer: 150,
          premium: 300,
          charm: 500,
          raw_cone: 75,
          king_size: 100,
          blunt_wrap: 125,
          cart: 750,
          wax: 900
        };

        const price =
          prices[item];

        const total =
          price * amount;

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

        if (
          item === "raw_cone" ||
          item === "king_size" ||
          item === "blunt_wrap"
        ) {
          player.papers[item] += amount;
        }

        if (item === "cart") {
          player.carts += amount;
        }

        if (item === "wax") {
          player.wax += amount;
        }

        saveDatabase();

        return interaction.reply(
          `🛒 Bought **${amount}x ${item}** for **${money(total)}**.`
        );
      }

      /* =====================
         SELL
      ===================== */

      if (command === "sell") {

        const amount =
          interaction.options.getInteger(
            "amount"
          );

        if (player.weed < amount) {
          return interaction.reply(
            "❌ You don't have enough fictional weed."
          );
        }

        const total =
          amount *
          database.market.weed;

        player.weed -= amount;
        player.cash += total;

        addXP(player, 10);

        saveDatabase();

        return interaction.reply(
          `💰 Sold **${amount}** fictional weed for **${money(total)}**.`
        );
      }

      /* =====================
         MARKET
      ===================== */

      if (command === "market") {

        if (
          Date.now() -
            database.market.lastUpdate >
          10 * 60 * 1000
        ) {
          randomMarket();
          saveDatabase();
        }

        return interaction.reply(
          `📈 **Valley Market**\n\n🌿 Fictional Weed Price: **${money(database.market.weed)} each**`
        );
      }

      /* =====================
         DAILY
      ===================== */

      if (command === "daily") {

        const cooldown =
          24 * 60 * 60 * 1000;

        const remaining =
          cooldownRemaining(
            player.lastDaily,
            cooldown
          );

        if (remaining > 0) {
          return interaction.reply(
            `⏰ Come back in **${formatTime(remaining)}**.`
          );
        }

        player.dailyStreak++;

        const reward =
          275 +
          Math.min(
            player.dailyStreak * 25,
            500
          );

        player.cash += reward;
        player.seeds += 2;
        player.lastDaily = Date.now();

        const leveled =
          addXP(player, 30);

        saveDatabase();

        return interaction.reply(
          [
            "🎁 **DAILY REWARD!**",
            "",
            `💰 +${money(reward)}`,
            "🌱 +2 Seeds",
            `🔥 Streak: ${player.dailyStreak}`,
            leveled
              ? `🎉 LEVEL UP! You're now level ${player.level}!`
              : ""
          ]
            .filter(Boolean)
            .join("\n")
        );
      }

      /* =====================
         WORK
      ===================== */

      if (command === "work") {

        const cooldown =
          30 * 60 * 1000;

        const remaining =
          cooldownRemaining(
            player.lastWork,
            cooldown
          );

        if (remaining > 0) {
          return interaction.reply(
            `⏰ You're tired. Work again in **${formatTime(remaining)}**.`
          );
        }

        const reward =
          Math.floor(
            Math.random() * 201
          ) + 100;

        player.cash += reward;
        player.lastWork = Date.now();

        const leveled =
          addXP(player, 20);

        saveDatabase();

        return interaction.reply(
          `💼 You worked a Valley side job and earned **${money(reward)}**.` +
          (leveled
            ? `\n🎉 **LEVEL UP!** Level ${player.level}!`
            : "")
        );
      }

      /* =====================
         RISK
      ===================== */

      if (command === "risk") {

        if (player.cash < 50) {
          return interaction.reply(
            "❌ You need at least $50 to play."
          );
        }

        const bet =
          Math.min(
            player.cash,
            Math.max(
              50,
              Math.floor(
                Math.random() *
                  Math.min(
                    500,
                    player.cash
                  )
              ) + 1
            )
          );

        const win =
          Math.random() < 0.45;

        if (win) {
          player.cash += bet * 2;

          return interaction.reply(
            `🎰 **YOU WON!**\n💰 Profit: **${money(bet * 2)}**`
          );
        }

        player.cash -= bet;

        saveDatabase();

        return interaction.reply(
          `💀 **YOU LOST!**\n💸 Lost: **${money(bet)}**`
        );
      }

      /* =====================
         MISSIONS
      ===================== */

      if (command === "missions") {

        return interaction.reply(
          [
            "🎯 **VALLEY MISSIONS**",
            "",
            "🌱 Plant seeds",
            "🌿 Harvest crops",
            "💼 Work jobs",
            "💨 Roll joints",
            "🏠 Buy property",
            "💰 Build your cash",
            "🏆 Unlock achievements",
            "⚔️ Attempt fictional raids",
            "",
            "More missions can be added later."
          ].join("\n")
        );
      }

      /* =====================
         ACHIEVEMENTS
      ===================== */

      if (command === "achievements") {

        const list =
          player.achievements.length
            ? player.achievements
                .map(
                  achievement =>
                    `🏆 ${achievement}`
                )
                .join("\n")
            : "No achievements yet.";

        return interaction.reply(
          `🏆 **YOUR ACHIEVEMENTS**\n\n${list}`
        );
      }

      /* =====================
         LEADERBOARD
      ===================== */

      if (command === "leaderboard") {

        const leaders =
          Object.values(database.users)
            .sort(
              (a, b) =>
                b.cash - a.cash
            )
            .slice(0, 10);

        const text =
          leaders.length
            ? leaders
                .map(
                  (u, i) =>
                    `**${i + 1}.** ${u.name} — ${money(u.cash)}`
                )
                .join("\n")
            : "Nobody is on the leaderboard yet.";

        return interaction.reply(
          `🏆 **VALLEY LEADERBOARD**\n\n${text}`
        );
      }

      /* =====================
         JOINT
      ===================== */

      if (command === "joint") {

        const paper =
          interaction.options.getString(
            "paper"
          );

        if (player.papers[paper] <= 0) {
          return interaction.reply(
            "❌ You don't have that type of paper."
          );
        }

        if (player.weed < 5) {
          return interaction.reply(
            "❌ You need 5 fictional weed."
          );
        }

        player.papers[paper]--;
        player.weed -= 5;
        player.joints++;
        player.jointsRolled++;

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
          `💨 You rolled a fictional joint using **${paper}**.\nYou now have **${player.joints}** joints.`
        );
      }

      /* =====================
         USE
      ===================== */

      if (command === "use") {

        const item =
          interaction.options.getString(
            "item"
          );

        if (
          item === "joint" &&
          player.joints <= 0
        ) {
          return interaction.reply(
            "❌ You don't have a joint."
          );
        }

        if (
          item === "cart" &&
          player.carts <= 0
        ) {
          return interaction.reply(
            "❌ You don't have a cart."
          );
        }

        if (
          item === "wax" &&
          player.wax <= 0
        ) {
          return interaction.reply(
            "❌ You don't have wax."
          );
        }

        if (item === "joint") {
          player.joints--;
          player.jointUses++;
        }

        if (item === "cart") {
          player.carts--;
          player.cartUses++;
        }

        if (item === "wax") {
          player.wax--;
          player.waxUses++;
        }

        addXP(player, 10);
        player.smokeSessions++;

        saveDatabase();

        return interaction.reply(
          `🔥 You used a fictional **${item}** and gained some Valley XP.`
        );
      }

      /* =====================
         CELEBRITY
      ===================== */

      if (command === "celebrity") {

        const person =
          interaction.options.getString(
            "person"
          );

        const celebrity =
          celebrities[person];

        addXP(player, 10);

        saveDatabase();

        return interaction.reply(
          `${celebrity.emoji} **${celebrity.name}**\n\n${celebrity.message}\n\n*This is fictional roleplay and is not affiliated with or endorsed by the person mentioned.*`
        );
      }

      /* =====================
         PROPERTY
      ===================== */

      if (command === "property") {

        const action =
          interaction.options.getString(
            "action"
          );

        const amount =
          interaction.options.getInteger(
            "amount"
          );

        if (action === "view") {

          return interaction.reply(
            [
              "🏠 **VALLEY PROPERTY**",
              "",
              `🏠 House: ${player.house ? "Owned" : "Not owned"}`,
              `⭐ House Level: ${player.houseLevel}`,
              `🔐 Vault: ${player.vault ? "Owned" : "Not owned"}`,
              `⭐ Vault Level: ${player.vaultLevel}`,
              `🌿 Vault Weed: ${player.vaultWeed}`,
              `🛡️ Security: Level ${player.security}`
            ].join("\n")
          );
        }

        if (action === "buy") {

          if (player.house) {
            return interaction.reply(
              "🏠 You already own a house."
            );
          }

          if (player.cash < 5000) {
            return interaction.reply(
              "❌ You need $5,000."
            );
          }

          player.cash -= 5000;
          player.house = true;
          player.houseLevel = 1;
          player.storage += 50;

          saveDatabase();

          return interaction.reply(
            "🏠 **House purchased!**\nYour storage increased by 50."
          );
        }

        if (action === "upgrade") {

          if (!player.house) {
            return interaction.reply(
              "❌ Buy a house first."
            );
          }

          const cost =
            5000 * player.houseLevel;

          if (player.cash < cost) {
            return interaction.reply(
              `❌ You need ${money(cost)}.`
            );
          }

          player.cash -= cost;
          player.houseLevel++;
          player.storage += 50;

          saveDatabase();

          return interaction.reply(
            `🏠 House upgraded to level **${player.houseLevel}**.\n📦 Storage increased by 50.`
          );
        }

        if (action === "vault") {

          if (!player.house) {
            return interaction.reply(
              "❌ Buy a house first."
            );
          }

          if (!player.vault) {

            if (player.cash < 7500) {
              return interaction.reply(
                "❌ You need $7,500."
              );
            }

            player.cash -= 7500;
            player.vault = true;
            player.vaultLevel = 1;

            saveDatabase();

            return interaction.reply(
              "🔐 **Vault purchased!** Capacity: 100 fictional weed."
            );
          }

          const capacity =
            player.vaultLevel * 100;

          return interaction.reply(
            `🔐 Vault Level: **${player.vaultLevel}**\n🌿 Stored: **${player.vaultWeed}/${capacity}**`
          );
        }

        if (action === "deposit") {

          if (!player.vault) {
            return interaction.reply(
              "❌ You need a vault first."
            );
          }

          if (!amount) {
            return interaction.reply(
              "❌ Enter an amount."
            );
          }

          const capacity =
            player.vaultLevel * 100;

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
              `❌ Your vault can only hold ${capacity}.`
            );
          }

          player.weed -= amount;
          player.vaultWeed += amount;

          saveDatabase();

          return interaction.reply(
            `🔐 Deposited **${amount}** fictional weed into your vault.`
          );
        }

        if (action === "withdraw") {

          if (!player.vault) {
            return interaction.reply(
              "❌ You need a vault first."
            );
          }

          if (!amount) {
            return interaction.reply(
              "❌ Enter an amount."
            );
          }

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
              "❌ You don't have enough storage space."
            );
          }

          player.vaultWeed -= amount;
          player.weed += amount;

          saveDatabase();

          return interaction.reply(
            `🔐 Withdrew **${amount}** fictional weed.`
          );
        }
      }

      /* =====================
         BUSINESS
      ===================== */

      if (command === "business") {

        const action =
          interaction.options.getString(
            "action"
          );

        if (action === "view") {

          return interaction.reply(
            [
              "🏢 **VALLEY BUSINESS**",
              "",
              `⭐ Business Level: ${player.businessLevel}`,
              `💰 Passive rate: ${money(player.businessLevel * 100)} per collection`,
              "",
              "Use `/business upgrade` to level up."
            ].join("\n")
          );
        }

        if (action === "upgrade") {

          const cost =
            1000 *
            (player.businessLevel + 1);

          if (player.cash < cost) {
            return interaction.reply(
              `❌ You need ${money(cost)}.`
            );
          }

          player.cash -= cost;
          player.businessLevel++;

          saveDatabase();

          return interaction.reply(
            `🏢 Business upgraded to level **${player.businessLevel}**.`
          );
        }
      }

      /* =====================
         JOB
      ===================== */

      if (command === "job") {

        const action =
          interaction.options.getString(
            "action"
          );

        const jobChoice =
          interaction.options.getString(
            "job"
          );

        if (action === "list") {

          return interaction.reply(
            [
              "💼 **VALLEY JOBS**",
              "",
              "🌿 Dispensary Worker — $250–$600",
              "🛡️ Valley Security — $300–$700",
              "🚚 Valley Delivery — $200–$550",
              "🔥 Budtender — $350–$800",
              "",
              "Use `/job apply` with a job selected."
            ].join("\n")
          );
        }

        if (action === "apply") {

          if (!jobChoice) {
            return interaction.reply(
              "❌ Choose a job."
            );
          }

          player.job = jobChoice;

          if (
            !player.applications.includes(
              jobChoice
            )
          ) {
            player.applications.push(
              jobChoice
            );
          }

          saveDatabase();

          return interaction.reply(
            `💼 You are now working as a **${jobs[jobChoice].name}**.`
          );
        }

        if (action === "work") {

          if (!player.job) {
            return interaction.reply(
              "❌ You don't have a job. Apply with `/job apply`."
            );
          }

          const remaining =
            cooldownRemaining(
              player.lastJob,
              30 * 60 * 1000
            );

          if (remaining > 0) {
            return interaction.reply(
              `⏰ Work again in **${formatTime(remaining)}**.`
            );
          }

          const selectedJob =
            jobs[player.job];

          const reward =
            Math.floor(
              Math.random() *
                (selectedJob.max -
                  selectedJob.min +
                  1)
            ) +
            selectedJob.min +
            player.jobLevel * 50;

          player.cash += reward;
          player.lastJob = Date.now();
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
            `💼 You worked as a **${selectedJob.name}** and earned **${money(reward)}**.` +
            (leveled
              ? `\n🎉 **LEVEL UP!** Level ${player.level}!`
              : "")
          );
        }

        if (action === "quit") {

          if (!player.job) {
            return interaction.reply(
              "❌ You don't currently have a job."
            );
          }

          player.job = null;

          saveDatabase();

          return interaction.reply(
            "💼 You quit your Valley job."
          );
        }
      }

      /* =====================
         RAID
      ===================== */

      if (command === "raid") {

        const target =
          interaction.options.getUser(
            "user"
          );

        if (
          target.id ===
          interaction.user.id
        ) {
          return interaction.reply(
            "❌ You can't raid yourself."
          );
        }

        if (target.bot) {
          return interaction.reply(
            "❌ You can't raid a bot."
          );
        }

        if (player.level < 5) {
          return interaction.reply(
            "❌ You need to be level 5 to raid."
          );
        }

        const victim =
          getUserById(target.id);

        if (!victim || !victim.vault) {
          return interaction.reply(
            "❌ That member doesn't have a vault."
          );
        }

        const remaining =
          cooldownRemaining(
            player.lastRaid,
            60 * 60 * 1000
          );

        if (remaining > 0) {
          return interaction.reply(
            `⏰ You can raid again in **${formatTime(remaining)}**.`
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

        if (
          Math.random() <
          securityChance
        ) {

          const fine =
            Math.min(
              player.cash,
              Math.floor(
                Math.random() *
                  401
              ) + 100
            );

          player.cash -= fine;

          saveDatabase();

          await securityAlert(
            `${interaction.user.username} was caught attempting a fictional raid on ${target.username}.`
          );

          return interaction.reply(
            `🚨 **CAUGHT!**\n💸 Fine: **${money(fine)}**`
          );
        }

        const stolen =
          Math.floor(
            victim.vaultWeed *
              (Math.random() * 0.25 + 0.10)
          );

        const space =
          Math.max(
            0,
            player.storage -
              player.weed
          );

        const actual =
          Math.min(
            stolen,
            victim.vaultWeed,
            space
          );

        victim.vaultWeed -= actual;
        player.weed += actual;

        player.successfulRaids++;

        addXP(player, 50);

        saveDatabase();

        return interaction.reply(
          `⚔️ **RAID SUCCESSFUL!**\n\n🌿 You stole **${actual}** fictional weed from ${target}.`
        );
      }

      /* =====================
         DICE
      ===================== */

      if (command === "dice") {

        const roll =
          Math.floor(
            Math.random() * 6
          ) + 1;

        addXP(player, 5);
        saveDatabase();

        return interaction.reply(
          `🎲 You rolled a **${roll}**.`
        );
      }

      /* =====================
         COINFLIP
      ===================== */

      if (command === "coinflip") {

        const result =
          Math.random() < 0.5
            ? "HEADS"
            : "TAILS";

        addXP(player, 5);
        saveDatabase();

        return interaction.reply(
          `🪙 The coin landed on **${result}**.`
        );
      }

      /* =====================
         EIGHTBALL
      ===================== */

      if (command === "eightball") {

        const answers = [
          "Absolutely.",
          "Probably.",
          "Signs point to yes.",
          "Maybe.",
          "Ask again later.",
          "Not looking good.",
          "Probably not.",
          "The Valley says no."
        ];

        const answer =
          answers[
            Math.floor(
              Math.random() *
                answers.length
            )
          ];

        addXP(player, 5);
        saveDatabase();

        return interaction.reply(
          `🎱 **Valley 8-Ball:** ${answer}`
        );
      }

      /* =====================
         HIGH
      ===================== */

      if (command === "high") {

        const levels = [
          "😌 Chillin'",
          "😮‍💨 Feeling good",
          "😂 Everything is hilarious",
          "🌌 Lost in the Valley",
          "🚀 Absolutely floating"
        ];

        const result =
          levels[
            Math.floor(
              Math.random() *
                levels.length
            )
          ];

        addXP(player, 10);
        saveDatabase();

        return interaction.reply(
          `🌿 **Your fictional highness level:** ${result}`
        );
      }

      /* =====================
         SMOKE
      ===================== */

      if (command === "smoke") {

        player.smokeSessions++;

        addXP(player, 15);

        saveDatabase();

        return interaction.reply(
          "😮‍💨 **Smoke session started.**\n\nKick back, relax, and enjoy the Valley."
        );
      }

      /* =====================
         STAFF
      ===================== */

      if (command === "staff") {

        const action =
          interaction.options.getSubcommand();

        if (action === "login") {

          const password =
            interaction.options.getString(
              "password"
            );

          if (
            password !==
            STAFF_PASSWORD
          ) {

            await securityAlert(
              `${interaction.user.username} failed a staff login attempt.`
            );

            return interaction.reply({
              content:
                "❌ Incorrect staff password.",
              ephemeral: true
            });
          }

          staffSessions.set(
            interaction.user.id,
            {
              expires:
                Date.now() +
                2 * 60 * 60 * 1000
            }
          );

          return interaction.reply({
            content:
              "🛡️ **Staff login successful.** Session active for 2 hours.",
            ephemeral: true
          });
        }

        if (!isStaff(interaction.user.id)) {
          return interaction.reply({
            content:
              "❌ You are not logged into staff controls.",
            ephemeral: true
          });
        }

        if (action === "logout") {

          staffSessions.delete(
            interaction.user.id
          );

          return interaction.reply({
            content:
              "🛡️ Staff session ended.",
            ephemeral: true
          });
        }

        if (action === "panel") {

          return interaction.reply({
            content: [
              "🛡️ **STAFF PANEL**",
              "",
              "`/staff stats` — Bot statistics",
              "`/staff addcash` — Give fictional cash",
              "`/staff addweed` — Give fictional weed",
              "`/staff logout` — End staff session"
            ].join("\n"),
            ephemeral: true
          });
        }

        if (action === "stats") {

          const users =
            Object.keys(
              database.users
            ).length;

          const totalCash =
            Object.values(
              database.users
            ).reduce(
              (sum, u) =>
                sum + (u.cash || 0),
              0
            );

          return interaction.reply({
            content: [
              "📊 **STONER VALLEY STATS**",
              "",
              `👥 Users: ${users}`,
              `💰 Total Cash: ${money(totalCash)}`,
              `📦 Database: Active`,
              `🌿 Market Price: ${money(database.market.weed)}`
            ].join("\n"),
            ephemeral: true
          });
        }

        if (action === "addcash") {

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
              `💰 Added **${money(amount)}** to ${target.username}.`,
            ephemeral: true
          });
        }

        if (action === "addweed") {

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

          targetPlayer.weed += amount;

          saveDatabase();

          return interaction.reply({
            content:
              `🌿 Added **${amount}** fictional weed to ${target.username}.`,
            ephemeral: true
          });
        }
      }

    } catch (error) {

      console.error(
        "❌ Interaction error:",
        error
      );

      if (!interaction.replied) {
        await interaction.reply({
          content:
            "❌ Something went wrong while running that command.",
          ephemeral: true
        });
      }

      await securityAlert(
        `Interaction error: ${error.message}`
      );
    }
  }
);

/* =========================
   AUTO SAVE / BACKUPS
========================= */

setInterval(
  saveDatabase,
  30 * 1000
);

setInterval(
  backupDatabase,
  5 * 60 * 1000
);

setInterval(
  () => {
    randomMarket();
    saveDatabase();
  },
  10 * 60 * 1000
);

/* =========================
   ERROR HANDLING
========================= */

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "❌ Unhandled rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "❌ Uncaught exception:",
      error
    );
  }
);

/* =========================
   LOGIN
========================= */

client.login(TOKEN);