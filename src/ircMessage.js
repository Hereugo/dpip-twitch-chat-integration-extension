/**
 * Represents a parsed IRC message according to the IRCv3 protocol specification.
 */
export default class IRCMessage {
    /**
     * The IRC command (e.g., PRIVMSG, JOIN).
     * @type {string}
     */
    command = '';

    /**
     * The prefix of the message, typically including nickname, user, and host.
     * @type {{nickname?: string, user?: string, host?: string}}
     */
    prefix = {};

    /**
     * The parsed IRCv3 tags with unescaped values.
     * @type {Object.<string, string>}
     */
    tags = {};

    /**
     * The raw IRCv3 tags as received (before unescaping).
     * @type {Object.<string, string>}
     */
    rawTags = {};

    /**
     * The message parameters, such as channel name and message text.
     * @type {string[]}
     */
    params = [];

    /**
     * Unescapes IRCv3 tag values by converting escape sequences to characters.
     *
     * @private
     * @param {string} str - The string to unescape.
     * @returns {string} - The unescaped string.
     */
    static _unescapeIRC(str) {
        const esc2unesc = {
            '\\:': ';',
            '\\s': ' ',
            '\\\\': '\\',
            '\\r': '\r',
            '\\n': '\n',
        };

        return str.replace(/\\[snr\:\\]/g, (match) => esc2unesc[match]);
    }

    /**
     * Parses and unescapes a tag key-value pair.
     *
     * @private
     * @param {string} rawKey - The raw (escaped) tag key.
     * @param {string} [rawValue=''] - The raw (escaped) tag value.
     * @returns {{unescapedKey: string, unescapedValue: string}} - The unescaped key-value pair.
     */
    static _parseTag(rawKey, rawValue = '') {
        const unescapedKey = IRCMessage._unescapeIRC(rawKey);
        const unescapedValue = IRCMessage._unescapeIRC(rawValue);
        return { unescapedKey, unescapedValue };
    }

    /**
     * Parses a raw IRC message into a structured IRCMessage object.
     *
     * @param {string} message - The raw IRC message to parse.
     * @returns {IRCMessage} - The parsed IRCMessage instance.
     */
    static parse(message) {
        let newIRCMessage = new IRCMessage();
        let offset = 0;

        const currentChar = (c, start = offset) => message[start] === c;
        const getNextSpace = () => {
            let index = message.indexOf(' ', offset);
            return index === -1 ? message.length : index;
        };

        // Parse tags
        if (currentChar('@')) {
            const tagsEnd = getNextSpace();
            const tagsRaw = message.slice(offset + 1, tagsEnd);

            tagsRaw.split(';').forEach((tagStr) => {
                const [rawKey, rawValue = ''] = tagStr.split('=');
                const { unescapedKey, unescapedValue } = IRCMessage._parseTag(
                    rawKey,
                    rawValue
                );
                newIRCMessage.rawTags[rawKey] = rawValue;
                newIRCMessage.tags[unescapedKey] = unescapedValue;
            });

            offset = tagsEnd + 1;
        }

        // Parse prefix
        if (currentChar(':')) {
            const prefixEnd = getNextSpace();
            const prefixRaw = message.slice(offset + 1, prefixEnd);
            let nickname, user, host;

            if (prefixRaw.includes('!')) {
                let userHost;
                [nickname, userHost] = prefixRaw.split('!');
                [user, host] = userHost.includes('@')
                    ? userHost.split('@')
                    : [userHost, undefined];
            } else if (prefixRaw.includes('@')) {
                [user, host] = prefixRaw.split('@');
            } else {
                host = prefixRaw;
            }

            newIRCMessage.prefix.nickname = nickname;
            newIRCMessage.prefix.user = user;
            newIRCMessage.prefix.host = host;

            offset = prefixEnd + 1;
        }

        // Parse command
        const commandEnd = getNextSpace();
        newIRCMessage.command = message.slice(offset, commandEnd);
        offset = commandEnd + 1;

        // Parse parameters
        while (offset < message.length) {
            if (currentChar(':')) {
                newIRCMessage.params.push(message.slice(offset + 1));
                break;
            }
            const nextSpace = getNextSpace();
            newIRCMessage.params.push(message.slice(offset, nextSpace));
            offset = nextSpace + 1;
        }

        return newIRCMessage;
    }

    /**
     * Serializes the IRCMessage instance to a JSON object.
     *
     * @returns {{command: string, prefix: Object, tags: Object, rawTags: Object, params: string[]}} - JSON representation of the message.
     */
    toJSON() {
        return {
            command: this.command,
            prefix: this.prefix,
            tags: this.tags,
            rawTags: this.rawTags,
            params: this.params,
        };
    }

    /**
     * Creates an IRCMessage instance from a JSON representation.
     *
     * @param {{command: string, prefix: Object, tags: Object, rawTags: Object, params: string[]}} json - The JSON object representing the IRC message.
     * @returns {IRCMessage} - The reconstructed IRCMessage instance.
     */
    static fromJSON(json) {
        const message = new IRCMessage();
        message.command = json.command;
        message.prefix = json.prefix || {};
        message.tags = json.tags || {};
        message.rawTags = json.rawTags || {};
        message.params = json.params || [];
        return message;
    }
}
