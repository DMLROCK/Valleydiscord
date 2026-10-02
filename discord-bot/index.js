"use strict";

const fs = require("fs");
const crypto = require("node:crypto");
const path = require("node:path");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  AttachmentBuilder
} = require("discord.js");
const { SECTION_TITLES, buildV2MessagePayload } = require("./components-v2");
const { createDefaultUser, normalizeUserRecord } = require("./user-data");
const {
  CHARACTER_GENDERS,
  CHARACTER_STYLES,
  PRODUCT_DESCRIPTIONS,
  SPORTS,
  productEmoji
} = require("./catalog-content");
const {
  MAX_SECURITY_GUARDS,
  SECURITY_GUARD_PRICE,
  SECURITY_GUARD_WAGE,
  resolveBusinessSecurity,
  resolveSportsBet
} = require("./game-mechanics");

// ======================================================
// STONER VALLEY BOT
// ======================================================

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = "1548055362740035686";

if (!TOKEN && require.main === module) {
  console.error("❌ DISCORD_TOKEN is missing.");
  process.exit(1);
}

const DATA_FILE = "./stoner-valley-data.json";
const BACKUP_FILE = "./stoner-valley-backup.json";
const ASSET_DIR = path.join(__dirname, "assets");

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
  if (!Array.isArray(db.staffAudit)) db.staffAudit = [];
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
  const record = db.users[id] || createDefaultUser(id, username);
  db.users[id] = normalizeUserRecord(record, id, username);
  return db.users[id];
}

function addXP(user, amount) {
  user.xp = Number(user.xp) + Number(amount);
  let leveled = false;

  while (user.xp >= user.level * 100) {
    user.xp -= user.level * 100;
    user.level++;
    leveled = true;
  }

  return leveled;
}

function money(amount) {
  return `$${amount.toLocaleString()}`;
}

function truncateDiscordMessage(content, maxLength = 2000) {
  if (content.length <= maxLength) return content;

  const suffix = "…";
  let truncated = "";

  for (const character of content) {
    if (truncated.length + character.length > maxLength - suffix.length) break;
    truncated += character;
  }

  return `${truncated}${suffix}`;
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
    GatewayIntentBits.Guilds
  ]
});

const STAFF_SESSION_MS = 30 * 60 * 1000;
const STAFF_LOGIN_MAX_FAILURES = 5;
const STAFF_LOGIN_LOCK_MS = 5 * 60 * 1000;
const staffSessions = new Map();
const staffLoginFailures = new Map();

function staffPasswordMatches(suppliedPassword) {
  const expectedPassword = process.env.STAFF_PASSWORD;
  if (!expectedPassword) return false;

  const suppliedHash = crypto.createHash("sha256").update(String(suppliedPassword)).digest();
  const expectedHash = crypto.createHash("sha256").update(expectedPassword).digest();
  return crypto.timingSafeEqual(suppliedHash, expectedHash);
}

function activeStaffSession(userId) {
  const expiresAt = staffSessions.get(userId);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    staffSessions.delete(userId);
    return false;
  }
  return true;
}

function recordStaffAction(actorId, targetId, action, details = {}) {
  if (!Array.isArray(db.staffAudit)) db.staffAudit = [];
  db.staffAudit.unshift({
    timestamp: Date.now(),
    actorId: String(actorId),
    targetId: String(targetId || actorId),
    action,
    details
  });
  db.staffAudit = db.staffAudit.slice(0, 500);
  saveDatabase();
}

