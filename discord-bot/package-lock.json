"use strict";

const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

// ======================================================
// STONER VALLEY BOT
// ======================================================

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = "1548055362740035686";

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing.");
  process.exit(1);
}

const DATA_FILE = "./stoner-valley-data.json";
const BACKUP_FILE = "./stoner-valley-backup.json";

// ======================================================
// DATABASE
// ======================================================

let db = {
  users: {},
  businesses: {},
  nextBusinessId: 1
};

function loadDatabase() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch (error) {
    console.error("Database load error:", error);
  }

  if (!db.users) db.users = {};
  if (!db.businesses) db.businesses = {};
  if (!db.nextBusinessId) db.nextBusinessId = 1;
}

function saveDatabase() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error("Database save error:", error);
  }
}

function backupDatabase() {
  try {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error("Backup error:", error);
  }
}

loadDatabase();

// ======================================================
// USER DATA
// ======================================================

function createUser(id, username) {
  if (!db.users[id]) {
    db.users[id] = {
      id,
      username,

      cash: 250,
      bank: 0,

      xp: 0,
      level: 1,

      phone: null,

      inventory: {
        flower: 0,
        carts: 0,
        edibles: {},
        bongs: {},
        lighters: {},
        drinks: {},
        batteries: {}
      },

      house: {
        owned: false,
        storage: 100
      },

      job: null,
      businesses: [],

      messages: [],

      dailyClaimed: 0,
      lastWork: 0
    };
  }

  // Repair older databases
  const u = db.users[id];

  if (!u.inventory) u.inventory = {};
  if (u.inventory.flower == null) u.inventory.flower = 0;
  if (u.inventory.carts == null) u.inventory.carts = 0;
  if (!u.inventory.edibles) u.inventory.edibles = {};
  if (!u.inventory.bongs) u.inventory.bongs = {};
  if (!u.inventory.lighters) u.inventory.lighters = {};
  if (!u.inventory.drinks) u.inventory.drinks = {};
  if (!u.inventory.batteries) u.inventory.batteries = {};

  if (!u.businesses) u.businesses = [];
  if (!u.messages) u.messages = [];

  return u;
}

function addXP(user, amount) {
  user.xp += amount;

  const needed = user.level * 100;

  if (user.xp >= needed) {
    user.xp -= needed;
    user.level++;
    return true;
  }

  return false;
}

function money(amount) {
  return `$${amount.toLocaleString()}`;
}

// ======================================================
// REALISTIC IN-SERVER PRODUCTS
// ======================================================

const PRODUCTS = {

  // FLOWER
  flower_1g: {
    name: "1g Flower",
    category: "flower",
    price: 15,
    amount: 1
  },

  flower_3_5g: {
    name: "3.5g Flower",
    category: "flower",
    price: 40,
    amount: 3.5
  },

  flower_7g: {
    name: "7g Flower",
    category: "flower",
    price: 70,
    amount: 7
  },

  flower_14g: {
    name: "14g Flower",
    category: "flower",
    price: 120,
    amount: 14
  },

  flower_28g: {
    name: "28g Flower",
    category: "flower",
    price: 200,
    amount: 28
  },

  // CARTS
  cart_1g: {
    name: "1g 510 Cartridge",
    category: "cart",
    price: 35,
    amount: 1
  },

  cart_half: {
    name: "0.5g 510 Cartridge",
    category: "cart",
    price: 25,
    amount: 0.5
  },

  // EDIBLES
  gummy_10: {
    name: "Fruit Gummies — 10 Pack",
    category: "edible",
    price: 25,
    amount: 10
  },

  chocolate: {
    name: "Chocolate Bar",
    category: "edible",
    price: 30,
    amount: 1
  },

  fruit_chews: {
    name: "Fruit Chews — 10 Pack",
    category: "edible",
    price: 28,
    amount: 10
  },

  mints: {
    name: "Cannabis Mints — 20 Pack",
    category: "edible",
    price: 24,
    amount: 20
  },

  // BONGS
  basic_bong: {
    name: "Basic Glass Bong",
    category: "bong",
    price: 60
  },

  beaker_bong: {
    name: "Glass Beaker Bong",
    category: "bong",
    price: 95
  },

  straight_bong: {
    name: "Straight Tube Glass Bong",
    category: "bong",
    price: 120
  },

  // LIGHTERS
  bic: {
    name: "BIC Classic Lighter",
    category: "lighter",
    price: 3
  },

  clipper: {
    name: "Clipper Lighter",
    category: "lighter",
    price: 5
  },

  torch: {
    name: "Refillable Torch Lighter",
    category: "lighter",
    price: 15
  },

  // BATTERIES
  battery_basic: {
    name: "510 Battery",
    category: "battery",
    price: 20
  },

  battery_variable: {
    name: "Variable Voltage 510 Battery",
    category: "battery",
    price: 35
  },

  // DRINKS
  energy: {
    name: "Energy Drink",
    category: "drink",
    price: 4
  },

  soda: {
    name: "Soda",
    category: "drink",
    price: 3
  },

  water: {
    name: "Bottled Water",
    category: "drink",
    price: 2
  }
};

