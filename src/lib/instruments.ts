/** Tradable instruments offered across the app (Operações pair picker). */

export const FOREX_MAJORS = [
  "EUR/USD",
  "USD/JPY",
  "GBP/USD",
  "USD/CHF",
  "USD/CAD",
  "AUD/USD",
  "NZD/USD",
];

export const FOREX_MINORS = [
  "EUR/GBP",
  "EUR/JPY",
  "EUR/CHF",
  "EUR/AUD",
  "EUR/CAD",
  "EUR/NZD",
  "GBP/JPY",
  "GBP/CHF",
  "GBP/AUD",
  "GBP/CAD",
  "GBP/NZD",
  "AUD/JPY",
  "AUD/CHF",
  "AUD/CAD",
  "AUD/NZD",
  "CAD/JPY",
  "CAD/CHF",
  "CHF/JPY",
  "NZD/JPY",
  "NZD/CAD",
  "NZD/CHF",
];

export const FOREX_EXOTICS = [
  "USD/TRY",
  "USD/ZAR",
  "USD/MXN",
  "USD/SEK",
  "USD/NOK",
  "USD/DKK",
  "USD/PLN",
  "USD/HUF",
  "USD/CZK",
  "USD/SGD",
  "USD/HKD",
  "USD/CNH",
  "EUR/TRY",
  "EUR/ZAR",
  "EUR/SEK",
  "EUR/NOK",
  "EUR/PLN",
  "GBP/TRY",
  "GBP/ZAR",
  "GBP/SEK",
];

export const FOREX_PAIRS = [...FOREX_MAJORS, ...FOREX_MINORS, ...FOREX_EXOTICS];

export const INDEX_INSTRUMENTS = [
  "US30",
  "NAS100",
  "SPX500",
  "US2000",
  "GER40",
  "UK100",
  "FRA40",
  "ESP35",
  "EU50",
  "NL25",
  "JPN225",
  "AUS200",
  "HK50",
  "CHINA50",
  "SWI20",
];

export const METAL_INSTRUMENTS = [
  "XAU/USD",
  "XAUEUR",
  "XAG/USD",
  "ALUMINIUM",
  "COPPER",
  "NICKEL",
  "PLATINUM",
];

export const ENERGY_INSTRUMENTS = ["BRENT", "XTIUSD", "NAT.GAS"];

export const AGRICULTURE_INSTRUMENTS = [
  "COCOA",
  "COFFEE",
  "CORN",
  "SUGAR.L",
  "WHEAT",
];

export const CRYPTO_INSTRUMENTS = ["BTC/USD", "ETH/USD"];

export interface InstrumentGroup {
  label: string;
  options: string[];
}

/** Grouped for a <select> with <optgroup>. */
export const INSTRUMENT_GROUPS: InstrumentGroup[] = [
  { label: "Forex", options: FOREX_PAIRS },
  { label: "Índices", options: INDEX_INSTRUMENTS },
  { label: "Metais", options: METAL_INSTRUMENTS },
  { label: "Energia", options: ENERGY_INSTRUMENTS },
  { label: "Agrícolas", options: AGRICULTURE_INSTRUMENTS },
  { label: "Cripto", options: CRYPTO_INSTRUMENTS },
];