function safeProfileText(value, maxLength) {
  return String(value || "")
    .replace(/@/g, "@\u200b")
    .replace(/[`*_~|>]/g, "")
    .trim()
    .slice(0, maxLength);
}

function inventoryBucketForProduct(user, productId) {
  const product = PRODUCTS[productId];
  if (!product) return null;

  if (product.category === "flower") {
    return {
      amount: Number(user.inventory.flower) || 0,
      add: value => { user.inventory.flower += value; },
      remove: value => { user.inventory.flower -= value; }
    };
  }

  if (product.category === "cart") {
    return {
      amount: Number(user.inventory.carts) || 0,
      add: value => { user.inventory.carts += value; },
      remove: value => { user.inventory.carts -= value; }
    };
  }

  const bucketName = {
    edible: "edibles",
    bong: "bongs",
    lighter: "lighters",
    battery: "batteries",
    drink: "drinks"
  }[product.category];
  if (!bucketName) return null;

  return {
    amount: Number(user.inventory[bucketName][productId]) || 0,
    add: value => { user.inventory[bucketName][productId] = (Number(user.inventory[bucketName][productId]) || 0) + value; },
    remove: value => { user.inventory[bucketName][productId] -= value; }
  };
}

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
    .setName("character")
    .setDescription("Customize or view your Valley character")
    .addSubcommand(sub =>
      sub
        .setName("customize")
        .setDescription("Create or update your character")
        .addStringOption(opt =>
          opt
            .setName("name")
            .setDescription("Your character's display name")
            .setRequired(true)
            .setMaxLength(24)
        )
        .addStringOption(opt =>
          opt
            .setName("gender")
            .setDescription("Choose a character gender")
            .setRequired(true)
            .addChoices(...CHARACTER_GENDERS)
        )
        .addStringOption(opt =>
          opt
            .setName("style")
            .setDescription("Choose an appearance preset")
            .setRequired(true)
            .addChoices(...CHARACTER_STYLES)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("view")
        .setDescription("View your character card")
    ),

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
    .setDescription("Smoke flower using your smoking setup")
    .addStringOption(opt =>
      opt
        .setName("celebrity")
        .setDescription("Invite a fictional Valley celebrity cameo")
        .addChoices({ name: "Snoop Dogg · fictional cameo", value: "snoop" })
    ),

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
    .setName("security")
    .setDescription("Hire and manage fictional AI security guards")
    .addSubcommand(sub =>
      sub
        .setName("view")
        .setDescription("View your guard team and business coverage")
    )
    .addSubcommand(sub =>
      sub
        .setName("hire")
        .setDescription("Hire one AI security guard for your business")
    )
    .addSubcommand(sub =>
      sub
        .setName("dismiss")
        .setDescription("Dismiss one security guard")
    ),

  new SlashCommandBuilder()
    .setName("sports")
    .setDescription("View and bet on fictional Valley League games")
    .addSubcommand(sub =>
      sub
        .setName("board")
        .setDescription("View fictional matchups and 2x in-game payouts")
    )
    .addSubcommand(sub =>
      sub
        .setName("bet")
        .setDescription("Place a fake-money bet on a fictional matchup")
        .addStringOption(opt =>
          opt
            .setName("sport")
            .setDescription("Choose a fictional matchup")
            .setRequired(true)
            .addChoices(...Object.entries(SPORTS).map(([value, sport]) => ({
              name: `${sport.emoji} ${sport.label}`,
              value
            })))
        )
        .addStringOption(opt =>
          opt
            .setName("side")
            .setDescription("Choose the home or away team")
            .setRequired(true)
            .addChoices(
              { name: "Home team", value: "home" },
              { name: "Away team", value: "away" }
            )
        )
        .addIntegerOption(opt =>
          opt
            .setName("amount")
            .setDescription("Valley cash to wager")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1000000000)
        )
    ),

  new SlashCommandBuilder()
    .setName("staff")
    .setDescription("Private, password-gated Valley staff controls")
    .addSubcommand(sub =>
      sub
        .setName("login")
        .setDescription("Open a private staff password prompt")
    )
    .addSubcommand(sub =>
      sub
        .setName("logout")
        .setDescription("End your temporary staff session")
    )
    .addSubcommand(sub =>
      sub
        .setName("inspect")
        .setDescription("Privately inspect a player's Valley profile")
        .addUserOption(opt =>
          opt.setName("target").setDescription("Player to inspect").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("currency")
        .setDescription("Add or remove a player's cash or bank balance")
        .addUserOption(opt =>
          opt.setName("target").setDescription("Player to update").setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName("account")
            .setDescription("Cash wallet or bank balance")
            .setRequired(true)
            .addChoices(
              { name: "Cash", value: "cash" },
              { name: "Bank", value: "bank" }
            )
        )
        .addStringOption(opt =>
          opt
            .setName("operation")
            .setDescription("Add or remove Valley money")
            .setRequired(true)
            .addChoices(
              { name: "Add", value: "add" },
              { name: "Remove", value: "remove" }
            )
        )
        .addIntegerOption(opt =>
          opt
            .setName("amount")
            .setDescription("Whole-number amount")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1000000000)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("grant-item")
        .setDescription("Grant a dispensary product to a player")
        .addUserOption(opt =>
          opt.setName("target").setDescription("Player to update").setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName("item")
            .setDescription("Product to grant")
            .setRequired(true)
            .addChoices(...Object.entries(PRODUCTS).map(([value, item]) => ({
              name: item.name,
              value
            })))
        )
        .addIntegerOption(opt =>
          opt
            .setName("quantity")
            .setDescription("Number of product units")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1000)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("remove-item")
        .setDescription("Remove a dispensary product from a player")
        .addUserOption(opt =>
          opt.setName("target").setDescription("Player to update").setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName("item")
            .setDescription("Product to remove")
            .setRequired(true)
            .addChoices(...Object.entries(PRODUCTS).map(([value, item]) => ({
              name: item.name,
              value
            })))
        )
        .addIntegerOption(opt =>
          opt
            .setName("quantity")
            .setDescription("Number of product units")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1000)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("xp")
        .setDescription("Add XP to a player's profile")
        .addUserOption(opt =>
          opt.setName("target").setDescription("Player to update").setRequired(true)
        )
        .addIntegerOption(opt =>
          opt
            .setName("amount")
            .setDescription("XP to award")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1000000)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("audit")
        .setDescription("View recent staff actions")
        .addIntegerOption(opt =>
          opt
            .setName("limit")
            .setDescription("How many recent entries to show")
            .setMinValue(1)
            .setMaxValue(15)
        )
    ),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View a Valley leaderboard")
    .addStringOption(opt =>
      opt
        .setName("category")
        .setDescription("Choose a leaderboard")
        .addChoices(
          { name: "Total Valley wealth", value: "wealth" },
          { name: "Snoop Dogg cameo sessions", value: "celebrity_sessions" }
        )
    ),

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

const COMMAND_SECTIONS = {
  character: "home",
  balance: "economy",
  bank: "economy",
  daily: "economy",
  leaderboard: "economy",
  dice: "economy",
  coinflip: "economy",
  jobs: "work",
  job: "work",
  dispensary: "shop",
  inventory: "inventory",
  smoke: "inventory",
  cart: "inventory",
  edible: "inventory",
  bong: "inventory",
  lighter: "inventory",
  drink: "inventory",
  phone: "phone",
  text: "phone",
  texts: "phone",
  house: "property",
  business: "business",
  security: "business",
  sports: "sports",
  staff: "staff"
};

function sectionForCommand(commandName) {
  return COMMAND_SECTIONS[commandName] || "home";
}

function actionOption(label, value, description) {
  return { label, value, description };
}

function buildActionOptions(section, user, commandName) {
  if (section === "economy") {
    const options = [
      actionOption("Check balance", "cmd:balance", "View cash, bank, and total wealth"),
      actionOption("Claim daily reward", "cmd:daily", "Claim your daily Valley money"),
      actionOption("View leaderboard", "cmd:leaderboard", "See the top Valley members"),
      actionOption("Celebrity session leaderboard", "leaderboard:celebrity_sessions", "See Snoop cameo session totals"),
      actionOption("Deposit money…", "bank:deposit", "Enter an amount to deposit"),
      actionOption("Withdraw money…", "bank:withdraw", "Enter an amount to withdraw")
    ];

    if (commandName === "dice") {
      options.unshift(actionOption("Roll dice again", "cmd:dice", "Roll another six-sided die"));
    } else if (commandName === "coinflip") {
      options.unshift(actionOption("Flip coin again", "cmd:coinflip", "Flip another coin"));
    }

    return options;
  }

  if (section === "work") {
    const options = [
      actionOption("View available jobs", "cmd:jobs", "See every job and its shift pay")
    ];

    if (user.job) {
      options.push(
        actionOption("Work a shift", "job:work", "Earn pay and XP from your current job"),
        actionOption("Quit current job", "job:quit", "Leave your current job")
      );
    } else {
      options.push(...Object.entries(JOBS).map(([id, job]) =>
        actionOption(`Apply · ${job.name}`, `job:apply:${id}`, `Earn ${money(job.pay)} per shift`)
      ));
    }

    return options;
  }

  if (section === "shop") {
    return [
      actionOption("Browse the dispensary", "shop:browse", "View the full product list"),
      actionOption("View sports board", "sports:board", "Open fictional Valley League matchups"),
      actionOption("Hire an AI security guard", "security:hire", "Hire an NPC guard for your business"),
      ...Object.entries(PRODUCTS).map(([id, item]) =>
        actionOption(`View ${item.name}`, `product:view:${id}`, `${money(item.price)} · Open the product card`)
      )
    ];
  }

  if (section === "inventory") {
    const useActions = Object.entries(PRODUCTS)
      .filter(([, item]) => ["edible", "bong", "lighter", "drink"].includes(item.category))
      .map(([id, item]) =>
        actionOption(`Use ${item.name}`, `use:${item.category}:${id}`, "Use an item from your inventory")
      );

    return [
      actionOption("View inventory", "cmd:inventory", "See everything you own"),
      actionOption("Smoke flower", "use:smoke", "Use flower and your smoking setup"),
      actionOption("Use a cartridge", "use:cart", "Use one of your cartridges"),
      ...useActions
    ];
  }

  if (section === "phone") {
    const phoneOptions = user.phone
      ? []
      : Object.entries(PHONES).map(([id, phone]) =>
        actionOption(`Buy ${phone.name} · ${money(phone.price)}`, `phone:buy:${id}`, "Purchase a phone")
      );

    return [
      actionOption("View phone", "phone:view", "Check your phone and number"),
      actionOption("Open text inbox", "cmd:texts", "Read recent messages"),
      ...phoneOptions
    ];
  }

  if (section === "property") {
    return [
      actionOption("View house", "house:view", "Check your home and storage"),
      actionOption("Buy a house", "house:buy", "Purchase a Valley house"),
      actionOption("Upgrade storage", "house:upgrade", "Increase house storage")
    ];
  }

  if (section === "business") {
    return [
      actionOption("View businesses", "business:view", "See your businesses"),
      actionOption("Collect earnings", "business:collect", "Collect available business income"),
      actionOption("View security team", "security:view", "Check your AI guards and payroll"),
      actionOption("Hire AI security guard", "security:hire", "Hire an NPC guard for your business"),
      actionOption("Dismiss a guard", "security:dismiss", "Dismiss one hired guard"),
      ...Object.entries(BUSINESS_TYPES).map(([id, business]) =>
        actionOption(`Create ${business.name}`, `business:create:${id}`, `Start for ${money(business.price)}`)
      )
    ];
  }

  if (section === "sports") {
    return Object.entries(SPORTS).map(([id, sport]) =>
      actionOption(`${sport.emoji} ${sport.label}`, `sports:show:${id}`, `${sport.home} vs ${sport.away}`)
    );
  }

  if (section === "staff") {
    return [
      actionOption("Staff command guide", "cmd:info", "See the Valley command guide")
    ];
  }

  const options = [
    actionOption("Valley overview", "cmd:valley", "View your Valley dashboard"),
    actionOption("My profile", "cmd:profile", "View level, XP, and account details"),
    actionOption("Check balance", "cmd:balance", "View cash and bank"),
    actionOption("View inventory", "cmd:inventory", "See everything you own"),
    actionOption("Customize character…", "character:customize", "Choose a name, gender, and appearance preset"),
    actionOption("View character", "character:view", "Open your character card"),
    actionOption("Command guide", "cmd:info", "Browse all slash commands")
  ];

  if (commandName === "eightball") {
    options.unshift(actionOption("Ask the 8-ball again…", "eightball:ask", "Enter another question"));
  }

  return options;
}

function inventoryLines(items) {
  return Object.entries(items || {})
    .filter(([, amount]) => Number(amount) > 0)
    .map(([id, amount]) => `${PRODUCTS[id]?.name || id}: ${amount}`)
    .join("\n") || "None";
}

function buildNavigationPanel(section, user) {
  const cash = Number(user.cash) || 0;
  const bank = Number(user.bank) || 0;
  const job = user.job ? (JOBS[user.job]?.name || "Unknown job") : "Unemployed";
  const house = user.house || { owned: false, storage: 0 };

  if (section === "economy") {
    return `💵 **Your Valley economy**

Cash: ${money(cash)}
🏦 Bank: ${money(bank)}
💰 Total: ${money(cash + bank)}
⭐ Level: ${user.level || 1}

Use the quick-action menu to claim your daily reward, manage your bank, or open the leaderboard.`;
  }

  if (section === "work") {
    const jobs = Object.values(JOBS)
      .map(item => `💼 **${item.name}** — ${money(item.pay)} per shift`)
      .join("\n");

    return `💼 **Work**

Current job: **${job}**

**Available jobs**
${jobs}

Apply, work a shift, or quit from the quick-action menu.`;
  }

  if (section === "shop") {
    const products = Object.values(PRODUCTS)
      .map(item => `• ${item.name} — ${money(item.price)}`)
      .join("\n");

    return `🏪 **Valley Dispensary**

Choose a product from the quick-action menu to buy it, or browse the list below.

${products}`;
  }

  if (section === "inventory") {
    const inventory = user.inventory || {};
    return `🎒 **${user.username || "Your"} inventory**

🌿 Flower: **${Number(inventory.flower) || 0}g**
🛒 Cartridges: **${Number(inventory.carts) || 0}**

🍬 **Edibles**
${inventoryLines(inventory.edibles)}

💨 **Bongs**
${inventoryLines(inventory.bongs)}

🔥 **Lighters**
${inventoryLines(inventory.lighters)}

🔋 **Batteries**
${inventoryLines(inventory.batteries)}

🥤 **Drinks**
${inventoryLines(inventory.drinks)}

Use the quick-action menu to use an item.`;
  }

  if (section === "phone") {
    const phoneName = user.phone ? (PHONES[user.phone]?.name || "Unknown phone") : "None";
    const messageCount = Array.isArray(user.messages) ? user.messages.length : 0;

    return `📱 **Phone**

Owned phone: **${phoneName}**
Recent messages saved: **${messageCount}**

Use the quick-action menu to view your phone, open your inbox, or browse phones for sale.`;
  }

  if (section === "property") {
    return `🏠 **Property**

House: **${house.owned ? "Owned" : "Not owned"}**
Storage capacity: **${Number(house.storage) || 0}g**

Use the quick-action menu to view, buy, or upgrade your house.`;
  }

  if (section === "business") {
    const businesses = Array.isArray(user.businesses) ? user.businesses.length : 0;
    return `🏢 **Business ownership**

Businesses owned: **${businesses}**
Available business types: **${Object.keys(BUSINESS_TYPES).length}**
🛡️ AI guards: **${Math.min(MAX_SECURITY_GUARDS, Number(user.securityGuards) || 0)}/${MAX_SECURITY_GUARDS}**

Use the quick-action menu to view your businesses, collect earnings, manage guards, or start a new business.`;
  }

  if (section === "sports") {
    const matchups = Object.values(SPORTS)
      .map(sport => `${sport.emoji} **${sport.label}** · ${sport.home} vs ${sport.away}`)
      .join("\n");

    return `🏟️ **Valley League · Fictional games**

${matchups}

Choose a matchup in the quick-action menu or use \`/sports bet\`. Bets use Valley cash only; a winning pick pays 2× the stake. No real teams, live odds, or real-money betting.`;
  }

  if (section === "staff") {
    return `🔐 **Private staff controls**

Use \`/staff login\` to open the private password prompt. Staff sessions expire after 30 minutes. Actions are recorded in the Valley audit log.`;
  }

  if (section === "home") {
    return `Your Valley dashboard for **${user.username || "player"}**.

💵 Cash: **${money(cash)}** · 🏦 Bank: **${money(bank)}**
⭐ Level: **${user.level || 1}** · 💼 Job: **${job}**
🧍 Character: **${user.character ? safeProfileText(user.character.name, 24) : "Not created"}**

Use the navigation menu to open a section. The quick-action menu has your most-used commands.`;
  }

  return "Choose a Valley section from the navigation menu.";
}

function createV2Payload(
  sourceInteraction,
  response,
  section,
  update = false,
  commandName = sourceInteraction.commandName
) {
  const user = createUser(sourceInteraction.user.id, sourceInteraction.user.username);

  return buildV2MessagePayload({
    userId: sourceInteraction.user.id,
    section,
    response,
    actions: buildActionOptions(section, user, commandName),
    update
  });
}

function productInventoryCount(user, productId) {
  const item = PRODUCTS[productId];
  if (!item) return 0;
  if (item.category === "flower") return Number(user.inventory.flower) || 0;
  if (item.category === "cart") return Number(user.inventory.carts) || 0;

  const bucketByCategory = {
    edible: "edibles",
    bong: "bongs",
    lighter: "lighters",
    battery: "batteries",
    drink: "drinks"
  };
  const bucket = user.inventory[bucketByCategory[item.category]];
  return Number(bucket?.[productId]) || 0;
}

function productCardActions(user, productId) {
  const item = PRODUCTS[productId];
  const actions = [
    actionOption(`Buy ${item.name} · ${money(item.price)}`, `shop:buy:${productId}`, "Purchase this item with Valley cash"),
    actionOption("Back to dispensary", "shop:browse", "Return to the full catalog"),
    ...Object.entries(PRODUCTS)
      .filter(([id]) => id !== productId)
      .map(([id, product]) =>
        actionOption(`View ${product.name}`, `product:view:${id}`, `${money(product.price)} · Product details`)
      ),
    actionOption("Hire an AI security guard", "security:hire", "Hire an NPC guard for your business"),
    actionOption("Open Valley sports", "sports:board", "View fictional matchups")
  ];
  return actions.slice(0, 25);
}

async function showProductPage(interaction, productId) {
  const item = PRODUCTS[productId];
  if (!item) throw new Error("That product is no longer available.");

  const user = createUser(interaction.user.id, interaction.user.username);
  const filename = `${productId}.jpg`;
  const imagePath = path.join(ASSET_DIR, "products", filename);
  const owned = productInventoryCount(user, productId);
  const image = new AttachmentBuilder(imagePath, { name: filename });

  return interaction.update(buildV2MessagePayload({
    userId: interaction.user.id,
    section: "shop",
    response: {
      content: `${productEmoji(item.category)} **${item.name}**

**Price:** ${money(item.price)}
**Category:** ${item.category[0].toUpperCase()}${item.category.slice(1)}
**In your inventory:** ${owned}${item.category === "flower" ? "g" : ""}

${PRODUCT_DESCRIPTIONS[productId] || "A Valley dispensary catalog item, presented with original in-game artwork."}

Choose **Buy this product** from the quick-action menu to purchase it. This is a fictional in-server catalog.`,
      files: [image],
      media: [{
        url: `attachment://${filename}`,
        description: `${item.name} product photo`
      }]
    },
    actions: productCardActions(user, productId),
    update: true
  }));
}

function sportsMatchActions(sportId) {
  const sport = SPORTS[sportId];
  return [
    actionOption(`Bet on ${sport.home}…`, `sports:bet:${sportId}:home`, "Enter a Valley cash wager"),
    actionOption(`Bet on ${sport.away}…`, `sports:bet:${sportId}:away`, "Enter a Valley cash wager"),
    ...Object.entries(SPORTS)
      .filter(([id]) => id !== sportId)
      .map(([id, other]) =>
        actionOption(`${other.emoji} ${other.label}`, `sports:show:${id}`, `${other.home} vs ${other.away}`)
      ),
    actionOption("Back to sports board", "sports:board", "View all fictional matchups")
  ];
}

async function showSportsMatch(interaction, sportId) {
  const sport = SPORTS[sportId];
  if (!sport) throw new Error("That fictional matchup is not available.");

  const filename = sport.image;
  const image = new AttachmentBuilder(path.join(ASSET_DIR, "sports", filename), { name: filename });

  return interaction.update(buildV2MessagePayload({
    userId: interaction.user.id,
    section: "sports",
    response: {
      content: `${sport.emoji} **${sport.label}**

🏠 **${sport.home}** vs **${sport.away}** ✈️

${sport.description}

Choose a side, then enter your wager. A winning pick returns **2×** the stake. The match, clip, odds, and Valley cash are fictional; nothing is based on a real event.`,
      files: [image],
      media: [{
        url: `attachment://${filename}`,
        description: `Animated fictional ${sport.label} play`
      }]
    },
    actions: sportsMatchActions(sportId),
    update: true
  }));
}

function installV2ReplyAdapter(interaction) {
  const originalReply = interaction.reply.bind(interaction);
  const originalFollowUp = interaction.followUp.bind(interaction);

  interaction.reply = response =>
    originalReply(createV2Payload(interaction, response, sectionForCommand(interaction.commandName)));

  interaction.followUp = response =>
    originalFollowUp(createV2Payload(interaction, response, sectionForCommand(interaction.commandName)));
}

async function runCommandFromComponent(sourceInteraction, commandName, commandOptions = {}, responseMode = "update") {
  const user = createUser(sourceInteraction.user.id, sourceInteraction.user.username);
  const args = commandOptions.strings || {};
  const integers = commandOptions.integers || {};
  const users = commandOptions.users || {};
  const section = sectionForCommand(commandName);

  const commandInteraction = {
    commandName,
    user: sourceInteraction.user,
    options: {
      getSubcommand: () => commandOptions.subcommand || null,
      getString: name => args[name] ?? null,
      getInteger: name => integers[name] ?? null,
      getUser: name => users[name] ?? null
    },
    reply: response => {
      const payload = buildV2MessagePayload({
        userId: sourceInteraction.user.id,
        section,
        response,
        actions: buildActionOptions(section, user, commandName),
        update: responseMode === "update"
      });

      return responseMode === "update"
        ? sourceInteraction.update(payload)
        : sourceInteraction.reply(payload);
    }
  };

  return handleSlashCommand(commandInteraction);
}

function showBankAmountModal(interaction, subcommand) {
  const label = subcommand === "deposit" ? "Amount to deposit" : "Amount to withdraw";
  const title = subcommand === "deposit" ? "Deposit Valley money" : "Withdraw Valley money";
  const modal = new ModalBuilder()
    .setCustomId(`sv2:modal:${interaction.user.id}:bank:${subcommand}`)
    .setTitle(title)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("amount")
          .setLabel(label)
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(15)
          .setRequired(true)
      )
    );

  return interaction.showModal(modal);
}