// ======================================================
// PHONES
// ======================================================

const PHONES = {

  iphone_17: {
    name: "iPhone 17",
    price: 799
  },

  iphone_17_pro: {
    name: "iPhone 17 Pro",
    price: 1099
  },

  iphone_17_pro_max: {
    name: "iPhone 17 Pro Max",
    price: 1199
  },

  galaxy_s26: {
    name: "Samsung Galaxy S26",
    price: 799
  },

  galaxy_s26_ultra: {
    name: "Samsung Galaxy S26 Ultra",
    price: 1299
  },

  pixel_10: {
    name: "Google Pixel 10",
    price: 699
  },

  pixel_10_pro: {
    name: "Google Pixel 10 Pro",
    price: 999
  }
};

// ======================================================
// JOBS
// ======================================================

const JOBS = {

  budtender: {
    name: "Budtender",
    pay: 110
  },

  cashier: {
    name: "Cashier",
    pay: 90
  },

  security: {
    name: "Security",
    pay: 125
  },

  delivery: {
    name: "Delivery Driver",
    pay: 120
  },

  warehouse: {
    name: "Warehouse Worker",
    pay: 105
  },

  manager: {
    name: "Store Manager",
    pay: 160
  },

  mechanic: {
    name: "Mechanic",
    pay: 145
  },

  bartender: {
    name: "Bartender",
    pay: 130
  }
};

// ======================================================
// BUSINESSES
// ======================================================

const BUSINESS_TYPES = {
  dispensary: {
    name: "Dispensary",
    price: 15000,
    income: 850
  },

  smoke_shop: {
    name: "Smoke Shop",
    price: 10000,
    income: 650
  },

  restaurant: {
    name: "Restaurant",
    price: 20000,
    income: 1000
  },

  bar: {
    name: "Bar",
    price: 25000,
    income: 1200
  },

  auto_shop: {
    name: "Auto Shop",
    price: 30000,
    income: 1400
  },

  clothing_store: {
    name: "Clothing Store",
    price: 12000,
    income: 750
  }
};

// ======================================================
// CLIENT
// ======================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ======================================================
// COMMANDS
// ======================================================

