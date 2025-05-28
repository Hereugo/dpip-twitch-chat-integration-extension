/**
 * Parses a URL hash string into a URLSearchParams object.
 *
 * This function removes the leading '#' character if present and returns
 * a URLSearchParams instance for easy access to the key-value pairs.
 *
 * @param {string} hash - The URL hash string (e.g., "#access_token=abc&state=xyz").
 * @returns {URLSearchParams} A URLSearchParams object representing the parsed hash parameters.
 *
 * @example
 * const params = getHashParams("#access_token=abc&state=xyz");
 * const token = params.get("access_token"); // "abc"
 */

function findLargestPlayingVideo() {
    const videos = Array.from(document.querySelectorAll('video'))
        .filter((video) => video.readyState != 0)
        .filter((video) => video.disablePictureInPicture == false)
        .sort((v1, v2) => {
            const v1Rect = v1.getClientRects()[0] || {
                width: 0,
                height: 0,
            };
            const v2Rect = v2.getClientRects()[0] || {
                width: 0,
                height: 0,
            };
            return v2Rect.width * v2Rect.height - v1Rect.width * v1Rect.height;
        });
    if (videos.length === 0) {
        return;
    }
    return videos[0];
}

/**
 * A simple Publish/Subscribe (Pub/Sub) implementation with support for one-time subscriptions.
 */
class PublishSubscribeTemplate {
    /**
     * Maps event names to arrays of subscriber objects.
     * @type {Object<string, Array<{ callback: Function, once: boolean }>>}
     */
    subscribers = {};

    /**
     * Subscribes a callback function to a specific event.
     *
     * @param {string} event - The name of the event to subscribe to.
     * @param {Function} callback - The callback function to invoke when the event is emitted.
     * @param {Object} [options={}] - Optional settings for the subscription.
     * @param {boolean} [options.once=false] - Whether the callback should be triggered only once.
     */
    subscribe(event, callback, options = {}) {
        const { once = false } = options;

        if (!this.subscribers[event]) {
            this.subscribers[event] = [];
        }

        this.subscribers[event].push({ callback, once });
    }

    /**
     * Unsubscribes a previously registered callback from a specific event.
     *
     * @param {string} event - The name of the event to unsubscribe from.
     * @param {Function} callback - The callback function to remove from the list of subscribers.
     */
    unsubscribe(event, callback) {
        if (!this.subscribers[event]) return;

        this.subscribers[event] = this.subscribers[event].filter(
            (subscriber) => subscriber.callback !== callback
        );
    }

    /**
     * Emits an event, invoking all subscribed callbacks with the provided data.
     * One-time subscribers are automatically removed after invocation.
     *
     * @param {string} event - The name of the event to emit.
     * @param {*} data - The data to pass to each callback function.
     */
    emit(event, data) {
        if (!this.subscribers[event]) return;

        this.subscribers[event].forEach((subscriber) => {
            subscriber.callback(data);
        });

        // Remove one-time listeners
        this.subscribers[event] = this.subscribers[event].filter(
            (subscriber) => !subscriber.once
        );
    }
}

/**
 * Represents a parsed IRC message according to the IRCv3 protocol specification.
 */
class IRCMessage {
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

/** @typedef {import('./types.js').CommandType} CommandType */
/** @typedef {import('./types.js').Message} Message */

class ContentInterface extends PublishSubscribeTemplate {
    isChromeConnected = false;
    isTwitchConnected = false;

    constructor() {
        super();
        navigator.mediaSession.setActionHandler(
            'enterpictureinpicture',
            this.onEnterPIP.bind(this)
        );
    }

    /**
     *
     */
    async onEnterPIP() {
        const videoElement = findLargestPlayingVideo();
        if (!videoElement) {
            return;
        }
        await videoElement.requestPictureInPicture();

        videoElement.addEventListener('leavepictureinpicture', (e) =>
            this.postChromeMessage('CFIN')
        );

        this.connect();
    }

    connect() {
        console.log('CONTENT: ', 'Connecting to worker');

        this.isChromeConnected = true;
        this.chromePort = chrome.runtime.connect({ name: 'content-client' });

        // Initial message that indicates that we've entered a picture in picture mode.
        this.postChromeMessage('CSYN', { channel: 'littlegremliin' });

        this.chromePort.onMessage.addListener(this.onMessage.bind(this));
        this.chromePort.onDisconnect.addListener(this.onDisconnect.bind(this));
    }

    /**
     * post a message
     * @param {CommandType} command [description]
     * @param {Object} payload [description]
     */
    postChromeMessage(command, payload = {}) {
        console.assert(this.isChromeConnected === true);
        this.chromePort.postMessage({
            command: command,
            payload: payload,
        });
    }

    /**
     * handle on port disconnect
     * @param {chrome.runtime.Port} e [description]
     */
    onDisconnect(e) {
        this.isChromeConnected = false;

        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
        }
    }

    /**
     * handle on message
     * @param {Message} message [received message from worker]
     */
    onMessage(message) {
        console.log('CONTENT: ', message);
        this.emit(message.command, message);
        switch (message.command) {
            case 'CACK':
                return this.handleCACK(message);
            case 'CFIN':
                return this.handleCFIN(message);
            case 'TIRC':
                return this.handleTIRC(message);
            case 'TCON':
                return this.handleTCON(message);
            case 'TFIN':
                return this.handleTFIN(message);
            case 'TERR':
                break;
            default: {
                console.error('Unknown command: ' + message.command, message);
                break;
            }
        }
    }

    /**
     * handle IRC message
     * @param {Message} message [received message after SYN]
     */
    handleTCON(message) {
        this.isTwitchConnected = true;
        console.log('CONTENT ', 'Twitch connection has been established');
    }

    /**
     * handle IRC message
     * @param {Message} message [received message after SYN]
     */
    handleTFIN(message) {
        this.isTwitchConnected = false;

        console.log('CONTENT ', 'Twitch connection was stopped');
    }

    /**
     * handle IRC message
     * @param {Message} message [received message after SYN]
     */
    handleTIRC(message) {
        const ircMessage = IRCMessage.fromJSON(message.payload);

        console.log('CONTENT ', message);
        console.log('CONTENT ', ircMessage);
    }

    /**
     * handle CACK message response
     * @param {Message} message [received message after SYN]
     */
    handleCACK(message) {}

    /**
     * handle CFIN message response
     * @param {Message} message [received message after SYN]
     */
    handleCFIN(message) {
        this.isChromeConnected = false;
        this.chromePort.disconnect();
        console.log('CONTENT ', 'chrome port disconnected');
    }
}

if (!('pictureInPictureEnabled' in document)) {
    alert('The Picture-in-Picture Web API is not available.');
} else if (!document.pictureInPictureEnabled) {
    alert('The Picture-in-Picture Web API is disabled.');
} else {
    console.log('Content script bootup!');
    new ContentInterface();
}