function showBusinessNameModal(interaction, businessType) {
  const business = BUSINESS_TYPES[businessType];
  if (!business) throw new Error("That business type is not available.");

  const modal = new ModalBuilder()
    .setCustomId(`sv2:modal:${interaction.user.id}:business:${businessType}`)
    .setTitle(`Create ${business.name}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("businessName")
          .setLabel("Business name")
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(40)
          .setRequired(true)
      )
    );

  return interaction.showModal(modal);
}

function showEightBallQuestionModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(`sv2:modal:${interaction.user.id}:eightball:question`)
    .setTitle("Ask the Valley 8-ball")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("question")
          .setLabel("Your question")
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(500)
          .setRequired(true)
      )
    );

  return interaction.showModal(modal);
}

function showCharacterModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(`sv2:modal:${interaction.user.id}:character:customize`)
    .setTitle("Customize your Valley character")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("name")
          .setLabel("Character name")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(24)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("gender")
          .setLabel("Gender (woman, man, nonbinary, or your own)")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(32)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("style")
          .setLabel("Style (classic, streetwear, skater, greenhouse)")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(24)
          .setRequired(true)
      )
    );

  return interaction.showModal(modal);
}

function showSportsBetModal(interaction, sportId, side) {
  if (!SPORTS[sportId] || !["home", "away"].includes(side)) {
    throw new Error("That Valley League bet is not available.");
  }

  const modal = new ModalBuilder()
    .setCustomId(`sv2:modal:${interaction.user.id}:sports:${sportId}:${side}`)
    .setTitle("Place a Valley cash bet")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("amount")
          .setLabel("Valley cash to wager")
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(12)
          .setRequired(true)
      )
    );

  return interaction.showModal(modal);
}

function showStaffLoginModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(`sv2:modal:${interaction.user.id}:staff:login`)
    .setTitle("Private staff authentication")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("password")
          .setLabel("Staff password")
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(128)
          .setRequired(true)
      )
    );

  return interaction.showModal(modal);
}

async function executeV2Action(interaction, action) {
  if (action.startsWith("cmd:")) {
    return runCommandFromComponent(interaction, action.slice(4));
  }

  if (action.startsWith("leaderboard:")) {
    return runCommandFromComponent(interaction, "leaderboard", {
      strings: { category: action.slice("leaderboard:".length) }
    });
  }

  if (action === "character:customize") {
    return showCharacterModal(interaction);
  }

  if (action === "character:view") {
    return runCommandFromComponent(interaction, "character", { subcommand: "view" });
  }

  if (action.startsWith("product:view:")) {
    return showProductPage(interaction, action.slice("product:view:".length));
  }

  if (action === "sports:board") {
    return runCommandFromComponent(interaction, "sports", { subcommand: "board" });
  }

  if (action.startsWith("sports:show:")) {
    return showSportsMatch(interaction, action.slice("sports:show:".length));
  }

  if (action.startsWith("sports:bet:")) {
    const [, , sportId, side] = action.split(":");
    return showSportsBetModal(interaction, sportId, side);
  }

  if (action.startsWith("security:")) {
    const subcommand = action.slice("security:".length);
    if (!["view", "hire", "dismiss"].includes(subcommand)) {
      throw new Error("That security action is not available.");
    }
    return runCommandFromComponent(interaction, "security", { subcommand });
  }

  if (action === "eightball:ask") {
    return showEightBallQuestionModal(interaction);
  }

  if (action === "bank:deposit" || action === "bank:withdraw") {
    return showBankAmountModal(interaction, action.split(":")[1]);
  }

  if (action.startsWith("job:")) {
    const [, operation, jobId] = action.split(":");
    return runCommandFromComponent(interaction, "job", {
      subcommand: operation,
      strings: jobId ? { job: jobId } : {}
    });
  }

  if (action === "shop:browse") {
    return runCommandFromComponent(interaction, "dispensary", { subcommand: "browse" });
  }

  if (action.startsWith("shop:buy:")) {
    const productId = action.slice("shop:buy:".length);
    if (!PRODUCTS[productId]) throw new Error("That product is no longer available.");
    return runCommandFromComponent(interaction, "dispensary", {
      subcommand: "buy",
      strings: { item: productId }
    });
  }

  if (action === "use:smoke") {
    return runCommandFromComponent(interaction, "smoke");
  }

  if (action === "use:cart") {
    return runCommandFromComponent(interaction, "cart");
  }

  if (action.startsWith("use:")) {
    const [, category, itemId] = action.split(":");
    const commandByCategory = {
      edible: "edible",
      bong: "bong",
      lighter: "lighter",
      drink: "drink"
    };
    const commandName = commandByCategory[category];
    if (!commandName || !PRODUCTS[itemId] || PRODUCTS[itemId].category !== category) {
      throw new Error("That inventory action is no longer available.");
    }

    return runCommandFromComponent(interaction, commandName, {
      strings: { type: itemId }
    });
  }

  if (action === "phone:view") {
    return runCommandFromComponent(interaction, "phone", { subcommand: "view" });
  }

  if (action === "cmd:texts") {
    return runCommandFromComponent(interaction, "texts");
  }

  if (action.startsWith("phone:buy:")) {
    const phoneId = action.slice("phone:buy:".length);
    if (!PHONES[phoneId]) throw new Error("That phone model is no longer available.");
    return runCommandFromComponent(interaction, "phone", {
      subcommand: "buy",
      strings: { model: phoneId }
    });
  }

  if (action.startsWith("house:")) {
    const subcommand = action.slice("house:".length);
    if (!["view", "buy", "upgrade"].includes(subcommand)) {
      throw new Error("That property action is not available.");
    }
    return runCommandFromComponent(interaction, "house", { subcommand });
  }

  if (action === "business:view" || action === "business:collect") {
    return runCommandFromComponent(interaction, "business", {
      subcommand: action.split(":")[1]
    });
  }

  if (action.startsWith("business:create:")) {
    const businessType = action.slice("business:create:".length);
    return showBusinessNameModal(interaction, businessType);
  }

  throw new Error("That quick action is not available.");
}

async function handleV2ComponentInteraction(interaction) {
  if (interaction.isStringSelectMenu()) {
    const parts = interaction.customId.split(":");

    if (parts[0] !== "sv2") return;
    const ownerId = parts[2];

    if (ownerId !== interaction.user.id) {
      return interaction.reply(createV2Payload(
        interaction,
        { content: "Only the player who opened this Valley menu can use it.", ephemeral: true },
        "home"
      ));
    }

    if (parts[1] === "navigate") {
      const section = interaction.values[0];
      if (!SECTION_TITLES[section]) throw new Error("That Valley section is not available.");

      const user = createUser(interaction.user.id, interaction.user.username);
      return interaction.update(buildV2MessagePayload({
        userId: interaction.user.id,
        section,
        response: { content: buildNavigationPanel(section, user) },
        actions: buildActionOptions(section, user),
        update: true
      }));
    }

    if (parts[1] === "actions") {
      return executeV2Action(interaction, interaction.values[0]);
    }

    return;
  }

  if (!interaction.isModalSubmit() || !interaction.customId.startsWith("sv2:modal:")) {
    return;
  }

  const parts = interaction.customId.split(":");
  const ownerId = parts[2];
  const modalType = parts[3];
  const modalAction = parts[4];
  const modalValue = parts[5];

  if (ownerId !== interaction.user.id) {
    return interaction.reply(createV2Payload(
      interaction,
      { content: "Only the player who opened this Valley form can submit it.", ephemeral: true },
      "home"
    ));
  }

  if (modalType === "character" && modalAction === "customize") {
    const name = safeProfileText(interaction.fields.getTextInputValue("name"), 24);
    const gender = safeProfileText(interaction.fields.getTextInputValue("gender"), 32);
    const style = safeProfileText(interaction.fields.getTextInputValue("style"), 24).toLowerCase();
    const allowedStyles = new Set(CHARACTER_STYLES.map(option => option.value));

    if (!name || !gender || !allowedStyles.has(style)) {
      return interaction.reply(createV2Payload(
        interaction,
        { content: "Enter a name, gender, and one style preset: classic, streetwear, skater, or greenhouse.", ephemeral: true },
        "home"
      ));
    }

    return runCommandFromComponent(interaction, "character", {
      subcommand: "customize",
      strings: { name, gender, style }
    }, "reply");
  }

  if (modalType === "sports" && SPORTS[modalAction] && ["home", "away"].includes(modalValue)) {
    const amount = Number(interaction.fields.getTextInputValue("amount"));
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1000000000) {
      return interaction.reply(createV2Payload(
        interaction,
        { content: "Enter a whole-number wager between $1 and $1,000,000,000 Valley cash.", ephemeral: true },
        "sports"
      ));
    }

    return runCommandFromComponent(interaction, "sports", {
      subcommand: "bet",
      strings: { sport: modalAction, side: modalValue },
      integers: { amount }
    }, "reply");
  }

  if (modalType === "staff" && modalAction === "login") {
    if (!interaction.guildId || interaction.guildId !== GUILD_ID) {
      return interaction.reply(createV2Payload(
        interaction,
        { content: "Staff authentication is only available in the Stoner Valley server.", ephemeral: true },
        "staff"
      ));
    }

    const now = Date.now();
    const failures = staffLoginFailures.get(interaction.user.id) || { count: 0, lockedUntil: 0 };
    if (failures.lockedUntil > now) {
      const minutes = Math.ceil((failures.lockedUntil - now) / 60000);
      return interaction.reply(createV2Payload(
        interaction,
        { content: `Too many failed attempts. Try again in about ${minutes} minute(s).`, ephemeral: true },
        "staff"
      ));
    }

    if (!process.env.STAFF_PASSWORD) {
      return interaction.reply(createV2Payload(
        interaction,
        { content: "Staff login is unavailable. Ask the server owner to check the Replit Secrets configuration.", ephemeral: true },
        "staff"
      ));
    }

    const suppliedPassword = interaction.fields.getTextInputValue("password");
    if (!staffPasswordMatches(suppliedPassword)) {
      failures.count += 1;
      if (failures.count >= STAFF_LOGIN_MAX_FAILURES) {
        failures.count = 0;
        failures.lockedUntil = now + STAFF_LOGIN_LOCK_MS;
      }
      staffLoginFailures.set(interaction.user.id, failures);

      return interaction.reply(createV2Payload(
        interaction,
        { content: "That staff password was not accepted.", ephemeral: true },
        "staff"
      ));
    }

    staffLoginFailures.delete(interaction.user.id);
    staffSessions.set(interaction.user.id, now + STAFF_SESSION_MS);
    recordStaffAction(interaction.user.id, interaction.user.id, "login");

    return interaction.reply(createV2Payload(
      interaction,
      { content: "✅ Staff tools unlocked for 30 minutes. Responses remain private, and changes are audited.", ephemeral: true },
      "staff"
    ));
  }

  if (modalType === "bank") {
    const amount = Number(interaction.fields.getTextInputValue("amount"));
    if (!Number.isSafeInteger(amount) || amount < 1) {
      return interaction.reply(createV2Payload(
        interaction,
        { content: "Enter a whole-number amount greater than zero.", ephemeral: true },
        "economy"
      ));
    }

    if (!["deposit", "withdraw"].includes(modalAction)) {
      throw new Error("That bank action is not available.");
    }

    return runCommandFromComponent(interaction, "bank", {
      subcommand: modalAction,
      integers: { amount }
    }, "reply");
  }

  if (modalType === "business") {
    const businessName = interaction.fields.getTextInputValue("businessName").trim();
    if (!businessName || businessName.length > 40 || !BUSINESS_TYPES[modalAction]) {
      return interaction.reply(createV2Payload(
        interaction,
        { content: "Enter a business name of 1–40 characters and try again.", ephemeral: true },
        "business"
      ));
    }

    return runCommandFromComponent(interaction, "business", {
      subcommand: "create",
      strings: {
        type: modalAction,
        name: businessName
      }
    }, "reply");
  }

  if (modalType === "eightball" && modalAction === "question") {
    const question = interaction.fields.getTextInputValue("question").trim();
    if (!question || question.length > 500) {
      return interaction.reply(createV2Payload(
        interaction,
        { content: "Enter a question of 1–500 characters and try again.", ephemeral: true },
        "home"
      ));
    }

    return runCommandFromComponent(interaction, "eightball", {
      strings: { question }
    }, "reply");
  }
}

function sectionForComponent(interaction) {
  const parts = (interaction.customId || "").split(":");
  if (parts[1] === "actions" && SECTION_TITLES[parts[3]]) return parts[3];
  if (parts[1] === "navigate" && SECTION_TITLES[interaction.values?.[0]]) {
    return interaction.values[0];
  }
  if (parts[1] === "modal" && parts[3] === "bank") return "economy";
  if (parts[1] === "modal" && parts[3] === "business") return "business";
  if (parts[1] === "modal" && parts[3] === "sports") return "sports";
  if (parts[1] === "modal" && parts[3] === "staff") return "staff";
  return "home";
}

async function handleV2ComponentError(interaction, error) {
  console.error("Components V2 interaction failed:", error);
  const section = sectionForComponent(interaction);
  const response = {
    content: "Sorry, that Valley action could not be completed. Try the matching slash command.",
    ephemeral: true
  };

  try {
    const payload = createV2Payload(interaction, response, section);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch (responseError) {
    console.error("Could not send the Components V2 error response:", responseError);
  }
}

async function handleStaffCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const privateReply = content => interaction.reply({ content, ephemeral: true });

  if (!interaction.guildId || interaction.guildId !== GUILD_ID) {
    return privateReply("Staff controls are only available in the Stoner Valley server.");
  }

  if (subcommand === "login") {
    return showStaffLoginModal(interaction);
  }

  if (subcommand === "logout") {
    const hadSession = activeStaffSession(interaction.user.id);
    staffSessions.delete(interaction.user.id);
    if (hadSession) recordStaffAction(interaction.user.id, interaction.user.id, "logout");
    return privateReply(hadSession ? "Staff session ended." : "You did not have an active staff session.");
  }

  if (!activeStaffSession(interaction.user.id)) {
    return privateReply("Staff session required. Use `/staff login`; access expires after 30 minutes.");
  }

  if (subcommand === "inspect") {
    const targetDiscordUser = interaction.options.getUser("target");
    const target = db.users[targetDiscordUser.id]
      ? createUser(targetDiscordUser.id, targetDiscordUser.username)
      : null;
    if (!target) return privateReply("No Valley profile exists for that player yet.");

    recordStaffAction(interaction.user.id, targetDiscordUser.id, "inspect");
    return privateReply(`🔎 **Private player inspection**

Player: **${safeProfileText(target.username, 60)}**
💵 Cash: ${money(target.cash)} · 🏦 Bank: ${money(target.bank)}
⭐ Level: ${target.level} · XP: ${target.xp}
🧍 Character: ${target.character ? safeProfileText(target.character.name, 24) : "Not created"}
💨 Smoke sessions: ${target.smokeSessions}
🎤 Snoop cameo sessions: ${target.celebritySessions.snoop}
🛡️ AI guards: ${target.securityGuards}`);
  }

  if (subcommand === "audit") {
    const limit = interaction.options.getInteger("limit") || 10;
    const entries = db.staffAudit.slice(0, limit);
    const lines = entries.map(entry => {
      const when = new Date(entry.timestamp).toISOString().replace("T", " ").slice(0, 19);
      const details = Object.entries(entry.details || {})
        .map(([key, value]) => `${key}=${safeProfileText(value, 60)}`)
        .join(" · ");
      return `• \`${when} UTC\` · ${entry.action} · actor \`${entry.actorId}\` · target \`${entry.targetId}\`${details ? ` · ${details}` : ""}`;
    });
    return privateReply(`📋 **Recent staff audit actions**\n\n${lines.join("\n") || "No staff actions recorded."}`);
  }

  const targetDiscordUser = interaction.options.getUser("target");
  const target = createUser(targetDiscordUser.id, targetDiscordUser.username);

  if (subcommand === "currency") {
    const account = interaction.options.getString("account");
    const operation = interaction.options.getString("operation");
    const amount = interaction.options.getInteger("amount");
    if (!["cash", "bank"].includes(account) || !["add", "remove"].includes(operation)) {
      return privateReply("Choose a valid account and operation.");
    }

    if (operation === "remove" && target[account] < amount) {
      return privateReply(`That player only has ${money(target[account])} in ${account}. No change was made.`);
    }

    target[account] += operation === "add" ? amount : -amount;
    recordStaffAction(interaction.user.id, targetDiscordUser.id, `currency_${operation}`, {
      account,
      amount
    });

    return privateReply(`✅ ${operation === "add" ? "Added" : "Removed"} ${money(amount)} ${account} for **${safeProfileText(target.username, 60)}**. New ${account} balance: ${money(target[account])}.`);
  }

  if (subcommand === "grant-item" || subcommand === "remove-item") {
    const productId = interaction.options.getString("item");
    const quantity = interaction.options.getInteger("quantity");
    const product = PRODUCTS[productId];
    const bucket = inventoryBucketForProduct(target, productId);
    if (!product || !bucket) return privateReply("That product cannot be managed.");

    const units = ["flower", "cart"].includes(product.category)
      ? Number((product.amount * quantity).toFixed(2))
      : quantity;
    const isGrant = subcommand === "grant-item";
    if (!isGrant && bucket.amount < units) {
      return privateReply(`That player has ${bucket.amount} of ${product.name}; no change was made.`);
    }

    if (isGrant) bucket.add(units);
    else bucket.remove(units);
    const remaining = productInventoryCount(target, productId);
    recordStaffAction(interaction.user.id, targetDiscordUser.id, isGrant ? "grant_item" : "remove_item", {
      productId,
      quantity,
      units
    });

    return privateReply(`✅ ${isGrant ? "Granted" : "Removed"} ${quantity} × **${product.name}** for **${safeProfileText(target.username, 60)}**. Current amount: ${remaining}${product.category === "flower" ? "g" : ""}.`);
  }

  if (subcommand === "xp") {
    const amount = interaction.options.getInteger("amount");
    const oldLevel = target.level;
    const leveled = addXP(target, amount);
    recordStaffAction(interaction.user.id, targetDiscordUser.id, "xp_add", {
      amount,
      levelBefore: oldLevel,
      levelAfter: target.level
    });
    return privateReply(`✅ Added ${amount} XP to **${safeProfileText(target.username, 60)}**. Level: ${oldLevel} → ${target.level}${leveled ? " 🎉" : ""}.`);
  }

  return privateReply("That staff action is not available.");
}

