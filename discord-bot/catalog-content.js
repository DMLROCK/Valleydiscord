"use strict";

const PRODUCT_DESCRIPTIONS = {
  flower_1g: "A single-gram pick for trying a new Valley flower. Small-batch, aromatic, and easy to carry.",
  flower_3_5g: "A classic eighth-sized pouch with a balanced everyday quantity and a fresh botanical aroma.",
  flower_7g: "A generous half-quarter jar with a smooth, even grind and a bright greenhouse finish.",
  flower_14g: "A half-ounce reserve for players stocking up on a favorite Valley flower.",
  flower_28g: "A full-ounce jar for the serious collector. The largest flower option on the Valley shelf.",
  cart_1g: "A full-size 510 cartridge with a clean, compact profile for your in-game setup.",
  cart_half: "A pocket-size 0.5g 510 cartridge with a quick, convenient format.",
  gummy_10: "Ten fruit-forward gummies in a resealable pouch, with a bright citrus-and-berry flavor profile.",
  chocolate: "A rich chocolate bar broken into neat squares, wrapped for a tidy dispensary-counter display.",
  fruit_chews: "A ten-piece pack of soft fruit chews with a colorful mixed-fruit selection.",
  mints: "A twenty-count mint tin with a cool, crisp finish and a pocket-friendly shape.",
  basic_bong: "A straightforward clear-glass water pipe with a sturdy base and an easy-clean design.",
  beaker_bong: "A classic beaker profile with a wide, stable base and a roomy chamber.",
  straight_bong: "A tall straight-tube glass piece with a clean silhouette and a generous chamber.",
  bic: "A familiar pocket lighter in a bright, easy-to-spot finish.",
  clipper: "A refillable rounded lighter with a reusable flint system and a smooth grip.",
  torch: "A refillable torch lighter with a steady, focused flame for in-game glass accessories.",
  battery_basic: "A compact 510 battery with a simple one-button setup.",
  battery_variable: "A variable-voltage 510 battery with adjustable settings and a small status display.",
  energy: "A chilled citrus energy drink with a crisp, bright flavor.",
  soda: "A fizzy Valley soda with a refreshing citrus note.",
  water: "Clean, cool bottled water for a quick refresh."
};

const SPORTS = {
  basketball: {
    label: "Valley Hoops",
    emoji: "🏀",
    home: "Emerald Owls",
    away: "Copper City Comets",
    description: "A fast fictional indoor-court matchup. Pick the home side or the visitors.",
    image: "basketball.gif"
  },
  soccer: {
    label: "Valley Cup",
    emoji: "⚽",
    home: "Northside Ferns",
    away: "Lakeshore United",
    description: "A fictional night-match with two evenly matched Valley clubs.",
    image: "soccer.gif"
  },
  football: {
    label: "Valley Gridiron",
    emoji: "🏈",
    home: "River City Rockets",
    away: "Highland Bears",
    description: "A fictional gridiron matchup under the Valley lights.",
    image: "football.gif"
  }
};

const CHARACTER_GENDERS = [
  { name: "Woman", value: "woman" },
  { name: "Man", value: "man" },
  { name: "Non-binary", value: "nonbinary" },
  { name: "Self-described", value: "self-described" }
];

const CHARACTER_STYLES = [
  { name: "Classic", value: "classic" },
  { name: "Streetwear", value: "streetwear" },
  { name: "Skater", value: "skater" },
  { name: "Greenhouse", value: "greenhouse" }
];

function productEmoji(category) {
  return {
    flower: "🌿",
    cart: "🛒",
    edible: "🍬",
    bong: "💨",
    lighter: "🔥",
    battery: "🔋",
    drink: "🥤"
  }[category] || "🛍️";
}

module.exports = {
  CHARACTER_GENDERS,
  CHARACTER_STYLES,
  PRODUCT_DESCRIPTIONS,
  SPORTS,
  productEmoji
};