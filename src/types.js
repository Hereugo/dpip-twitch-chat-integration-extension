/**
 * @typedef { "TCON" | "TIRC" | "TFIN" | "TERR" } TwitchCommandType
 * @typedef { "CSYN" | "CACK" | "CFIN" } ChromeCommandType
 * @typedef { "CSYN" | "CACK" | "CFIN" | "TCON" | "TIRC" | "TFIN" | "TERR" } CommandType
 */

/**
 * @typedef {Object} Message
 * @property {CommandType} command
 * @property {Object} payload
 */

// Export something to make this an ESM module
export {};