// ======================================================
// READY
// ======================================================

client.once("clientReady", async () => {
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

client.on("interactionCreate", interaction => {
  if (interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
    handleV2ComponentInteraction(interaction)
      .catch(error => handleV2ComponentError(interaction, error));
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  installV2ReplyAdapter(interaction);

  handleSlashCommand(interaction).catch(async error => {
    console.error(`Command /${interaction.commandName} failed:`, error);

    try {
      const response = {
        content: "Sorry, something went wrong while running that command.",
        ephemeral: true
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(response);
      } else {
        await interaction.reply(response);
      }
    } catch (responseError) {
      console.error("Could not send the command error response:", responseError);
    }
  });
});

async function handleSlashCommand(interaction) {
  const user = createUser(
    interaction.user.id,
    interaction.user.username
  );

  const command = interaction.commandName;

  if (command === "staff") {
    return handleStaffCommand(interaction);
  }

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

🧍 **Character**
\`/character customize\` — Choose a name, gender, and look
\`/character view\` — View your character card

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
\`/security view\`, \`/security hire\`, \`/security dismiss\`

🏟️ **Fictional Valley League**
\`/sports board\` — View fictional matchups
\`/sports bet\` — Wager Valley cash on a simulated result

🌿 **Use Your Items**
\`/smoke\`
\`/cart\`
\`/edible\`
\`/bong\`
\`/lighter\`
\`/drink\`

🔐 **Staff**
\`/staff login\` — Private staff-password prompt
\`/staff inspect\`, \`/staff currency\`, \`/staff grant-item\`, \`/staff remove-item\`, \`/staff xp\`, \`/staff audit\`

🎱 \`/eightball\` — Ask the 8-ball`
    });
  }

  if (command === "character") {
    const sub = interaction.options.getSubcommand();

    if (sub === "view") {
      if (!user.character) {
        return interaction.reply({
          content: "🧍 You have not made a Valley character yet. Use `/character customize` or the home quick-action menu."
        });
      }

      return interaction.reply({
        content: `🧍 **${safeProfileText(user.character.name, 24)}**

Gender: **${safeProfileText(user.character.gender, 32)}**
Look: **${safeProfileText(user.character.style, 24)}**
⭐ Level ${user.level} · 🌿 ${Number(user.smokeSessions) || 0} sessions`
      });
    }

    if (sub === "customize") {
      const name = safeProfileText(interaction.options.getString("name"), 24);
      const gender = safeProfileText(interaction.options.getString("gender"), 32);
      const style = safeProfileText(interaction.options.getString("style"), 24).toLowerCase();
      const allowedGenders = new Set(CHARACTER_GENDERS.map(option => option.value));
      const allowedStyles = new Set(CHARACTER_STYLES.map(option => option.value));

      if (!name || !allowedGenders.has(gender.toLowerCase()) || !allowedStyles.has(style)) {
        return interaction.reply({
          content: "Choose a name, a listed gender, and one appearance preset.",
          ephemeral: true
        });
      }

      user.character = { name, gender, style, updatedAt: Date.now() };
      saveDatabase();

      return interaction.reply({
        content: `✅ **Character saved**

🧍 **${name}** · ${gender}
👕 Look: **${style}**

You can change these choices any time. Discord offers menus and presets here, not draggable appearance sliders.`
      });
    }
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
💼 Job: ${user.job ? (JOBS[user.job]?.name || "Unknown job") : "Unemployed"}
📱 Phone: ${user.phone ? PHONES[user.phone].name : "None"}
🧍 Character: ${user.character ? safeProfileText(user.character.name, 24) : "Not created"}
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
          content: `❌ You already work as **${JOBS[user.job]?.name || "an unknown job"}**. Quit first.`
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

      if (!job) {
        return interaction.reply({
          content: "❌ Your saved job could not be found. Use `/job quit`, then apply for a valid job."
        });
      }

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

      const oldJob = JOBS[user.job]?.name || "an unknown job";

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
      const featuredFilename = "flower_1g.jpg";
      const featuredImage = new AttachmentBuilder(
        path.join(ASSET_DIR, "products", featuredFilename),
        { name: featuredFilename }
      );

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

Use the quick-action menu to open individual product cards, see original artwork, and buy with Valley cash.`,
        files: [featuredImage],
        media: [{
          url: `attachment://${featuredFilename}`,
          description: "Featured Stoner Valley flower product"
        }]
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
    user.smokeSessions += 1;
    addXP(user, 10);

    const celebrity = interaction.options.getString("celebrity");
    let sessionDescription = "You used 1g of flower with your own bong and lighter.";
    if (celebrity === "snoop") {
      user.celebritySessions.snoop += 1;
      const characterName = user.character?.name || interaction.user.username;
      sessionDescription = `In this fictional Valley scene, Snoop Dogg joins ${safeProfileText(characterName, 24)} for a session. This cameo is not an endorsement.`;
    }

    saveDatabase();

    return interaction.reply({
      content:
`💨 **Session complete.**

${sessionDescription}

🌿 Flower remaining: **${user.inventory.flower}g**
⭐ +10 XP
🏆 Total sessions: **${user.smokeSessions}**${celebrity === "snoop" ? `\n🎤 Snoop cameo sessions: **${user.celebritySessions.snoop}**` : ""}`
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

    const response = `📥 **Recent Messages**\n\n${recent}`;

    return interaction.reply({
      content: truncateDiscordMessage(response)
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
Type: ${BUSINESS_TYPES[b.type]?.name || "Unknown business"}
Level: ${b.level}
Available earnings: ${money(b.balance)}`
        )
        .join("\n\n");

      return interaction.reply({
        content: truncateDiscordMessage(`🏢 **Your Businesses**\n\n${list}`)
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

        const businessType = BUSINESS_TYPES[business.type];
        if (!businessType) continue;

        business.balance +=
          businessType.income *
          business.level;

        total += business.balance;
        business.balance = 0;
      }

      const securityResult = resolveBusinessSecurity(total, user.securityGuards);
      user.cash += securityResult.net;

      saveDatabase();

      const incidentMessage = !securityResult.incidentAttempted
        ? "🛡️ No security incident."
        : securityResult.incidentLoss > 0
          ? `🚨 A simulated break-in cost ${money(securityResult.incidentLoss)}.`
          : "🛡️ Your guards stopped a simulated break-in.";

      return interaction.reply({
        content:
`🏢 **Business earnings collected!**

Gross earnings: **${money(securityResult.gross)}**
Security incident: ${incidentMessage}
Guard payroll: **${money(securityResult.payroll)}**
Net received: **${money(securityResult.net)}**

CEO: **${interaction.user.username}**`
      });
    }
  }

  if (command === "security") {
    const sub = interaction.options.getSubcommand();
    const guardCount = Math.min(MAX_SECURITY_GUARDS, Math.floor(Number(user.securityGuards) || 0));
    const incidentChance = Math.max(0.05, 0.25 - guardCount * 0.04);
    const incidentLossRate = Math.max(0, 0.4 - guardCount * 0.08);

    if (sub === "view") {
      const businessCount = user.businesses.filter(id => db.businesses[id]).length;
      return interaction.reply({
        content: `🛡️ **Valley AI Security**

NPC guards hired: **${guardCount}/${MAX_SECURITY_GUARDS}**
Businesses covered: **${businessCount}**
Hire cost: **${money(SECURITY_GUARD_PRICE)} per guard**
Payroll: **${money(SECURITY_GUARD_WAGE)} per guard collection**
Current incident chance: **${Math.round(incidentChance * 100)}%**
Potential loss if an incident hits: **${Math.round(incidentLossRate * 100)}% of that collection**

Each guard reduces incident chance and impact. Guards use fixed in-game rules; no external AI service is contacted. Use \`/security hire\` or \`/security dismiss\`.`
      });
    }

    if (sub === "hire") {
      if (!user.businesses.some(id => db.businesses[id])) {
        return interaction.reply({
          content: "Start a business with `/business create` before hiring security."
        });
      }
      if (guardCount >= MAX_SECURITY_GUARDS) {
        return interaction.reply({
          content: `Your business team already has the maximum ${MAX_SECURITY_GUARDS} guards.`
        });
      }
      if (user.cash < SECURITY_GUARD_PRICE) {
        return interaction.reply({
          content: `❌ Hiring costs ${money(SECURITY_GUARD_PRICE)}. Your cash: ${money(user.cash)}.`
        });
      }

      user.cash -= SECURITY_GUARD_PRICE;
      user.securityGuards = guardCount + 1;
      saveDatabase();
      return interaction.reply({
        content: `✅ Hired an AI security guard for **${money(SECURITY_GUARD_PRICE)}**.

Team: **${user.securityGuards}/${MAX_SECURITY_GUARDS}**
Payroll: **${money(SECURITY_GUARD_WAGE)} per business collection**
Coverage now cuts simulated incident risk and loss. See \`/security view\` for exact rates.`
      });
    }

    if (sub === "dismiss") {
      if (!guardCount) {
        return interaction.reply({ content: "You do not have any guards to dismiss." });
      }

      user.securityGuards = guardCount - 1;
      saveDatabase();
      return interaction.reply({
        content: `Dismissed one guard. You now have **${user.securityGuards}/${MAX_SECURITY_GUARDS}** guards. The hiring cost is not refunded.`
      });
    }
  }

  if (command === "sports") {
    const sub = interaction.options.getSubcommand();

    if (sub === "board") {
      const matchups = Object.values(SPORTS)
        .map(sport => `${sport.emoji} **${sport.label}**\n${sport.home} vs ${sport.away}`)
        .join("\n\n");
      return interaction.reply({
        content: `🏟️ **Valley League · Fictional matchups**

${matchups}

Choose a matchup from the quick-action menu to watch an animated play, or use \`/sports bet\`. Winning picks pay **2× the stake** in Valley cash. No real teams, real events, or real-money betting.`
      });
    }

    if (sub === "bet") {
      const sportId = interaction.options.getString("sport");
      const side = interaction.options.getString("side");
      const amount = interaction.options.getInteger("amount");
      const sport = SPORTS[sportId];
      if (!sport || !["home", "away"].includes(side)) {
        return interaction.reply({ content: "Choose a valid fictional matchup and team." });
      }
      if (!Number.isSafeInteger(amount) || amount < 1) {
        return interaction.reply({ content: "Enter a whole-number wager greater than zero." });
      }
      if (user.cash < amount) {
        return interaction.reply({
          content: `❌ Your cash is ${money(user.cash)}; you cannot wager ${money(amount)}.`
        });
      }

      const winningSide = Math.random() < 0.5 ? "home" : "away";
      const result = resolveSportsBet(amount, side, winningSide);
      user.cash += result.netChange;
      user.sportsStats.bets += 1;
      user.sportsStats[result.won ? "wins" : "losses"] += 1;
      user.sportsStats.net += result.netChange;

      let homeScore;
      let awayScore;
      if (sportId === "basketball") {
        homeScore = 78 + Math.floor(Math.random() * 35);
        awayScore = 78 + Math.floor(Math.random() * 35);
      } else if (sportId === "soccer") {
        homeScore = Math.floor(Math.random() * 4);
        awayScore = Math.floor(Math.random() * 4);
      } else {
        homeScore = 10 + Math.floor(Math.random() * 35);
        awayScore = 10 + Math.floor(Math.random() * 35);
      }
      if (winningSide === "home" && homeScore <= awayScore) homeScore = awayScore + 1;
      if (winningSide === "away" && awayScore <= homeScore) awayScore = homeScore + 1;

      user.lastSportsResult = { sportId, winningSide, homeScore, awayScore, playedAt: Date.now() };
      saveDatabase();

      const filename = sport.image;
      const sportsClip = new AttachmentBuilder(
        path.join(ASSET_DIR, "sports", filename),
        { name: filename }
      );
      const winnerName = winningSide === "home" ? sport.home : sport.away;
      const pickedName = side === "home" ? sport.home : sport.away;
      const payoutLine = result.won
        ? `✅ Your pick won. Gross payout: **${money(result.payout)}** (2× stake).`
        : `❌ Your pick lost. The **${money(amount)}** stake is gone.`;

      return interaction.reply({
        content: `🎬 **${sport.label} · Simulated final**

🏠 ${sport.home} **${homeScore}** — **${awayScore}** ${sport.away} ✈️
Winner: **${winnerName}**
Your pick: **${pickedName}** · Stake: **${money(amount)}**
${payoutLine}

Net result: **${result.netChange >= 0 ? "+" : ""}${money(result.netChange)}**
New cash balance: **${money(user.cash)}**

This is a fictional animation and random in-game outcome, not live sports data.`,
        files: [sportsClip],
        media: [{
          url: `attachment://${filename}`,
          description: `Animated fictional ${sport.label} play`
        }]
      });
    }
  }

  // ====================================================
  // LEADERBOARD
  // ====================================================

  if (command === "leaderboard") {
    const category = interaction.options.getString("category") || "wealth";
    const users = Object.entries(db.users).map(([id, record]) =>
      createUser(id, record.username || record.name)
    );

    if (category === "celebrity_sessions") {
      const ranked = users
        .filter(player => player.celebritySessions.snoop > 0)
        .sort((a, b) => b.celebritySessions.snoop - a.celebritySessions.snoop)
        .slice(0, 10);
      const list = ranked
        .map((player, index) =>
          `**${index + 1}.** ${safeProfileText(player.username, 60)} — ${player.celebritySessions.snoop} sessions`
        )
        .join("\n");

      return interaction.reply({
        content: `🎤 **FICTIONAL SNOOP CAMEO SESSION LEADERBOARD**\n\n${list || "No cameo sessions recorded yet. Use `/smoke` and choose the fictional Snoop Dogg cameo option."}`
      });
    }

    const ranked = users
      .sort((a, b) => (b.cash + b.bank) - (a.cash + a.bank))
      .slice(0, 10);
    const list = ranked
      .map((player, index) =>
        `**${index + 1}.** ${safeProfileText(player.username, 60)} — ${money(player.cash + player.bank)}`
      )
      .join("\n");

    return interaction.reply({
      content: `🏆 **STONER VALLEY WEALTH LEADERBOARD**\n\n${list || "No members yet."}`
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

}

if (require.main === module) {
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

  client.login(TOKEN).catch(error => {
    console.error("Discord login failed. Check the DISCORD_TOKEN secret.", error.message);
    process.exit(1);
  });
}

module.exports = { commands, PRODUCTS, SPORTS };