const commands = [

  new SlashCommandBuilder()
    .setName("valley")
    .setDescription("View the Stoner Valley economy"),

  new SlashCommandBuilder()
    .setName("info")
    .setDescription("View all Stoner Valley commands"),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your Valley profile"),

  new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("View everything you own"),

  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("View your cash and bank"),

  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily Valley money"),

  new SlashCommandBuilder()
    .setName("jobs")
    .setDescription("View available jobs"),

  new SlashCommandBuilder()
    .setName("job")
    .setDescription("Manage your job")
    .addSubcommand(sub =>
      sub
        .setName("apply")
        .setDescription("Apply for a job")
        .addStringOption(opt =>
          opt
            .setName("job")
            .setDescription("Job you want")
            .setRequired(true)
            .addChoices(
              ...Object.entries(JOBS).map(([value, job]) => ({
                name: job.name,
                value
              }))
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

  new SlashCommandBuilder()
    .setName("bank")
    .setDescription("Manage your bank")
    .addSubcommand(sub =>
      sub
        .setName("deposit")
        .setDescription("Deposit money")
        .addIntegerOption(opt =>
          opt
            .setName("amount")
            .setDescription("Amount")
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("withdraw")
        .setDescription("Withdraw money")
        .addIntegerOption(opt =>
          opt
            .setName("amount")
            .setDescription("Amount")
            .setRequired(true)
            .setMinValue(1)
        )
    ),

  new SlashCommandBuilder()
    .setName("dispensary")
    .setDescription("Browse and buy Valley products")
    .addSubcommand(sub =>
      sub
        .setName("browse")
        .setDescription("View the dispensary menu")
    )
    .addSubcommand(sub =>
      sub
        .setName("buy")
        .setDescription("Buy a dispensary product")
        .addStringOption(opt =>
          opt
            .setName("item")
            .setDescription("Choose what you want")
            .setRequired(true)
            .addChoices(
              ...Object.entries(PRODUCTS).map(([value, item]) => ({
                name: `${item.name} — $${item.price}`,
                value
              }))
            )
        )
    ),

  new SlashCommandBuilder()
    .setName("cart")
    .setDescription("Use one of your cannabis cartridges"),

  new SlashCommandBuilder()
    .setName("smoke")
    .setDescription("Smoke flower using your smoking setup"),

  new SlashCommandBuilder()
    .setName("edible")
    .setDescription("Use one of your edibles")
    .addStringOption(opt =>
      opt
        .setName("type")
        .setDescription("Choose an edible")
        .setRequired(true)
        .addChoices(
          { name: "Fruit Gummies", value: "gummy_10" },
          { name: "Chocolate Bar", value: "chocolate" },
          { name: "Fruit Chews", value: "fruit_chews" },
          { name: "Cannabis Mints", value: "mints" }
        )
    ),

  new SlashCommandBuilder()
    .setName("bong")
    .setDescription("Use one of your bongs")
    .addStringOption(opt =>
      opt
        .setName("type")
        .setDescription("Choose your bong")
        .setRequired(true)
        .addChoices(
          { name: "Basic Glass Bong", value: "basic_bong" },
          { name: "Glass Beaker Bong", value: "beaker_bong" },
          { name: "Straight Tube Glass Bong", value: "straight_bong" }
        )
    ),

  new SlashCommandBuilder()
    .setName("lighter")
    .setDescription("Use one of your lighters")
    .addStringOption(opt =>
      opt
        .setName("type")
        .setDescription("Choose your lighter")
        .setRequired(true)
        .addChoices(
          { name: "BIC Classic", value: "bic" },
          { name: "Clipper", value: "clipper" },
          { name: "Refillable Torch", value: "torch" }
        )
    ),

  new SlashCommandBuilder()
    .setName("drink")
    .setDescription("Drink something you own")
    .addStringOption(opt =>
      opt
        .setName("type")
        .setDescription("Choose a drink")
        .setRequired(true)
        .addChoices(
          { name: "Energy Drink", value: "energy" },
          { name: "Soda", value: "soda" },
          { name: "Bottled Water", value: "water" }
        )
    ),

  new SlashCommandBuilder()
    .setName("phone")
    .setDescription("Manage your phone")
    .addSubcommand(sub =>
      sub
        .setName("buy")
        .setDescription("Buy a phone")
        .addStringOption(opt =>
          opt
            .setName("model")
            .setDescription("Choose a phone")
            .setRequired(true)
            .addChoices(
              ...Object.entries(PHONES).map(([value, phone]) => ({
                name: `${phone.name} — $${phone.price}`,
                value
              }))
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("view")
        .setDescription("View your phone")
    ),

  new SlashCommandBuilder()
    .setName("text")
    .setDescription("Send a text message")
    .addUserOption(opt =>
      opt
        .setName("user")
        .setDescription("Who you want to text")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName("message")
        .setDescription("Your message")
        .setRequired(true)
        .setMaxLength(500)
    ),

  new SlashCommandBuilder()
    .setName("texts")
    .setDescription("View your recent text messages"),

  new SlashCommandBuilder()
    .setName("house")
    .setDescription("Manage your house")
    .addSubcommand(sub =>
      sub
        .setName("view")
        .setDescription("View your house")
    )
    .addSubcommand(sub =>
      sub
        .setName("buy")
        .setDescription("Buy a house")
    )
    .addSubcommand(sub =>
      sub
        .setName("upgrade")
        .setDescription("Upgrade storage")
    ),

  new SlashCommandBuilder()
    .setName("business")
    .setDescription("Run your own business")
    .addSubcommand(sub =>
      sub
        .setName("create")
        .setDescription("Become a business owner")
        .addStringOption(opt =>
          opt
            .setName("type")
            .setDescription("Business type")
            .setRequired(true)
            .addChoices(
              ...Object.entries(BUSINESS_TYPES).map(([value, business]) => ({
                name: `${business.name} — ${money(business.price)}`,
                value
              }))
            )
        )
        .addStringOption(opt =>
          opt
            .setName("name")
            .setDescription("Name your business")
            .setRequired(true)
            .setMaxLength(40)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("view")
        .setDescription("View your businesses")
    )
    .addSubcommand(sub =>
      sub
        .setName("collect")
        .setDescription("Collect business earnings")
    ),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the Valley leaderboard"),

  new SlashCommandBuilder()
    .setName("dice")
    .setDescription("Roll the dice"),

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin"),

  new SlashCommandBuilder()
    .setName("eightball")
    .setDescription("Ask the Valley 8-ball a question")
    .addStringOption(opt =>
      opt
        .setName("question")
        .setDescription("Ask a question")
        .setRequired(true)
    )
];

// ======================================================
// REGISTER SLASH COMMANDS
// ======================================================

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(
      client.user.id,
      GUILD_ID
    ),
    {
      body: commands.map(command => command.toJSON())
    }
  );

  console.log("✅ Slash commands registered.");
}

// ======================================================
// READY
// ======================================================

client.once("ready", async () => {
  console.log(`🌿 Logged in as ${client.user.tag}`);

  try {
    await registerCommands();
  } catch (error) {
    console.error("❌ Command registration failed:", error);
  }

  console.log("🌿 Stoner Valley is online!");
});

// ======================================================
// INTERACTIONS
// ======================================================

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;

  const user = createUser(
    interaction.user.id,
    interaction.user.username
  );

  const command = interaction.commandName;

  // ====================================================
  // VALLEY
  // ====================================================

  if (command === "valley") {
    const embed = new EmbedBuilder()
      .setTitle("🌿 Stoner Valley")
      .setDescription(
        "Your personal in-server economy. Work, shop, own businesses, buy a phone and build your Valley life."
      )
      .addFields(
        { name: "💵 Cash", value: money(user.cash), inline: true },
        { name: "🏦 Bank", value: money(user.bank), inline: true },
        { name: "⭐ Level", value: `${user.level}`, inline: true }
      );

    return interaction.reply({ embeds: [embed] });
  }

  // ====================================================
  // INFO
  // ====================================================

  if (command === "info") {
    return interaction.reply({
      content:
`🌿 **STONER VALLEY COMMANDS**

💵 **Economy**
\`/balance\` — Cash and bank
\`/daily\` — Daily money
\`/leaderboard\` — Top Valley members
\`/dice\` — Roll the dice
\`/coinflip\` — Flip a coin

💼 **Work**
\`/jobs\` — View jobs
\`/job apply\` — Apply
\`/job work\` — Work
\`/job quit\` — Quit

🏪 **Shopping**
\`/dispensary browse\` — View products
\`/dispensary buy\` — Buy products
\`/inventory\` — View your items

📱 **Phone**
\`/phone buy\` — Buy a phone
\`/phone view\` — View phone
\`/text\` — Send a text
\`/texts\` — View messages

🏠 **Property**
\`/house buy\`
\`/house view\`
\`/house upgrade\`

🏢 **Businesses**
\`/business create\`
\`/business view\`
\`/business collect\`

🌿 **Use Your Items**
\`/smoke\`
\`/cart\`
\`/edible\`
\`/bong\`
\`/lighter\`
\`/drink\`

🎱 \`/eightball\` — Ask the 8-ball`
    });
  }

  // ====================================================
  // PROFILE
  // ====================================================

  if (command === "profile") {
    return interaction.reply({
      content:
`🌿 **${interaction.user.username}'s Profile**

⭐ Level: ${user.level}
✨ XP: ${user.xp}/${user.level * 100}
💵 Cash: ${money(user.cash)}
🏦 Bank: ${money(user.bank)}
💼 Job: ${user.job ? JOBS[user.job].name : "Unemployed"}
📱 Phone: ${user.phone ? PHONES[user.phone].name : "None"}
🏠 House: ${user.house.owned ? "Owned" : "None"}
🏢 Businesses: ${user.businesses.length}`
    });
  }

  // ====================================================
  // BALANCE
  // ====================================================

  if (command === "balance") {
    return interaction.reply({
      content:
`💵 **Balance**

Cash: ${money(user.cash)}
🏦 Bank: ${money(user.bank)}
💰 Total: ${money(user.cash + user.bank)}`
    });
  }

  // ====================================================
  // INVENTORY
  // ====================================================

  if (command === "inventory") {

    const edibles = Object.entries(user.inventory.edibles)
      .map(([id, amount]) => `${PRODUCTS[id]?.name || id}: ${amount}`)
      .join("\n") || "None";

    const bongs = Object.entries(user.inventory.bongs)
      .map(([id, amount]) => `${PRODUCTS[id]?.name || id}: ${amount}`)
      .join("\n") || "None";

    const lighters = Object.entries(user.inventory.lighters)
      .map(([id, amount]) => `${PRODUCTS[id]?.name || id}: ${amount}`)
      .join("\n") || "None";

    const drinks = Object.entries(user.inventory.drinks)
      .map(([id, amount]) => `${PRODUCTS[id]?.name || id}: ${amount}`)
      .join("\n") || "None";

    const batteries = Object.entries(user.inventory.batteries)
      .map(([id, amount]) => `${PRODUCTS[id]?.name || id}: ${amount}`)
      .join("\n") || "None";

    return interaction.reply({
      content:
`🎒 **${interaction.user.username}'s Inventory**

🌿 Flower: **${user.inventory.flower}g**
🛒 Cartridges: **${user.inventory.carts}**

🍬 **Edibles**
${edibles}

🔥 **Lighters**
${lighters}

💨 **Bongs**
${bongs}

🔋 **510 Batteries**
${batteries}

🥤 **Drinks**
${drinks}

📱 Phone: ${user.phone ? PHONES[user.phone].name : "None"}

🏠 House: ${user.house.owned ? "Owned" : "None"}
📦 Storage: ${user.house.storage}g`
    });
  }

  // ====================================================
  // DAILY
  // ====================================================

  if (command === "daily") {

    const now = Date.now();
    const day = 86400000;

    if (now - user.dailyClaimed < day) {
      const remaining = day - (now - user.dailyClaimed);
      const hours = Math.ceil(remaining / 3600000);

      return interaction.reply({
        content: `⏰ You already claimed your daily. Come back in about **${hours} hours**.`
      });
    }

    const amount = 250 + user.level * 25;

    user.cash += amount;
    user.dailyClaimed = now;

    const leveled = addXP(user, 25);

    saveDatabase();

    return interaction.reply({
      content:
`💵 **Daily claimed!**

You received **${money(amount)}**.
⭐ +25 XP${leveled ? `\n🎉 You reached **Level ${user.level}**!` : ""}`
    });
  }

  // ====================================================
  // JOBS
  // ====================================================

  if (command === "jobs") {

    const list = Object.values(JOBS)
      .map(job => `💼 **${job.name}** — ${money(job.pay)} per shift`)
      .join("\n");

    return interaction.reply({
      content: `💼 **Available Valley Jobs**\n\n${list}`
    });
  }

  // ====================================================
  // JOB
  // ====================================================

  if (command === "job") {

    const sub = interaction.options.getSubcommand();

    if (sub === "apply") {

      const job = interaction.options.getString("job");

      if (user.job) {
        return interaction.reply({
          content: `❌ You already work as **${JOBS[user.job].name}**. Quit first.`
        });
      }

      user.job = job;
      saveDatabase();

      return interaction.reply({
        content: `✅ You're now working as a **${JOBS[job].name}**.`
      });
    }

    if (sub === "work") {

      if (!user.job) {
        return interaction.reply({
          content: "❌ You don't have a job. Use `/jobs` first."
        });
      }

      const now = Date.now();

      if (now - user.lastWork < 3600000) {
        const remaining = 3600000 - (now - user.lastWork);
        const minutes = Math.ceil(remaining / 60000);

        return interaction.reply({
          content: `⏰ You're done for now. Come back in about **${minutes} minutes**.`
        });
      }

      const job = JOBS[user.job];

      user.cash += job.pay;
      user.lastWork = now;

      const leveled = addXP(user, 50);

      saveDatabase();

      return interaction.reply({
        content:
`💼 **Shift complete!**

Job: ${job.name}
💵 Pay: ${money(job.pay)}
⭐ XP: +50${leveled ? `\n🎉 Level ${user.level} reached!` : ""}`
      });
    }

    if (sub === "quit") {

      if (!user.job) {
        return interaction.reply({
          content: "❌ You don't currently have a job."
        });
      }

      const oldJob = JOBS[user.job].name;

      user.job = null;
      saveDatabase();

      return interaction.reply({
        content: `✅ You quit your job as **${oldJob}**.`
      });
    }
  }

  // ====================================================
  // BANK
  // ====================================================

  if (command === "bank") {

    const sub = interaction.options.getSubcommand();
    const amount = interaction.options.getInteger("amount");

    if (sub === "deposit") {

      if (user.cash < amount) {
        return interaction.reply({
          content: "❌ You don't have enough cash."
        });
      }

      user.cash -= amount;
      user.bank += amount;

      saveDatabase();

      return interaction.reply({
        content: `🏦 Deposited **${money(amount)}**.`
      });
    }

    if (sub === "withdraw") {

      if (user.bank < amount) {
        return interaction.reply({
          content: "❌ You don't have enough money in your bank."
        });
      }

      user.bank -= amount;
      user.cash += amount;

      saveDatabase();

      return interaction.reply({
        content: `🏦 Withdrew **${money(amount)}**.`
      });
    }
  }

  // ====================================================
  // DISPENSARY
  // ====================================================

  if (command === "dispensary") {

    const sub = interaction.options.getSubcommand();

    if (sub === "browse") {

      const flower = Object.values(PRODUCTS)
        .filter(x => x.category === "flower")
        .map(x => `🌿 ${x.name} — ${money(x.price)}`)
        .join("\n");

      const carts = Object.values(PRODUCTS)
        .filter(x => x.category === "cart")
        .map(x => `🛒 ${x.name} — ${money(x.price)}`)
        .join("\n");

      const edibles = Object.values(PRODUCTS)
        .filter(x => x.category === "edible")
        .map(x => `🍬 ${x.name} — ${money(x.price)}`)
        .join("\n");

      const bongs = Object.values(PRODUCTS)
        .filter(x => x.category === "bong")
        .map(x => `💨 ${x.name} — ${money(x.price)}`)
        .join("\n");

      const lighters = Object.values(PRODUCTS)
        .filter(x => x.category === "lighter")
        .map(x => `🔥 ${x.name} — ${money(x.price)}`)
        .join("\n");

      const batteries = Object.values(PRODUCTS)
        .filter(x => x.category === "battery")
        .map(x => `🔋 ${x.name} — ${money(x.price)}`)
        .join("\n");

      const drinks = Object.values(PRODUCTS)
        .filter(x => x.category === "drink")
        .map(x => `🥤 ${x.name} — ${money(x.price)}`)
        .join("\n");

      return interaction.reply({
        content:
`🏪 **STONER VALLEY DISPENSARY**

🌿 **FLOWER**
${flower}

🛒 **CARTRIDGES**
${carts}

🍬 **EDIBLES**
${edibles}

💨 **BONGS**
${bongs}

🔥 **LIGHTERS**
${lighters}

🔋 **510 BATTERIES**
${batteries}

🥤 **DRINKS**
${drinks}

Use **/dispensary buy** and select exactly what you want.`
      });
    }

    if (sub === "buy") {

      const itemId = interaction.options.getString("item");
      const item = PRODUCTS[itemId];

      if (!item) {
        return interaction.reply({
          content: "❌ That item doesn't exist."
        });
      }

      if (user.cash < item.price) {
        return interaction.reply({
          content:
`❌ You can't afford that.

Price: ${money(item.price)}
Your cash: ${money(user.cash)}`
        });
      }

      user.cash -= item.price;

      if (item.category === "flower") {
        user.inventory.flower += item.amount;
      }

      if (item.category === "cart") {
        user.inventory.carts += item.amount;
      }

      if (
        item.category === "edible" ||
        item.category === "bong" ||
        item.category === "lighter" ||
        item.category === "drink" ||
        item.category === "battery"
      ) {
        if (!user.inventory[item.category + "s"]) {
          // handled below
        }
      }

      if (item.category === "edible") {
        user.inventory.edibles[itemId] =
          (user.inventory.edibles[itemId] || 0) + 1;
      }

      if (item.category === "bong") {
        user.inventory.bongs[itemId] =
          (user.inventory.bongs[itemId] || 0) + 1;
      }

      if (item.category === "lighter") {
        user.inventory.lighters[itemId] =
          (user.inventory.lighters[itemId] || 0) + 1;
      }

      if (item.category === "drink") {
        user.inventory.drinks[itemId] =
          (user.inventory.drinks[itemId] || 0) + 1;
      }

      if (item.category === "battery") {
        user.inventory.batteries[itemId] =
          (user.inventory.batteries[itemId] || 0) + 1;
      }

      saveDatabase();

      return interaction.reply({
        content:
`✅ **Purchase complete!**

You bought: **${item.name}**
Price: **${money(item.price)}**
Cash remaining: **${money(user.cash)}**

📦 The item is now in your inventory.`
      });
    }
  }

  // ====================================================
  // SMOKE
  // ====================================================

  if (command === "smoke") {

    if (user.inventory.flower < 1) {
      return interaction.reply({
        content: "❌ You need at least **1g of flower** first."
      });
    }

    const lighterTotal = Object.values(user.inventory.lighters)
      .reduce((a, b) => a + b, 0);

    const bongTotal = Object.values(user.inventory.bongs)
      .reduce((a, b) => a + b, 0);

    if (lighterTotal < 1) {
      return interaction.reply({
        content: "❌ You need to buy a **lighter** first."
      });
    }

    if (bongTotal < 1) {
      return interaction.reply({
        content: "❌ You need to buy a **bong** first."
      });
    }

    user.inventory.flower -= 1;

    addXP(user, 10);

    saveDatabase();

    return interaction.reply({
      content:
`💨 **Session complete.**

You used **1g of flower** with your own bong and lighter.

🌿 Flower remaining: **${user.inventory.flower}g**
⭐ +10 XP`
    });
  }

  // ====================================================
  // CART
  // ====================================================

  if (command === "cart") {

    if (user.inventory.carts < 0.5) {
      return interaction.reply({
        content: "❌ You don't have a cartridge. Buy one from the dispensary."
      });
    }

    const batteries = Object.values(user.inventory.batteries)
      .reduce((a, b) => a + b, 0);

    if (batteries < 1) {
      return interaction.reply({
        content: "❌ You need a **510 battery** before you can use a cartridge."
      });
    }

    user.inventory.carts -= 0.5;

    addXP(user, 10);

    saveDatabase();

    return interaction.reply({
      content:
`🛒 **Cartridge used.**

You used **0.5g** from your cartridge inventory.

Remaining cartridges: **${user.inventory.carts}g**
⭐ +10 XP`
    });
  }

  // ====================================================
  // EDIBLE
  // ====================================================

  if (command === "edible") {

    const type = interaction.options.getString("type");
    const amount = user.inventory.edibles[type] || 0;

    if (amount < 1) {
      return interaction.reply({
        content: `❌ You don't own **${PRODUCTS[type].name}**.`
      });
    }

    user.inventory.edibles[type]--;

    addXP(user, 10);

    saveDatabase();

    return interaction.reply({
      content:
`🍬 **${PRODUCTS[type].name} used.**

You had to purchase it before using it.

Remaining: **${user.inventory.edibles[type]}**
⭐ +10 XP`
    });
  }

  // ====================================================
  // BONG
  // ====================================================

  if (command === "bong") {

    const type = interaction.options.getString("type");
    const amount = user.inventory.bongs[type] || 0;

    if (amount < 1) {
      return interaction.reply({
        content: `❌ You don't own **${PRODUCTS[type].name}**.`
      });
    }

    const lighterTotal = Object.values(user.inventory.lighters)
      .reduce((a, b) => a + b, 0);

    if (lighterTotal < 1) {
      return interaction.reply({
        content: "❌ You also need a **lighter**."
      });
    }

    return interaction.reply({
      content:
`💨 **${PRODUCTS[type].name}**

You pulled out your own bong.

🔥 Make sure you have flower and a lighter with \`/smoke\`.`
    });
  }

  // ====================================================
  // LIGHTER
  // ====================================================

  if (command === "lighter") {

    const type = interaction.options.getString("type");
    const amount = user.inventory.lighters[type] || 0;

    if (amount < 1) {
      return interaction.reply({
        content: `❌ You don't own a **${PRODUCTS[type].name}**. Buy one first.`
      });
    }

    return interaction.reply({
      content: `🔥 You pulled out your **${PRODUCTS[type].name}**.`
    });
  }

  // ====================================================
  // DRINK
  // ====================================================

  if (command === "drink") {

    const type = interaction.options.getString("type");
    const amount = user.inventory.drinks[type] || 0;

    if (amount < 1) {
      return interaction.reply({
        content: `❌ You don't own **${PRODUCTS[type].name}**.`
      });
    }

    user.inventory.drinks[type]--;

    saveDatabase();

    return interaction.reply({
      content:
`🥤 You drank a **${PRODUCTS[type].name}**.

Remaining: **${user.inventory.drinks[type]}**`
    });
  }

  // ====================================================
  // PHONE
  // ====================================================

  if (command === "phone") {

    const sub = interaction.options.getSubcommand();

    if (sub === "view") {

      if (!user.phone) {
        return interaction.reply({
          content: "📱 You don't own a phone. Use `/phone buy`."
        });
      }

      return interaction.reply({
        content:
`📱 **Your Phone**

Model: **${PHONES[user.phone].name}**
Purchase price: ${money(PHONES[user.phone].price)}

📲 You can now use \`/text\`.`
      });
    }

    if (sub === "buy") {

      if (user.phone) {
        return interaction.reply({
          content:
`📱 You already own a **${PHONES[user.phone].name}**.

You can only own one phone at a time.`
        });
      }

      const model = interaction.options.getString("model");
      const phone = PHONES[model];

      if (user.cash < phone.price) {
        return interaction.reply({
          content:
`❌ You can't afford the **${phone.name}**.

Price: ${money(phone.price)}
Your cash: ${money(user.cash)}`
        });
      }

      user.cash -= phone.price;
      user.phone = model;

      saveDatabase();

      return interaction.reply({
        content:
`📱 **Phone purchased!**

Model: **${phone.name}**
Price: **${money(phone.price)}**
Cash remaining: **${money(user.cash)}**

📲 You can now use \`/text\` to message other Valley members.`
      });
    }
  }

  // ====================================================
  // TEXT
  // ====================================================

  if (command === "text") {

    if (!user.phone) {
      return interaction.reply({
        content: "📱 You need to buy a phone before you can text."
      });
    }

    const target = interaction.options.getUser("user");
    const message = interaction.options.getString("message");

    if (target.bot) {
      return interaction.reply({
        content: "❌ You can't text a bot."
      });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({
        content: "❌ You can't text yourself."
      });
    }

    const receiver = createUser(
      target.id,
      target.username
    );

    receiver.messages.push({
      from: interaction.user.id,
      fromName: interaction.user.username,
      message,
      time: new Date().toISOString()
    });

    if (receiver.messages.length > 50) {
      receiver.messages.shift();
    }

    saveDatabase();

    return interaction.reply({
      content:
`📱 **Text sent**

To: **${target.username}**
From: **${interaction.user.username}**

> ${message}`
    });
  }

  // ====================================================
  // TEXTS
  // ====================================================

  if (command === "texts") {

    if (!user.phone) {
      return interaction.reply({
        content: "📱 Buy a phone first with `/phone buy`."
      });
    }

    if (!user.messages.length) {
      return interaction.reply({
        content: "📭 You don't have any messages."
      });
    }

    const recent = user.messages
      .slice(-10)
      .reverse()
      .map(msg =>
        `📱 **${msg.fromName}**\n> ${msg.message}`
      )
      .join("\n\n");

    return interaction.reply({
      content: `📥 **Recent Messages**\n\n${recent}`
    });
  }

  // ====================================================
  // HOUSE
  // ====================================================

  if (command === "house") {

    const sub = interaction.options.getSubcommand();

    if (sub === "view") {
      return interaction.reply({
        content:
`🏠 **Your House**

Owned: ${user.house.owned ? "Yes" : "No"}
Storage: **${user.house.storage}g**`
      });
    }

    if (sub === "buy") {

      if (user.house.owned) {
        return interaction.reply({
          content: "🏠 You already own a house."
        });
      }

      const price = 25000;

      if (user.cash < price) {
        return interaction.reply({
          content: `❌ You need ${money(price)} to buy a house.`
        });
      }

      user.cash -= price;
      user.house.owned = true;

      saveDatabase();

      return interaction.reply({
        content:
`🏠 **House purchased!**

Price: ${money(price)}
Storage: ${user.house.storage}g`
      });
    }

    if (sub === "upgrade") {

      if (!user.house.owned) {
        return interaction.reply({
          content: "❌ Buy a house first."
        });
      }

      const price = 10000;

      if (user.cash < price) {
        return interaction.reply({
          content: `❌ You need ${money(price)}.`
        });
      }

      user.cash -= price;
      user.house.storage += 100;

      saveDatabase();

      return interaction.reply({
        content:
`🏠 **Storage upgraded!**

New storage: **${user.house.storage}g**`
      });
    }
  }

  // ====================================================
  // BUSINESS
  // ====================================================

  if (command === "business") {

    const sub = interaction.options.getSubcommand();

    if (sub === "create") {

      const type = interaction.options.getString("type");
      const name = interaction.options.getString("name");
      const info = BUSINESS_TYPES[type];

      if (user.cash < info.price) {
        return interaction.reply({
          content:
`❌ You need ${money(info.price)} to start this business.

Your cash: ${money(user.cash)}`
        });
      }

      const id = String(db.nextBusinessId++);

      db.businesses[id] = {
        id,
        owner: interaction.user.id,
        name,
        type,
        income: info.income,
        balance: 0,
        level: 1
      };

      user.cash -= info.price;
      user.businesses.push(id);

      saveDatabase();

      return interaction.reply({
        content:
`🏢 **Business created!**

CEO: **${interaction.user.username}**
Business: **${name}**
Type: **${info.name}**
Startup cost: **${money(info.price)}**
Estimated income: **${money(info.income)} per collection**

You are now the **CEO**.`
      });
    }

    if (sub === "view") {

      if (!user.businesses.length) {
        return interaction.reply({
          content: "🏢 You don't own a business yet."
        });
      }

      const list = user.businesses
        .map(id => db.businesses[id])
        .filter(Boolean)
        .map(b =>
          `🏢 **${b.name}**
Type: ${BUSINESS_TYPES[b.type].name}
Level: ${b.level}
Available earnings: ${money(b.balance)}`
        )
        .join("\n\n");

      return interaction.reply({
        content: `🏢 **Your Businesses**\n\n${list}`
      });
    }

    if (sub === "collect") {

      if (!user.businesses.length) {
        return interaction.reply({
          content: "❌ You don't own a business."
        });
      }

      let total = 0;

      for (const id of user.businesses) {
        const business = db.businesses[id];

        if (!business) continue;

        business.balance +=
          BUSINESS_TYPES[business.type].income *
          business.level;

        total += business.balance;
        business.balance = 0;
      }

      user.cash += total;

      saveDatabase();

      return interaction.reply({
        content:
`🏢 **Business earnings collected!**

You received **${money(total)}**.

CEO: **${interaction.user.username}**`
      });
    }
  }

  // ====================================================
  // LEADERBOARD
  // ====================================================

  if (command === "leaderboard") {

    const users = Object.values(db.users)
      .sort((a, b) =>
        (b.cash + b.bank) - (a.cash + a.bank)
      )
      .slice(0, 10);

    const list = users
      .map((u, i) =>
        `**${i + 1}.** ${u.username} — ${money(u.cash + u.bank)}`
      )
      .join("\n");

    return interaction.reply({
      content: `🏆 **STONER VALLEY LEADERBOARD**\n\n${list || "No members yet."}`
    });
  }

  // ====================================================
  // DICE
  // ====================================================

  if (command === "dice") {

    const roll = Math.floor(Math.random() * 6) + 1;

    return interaction.reply({
      content: `🎲 You rolled a **${roll}**.`
    });
  }

  // ====================================================
  // COINFLIP
  // ====================================================

  if (command === "coinflip") {

    const result =
      Math.random() < 0.5
        ? "Heads"
        : "Tails";

    return interaction.reply({
      content: `🪙 **${result}**`
    });
  }

  // ====================================================
  // EIGHT BALL
  // ====================================================

  if (command === "eightball") {

    const answers = [
      "Absolutely.",
      "Probably.",
      "Looks good.",
      "Ask again later.",
      "Maybe.",
      "I wouldn't count on it.",
      "Signs point to yes.",
      "Signs point to no."
    ];

    const answer =
      answers[Math.floor(Math.random() * answers.length)];

    return interaction.reply({
      content: `🎱 **8-Ball:** ${answer}`
    });
  }

});

// ======================================================
// AUTOMATIC SAVES
// ======================================================

setInterval(() => {
  saveDatabase();
}, 30000);

setInterval(() => {
  backupDatabase();
}, 300000);

// ======================================================
// LOGIN
// ======================================================

client.login(TOKEN);