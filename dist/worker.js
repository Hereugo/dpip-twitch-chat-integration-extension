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
function getHashParams(hash) {
    return new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
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

class WorkerInterfacer extends PublishSubscribeTemplate {
    /** @type {WebSocket} */
    socket = null;
    clientId = 'znac5nmb20lcql1osiepyv43yuibo2';
    redirectUri = chrome.identity.getRedirectURL('twitch');
    scope = 'chat:read';

    /** @type {chrome.runtime.Port} */
    chromePort = null;

    isChromeConnected = false;
    isTwitchConnected = false;

    constructor() {
        super();

        chrome.runtime.onConnect.addListener(this.onChromeConnect.bind(this));
    }

    /**
     * @param {chrome.runtime.Port} port [description]
     */
    onChromeConnect(port) {
        console.log('worker connected to content ' + port.name);
        this.isChromeConnected = true;

        // only one connection per chrome client is allowed for this extension to work
        console.assert(this.chromePort === null);
        this.chromePort = port;

        this.chromePort.onMessage.addListener(this.onChromeMessage.bind(this));
        this.chromePort.onDisconnect.addListener(
            this.onChromeDisconnect.bind(this)
        );
    }

    /**
     * @param {chrome.runtime.Port} e
     */
    onChromeDisconnect(e) {
        this.isChromeConnected = false;
        this.chromePort = null;

        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
        }
    }

    /**
     * @param {Message} message
     */
    onChromeMessage(message) {
        console.log('CHROME MESSAGE: ', message);

        this.emit(message.command);
        switch (message.command) {
            case 'CSYN':
                return this.handleChromeCSYN(message);
            case 'CFIN':
                return this.handleChromeCFIN(message);
        }
    }

    /**
     * @param {CommandType} command [description]
     * @param {Object} payload [description]
     */
    async postChromeMessage(command, payload) {
        console.assert(this.isChromeConnected === true);
        this.chromePort.postMessage({
            command: command,
            payload: payload,
        });
    }

    /**
     * @param {Message} message
     */
    handleChromeCSYN(message) {
        console.assert(
            this.socket === null || this.socket.readyState === WebSocket.CLOSED
        );

        this.channel = message.payload.channel;

        // subscribe to an event when connection with twitch has been successfully established
        // TODO: I believe there should be an event for state when connection was wrong
        this.subscribe(
            'GLOBALUSERSTATE',
            this.twitchConnectedCallback.bind(this),
            {
                once: true,
            }
        );
        this.connectTwitch();

        this.postChromeMessage('CACK');
    }

    /**
     * [handle closing socket session when chrome client has closed pip view]
     *
     * @param{Message} message
     */
    handleChromeCFIN(message) {
        console.assert(
            this.socket != null && this.socket.readyState === WebSocket.OPEN
        );

        this.closeTwitch();

        this.postChromeMessage('CFIN');
    }

    /**
     * Establish a connection between service worker and Twitch IRC
     */
    connectTwitch() {
        this.socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
        this.socket.addEventListener('open', this.onSocketOpen.bind(this));
        this.socket.addEventListener('close', this.onSocketClose.bind(this));
        this.socket.addEventListener(
            'message',
            this.onSocketMessage.bind(this)
        );
        this.socket.addEventListener('error', this.onSocketError.bind(this));
    }

    /**
     * @param {IRCMessage} ircMessage [description]
     */
    twitchConnectedCallback(ircMessage) {
        console.log('Successfully connected to twich with client ', ircMessage);

        this.isTwitchConnected = true;
        this.postChromeMessage('TCON');

        // Forward all chat messages to chrome client
        this.subscribe('PRIVMSG', (irc) =>
            this.postChromeMessage('TIRC', irc.toJSON())
        );

        this.join();
    }

    /**
     * Close connection between service worker and Twitch IRC
     */
    closeTwitch() {
        this.isTwitchConnected = false;
        this.socket.close();

        this.postChromeMessage('TFIN');
    }

    oauth() {
        let authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
        const state = crypto.randomUUID();

        authUrl.searchParams.append('response_type', 'token');
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        authUrl.searchParams.append('scope', this.scope);
        authUrl.searchParams.append('state', state);

        // store generate state
        chrome.storage.local.set({ oauth_state: state });

        return chrome.identity.launchWebAuthFlow({
            url: authUrl.toString(),
            interactive: true,
        });
    }

    /**
     * @param {MessageEvent} e [description]
     */
    onSocketMessage(e) {
        const delimiter = '\r\n';
        e.data
            .trim()
            .split(delimiter)
            .forEach((line) => this.onIRCMessage(IRCMessage.parse(line)));
    }

    /**
     * @param {CloseEvent} e [description]
     */
    onSocketClose(e) {}

    /**
     * @param {Event} e [description]
     */
    async onSocketOpen(e) {
        const responseURL = await this.oauth();
        const url = new URL(responseURL);
        const responseParams = getHashParams(url.hash);

        const state = responseParams.get('state');
        const error = responseParams.get('error');
        const errorDescription = responseParams.get('error_description');

        if (error) {
            throw new Error(
                `Authentication Error (${error}): ${errorDescription}`
            );
        }

        chrome.storage.local.get('oauth_state', async ({ oauth_state }) => {
            await chrome.storage.local.remove('oauth_state');

            if (!oauth_state || oauth_state !== state) {
                console.warn('Stored state:', oauth_state);
                console.warn('Returned state:', state);
                throw new Error(
                    'Security Error: Invalid state parameter. Possible CSRF attack.'
                );
            }

            const accessToken = responseParams.get('access_token');

            if (!accessToken) {
                throw new Error('Missing access token in OAuth response.');
            }

            this.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
            this.send(`PASS oauth:${accessToken}`);
            this.send('NICK hereugo');
        });
    }

    /**
     * @param {Event} e [description]
     */
    onSocketError(e) {
        console.error(e);
    }

    /**
     * @param {string} message [Send a IRC message to twitch]
     */
    send(message) {
        console.assert(
            this.socket != null &&
                this.socket.readyState === WebSocket.OPEN &&
                this.isTwitchConnected === true
        );
        this.socket.send(message);
    }

    /**
     * @param {IRCMessage} ircMessage
     */
    onIRCMessage(ircMessage) {
        console.log('TWITCH: ', ircMessage);
        this.emit(ircMessage.command, ircMessage);
        switch (ircMessage.command) {
            case 'PING':
                return this.handlePING(ircMessage);
            case 'NOTICE':
                return this.handleNOTICE(ircMessage);
            case 'RECONNECT':
                return this.handleRECONNECT(ircMessage);
        }
    }

    /**
     * @param {IRCMessage} ircMessage [description]
     */
    handlePING(ircMessage) {
        this.send(`PONG :tmi.twitch.tv`);
    }

    /**
     * @param {IRCMessage} ircMessage [description]
     */
    async handleNOTICE(ircMessage) {
        const msgId = ircMessage.tags['msg-id'];
        if (msgId !== null) {
            console.error('Error: ' + msgId, ircMessage.params[1]);
            this.postChromeMessage('TERR', {
                reason: msgId,
                description: ircMessage.params[1],
            });
        }
    }

    /**
     * @param {IRCMessage} ircMessage [description]
     */
    handleRECONNECT(ircMessage) {}

    join() {
        this.send(`JOIN #${this.channel}`);
    }
}

console.log('Worker bootup!');
new WorkerInterfacer();
