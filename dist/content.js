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

class PIPWindowManager extends PublishSubscribeTemplate {
    mediaSession = navigator.mediaSession;

    pipWindow = null;
    videoElement = null;

    options = {
        width: 480,
        height: 300,
        preferInitialWindowPlacement: true,
    };

    /**
     * Minimum px required for chat container to show
     */
    MIN_SPACE = 200;

    constructor() {
        super();

        this.mediaSession.setActionHandler(
            'enterpictureinpicture',
            this.onEnterPIP.bind(this)
        );
    }

    /**
     *
     */
    async onEnterPIP() {
        this.videoElement = findLargestPlayingVideo();
        if (!this.videoElement) {
            return;
        }
        this.videoElement.playsInline = false;
        this.videoElement.webkitPlaysInline = false; // This is a property on some WebKit browsers

        this.originalParent = this.videoElement.parentNode;

        this.pipWindow = await documentPictureInPicture.requestWindow(
            this.options
        );

        this.pipWindow.document.body.insertAdjacentHTML(
            'afterbegin',
            PIP_WINDOW_HTML
        );
        this.wrapper = this.pipWindow.document.querySelector('.dpip__wrapper');
        this.container =
            this.pipWindow.document.getElementById('dpip__container');
        this.chat = this.pipWindow.document.getElementById('dpip__chat');

        this.wrapper.prepend(this.videoElement);

        this.copyAllStylesheets();

        this.videoElement.addEventListener(
            'loadedmetadata',
            this.updateLayout.bind(this)
        );
        this.pipWindow.addEventListener('resize', this.updateLayout.bind(this));

        this.emit('enterpictureinpicture');
    }

    copyAllStylesheets() {
        // Copy all style sheets.
        [...document.styleSheets].forEach((styleSheet) => {
            try {
                const cssRules = [...styleSheet.cssRules]
                    .map((rule) => rule.cssText)
                    .join('');
                const style = document.createElement('style');

                style.textContent = cssRules;
                this.pipWindow.document.head.appendChild(style);
            } catch (e) {
                const link = document.createElement('link');

                link.rel = 'stylesheet';
                link.type = styleSheet.type;
                link.media = styleSheet.media;
                link.href = styleSheet.href;
                this.pipWindow.document.head.appendChild(link);
            }
        });
    }

    /**
     * dynamically determine and adjust video size based on current window size.
     */
    updateLayout() {
        const windowWidth = this.pipWindow.innerWidth;
        const windowHeight = this.pipWindow.innerHeight;
        const videoAspect =
            this.videoElement.videoWidth / this.videoElement.videoHeight;

        const windowAspect = windowWidth / windowHeight;

        let videoWidth, videoHeight;

        if (windowAspect > videoAspect) {
            // Fit by height
            videoHeight = windowHeight;
            videoWidth = videoHeight * videoAspect;
            this.wrapper.style.flexDirection = 'row';
            const leftoverWidth = windowWidth - videoWidth;
            if (leftoverWidth < this.MIN_SPACE) {
                this.container.style.display = 'none';
            } else {
                this.container.style.display = 'flex';
            }
        } else {
            // Fit by width
            videoWidth = windowWidth;
            videoHeight = videoWidth / videoAspect;
            this.wrapper.style.flexDirection = 'column';
            const leftoverHeight = windowHeight - videoHeight;
            if (leftoverHeight < this.MIN_SPACE) {
                this.container.style.display = 'none';
            } else {
                this.container.style.display = 'flex';
            }
        }
    }

    /**
     * create a new element when an ircMessage has arrived.
     * @param {IRCMessage} ircMessage
     */
    addMessage(ircMessage) {
        const template = this.pipWindow.document.getElementById(
            'dpip__message_template'
        );
        const clone = template.content.cloneNode(true);

        clone.querySelector('.dpip__message_username').textContent =
            ircMessage.tags['display-name'];
        clone.querySelector('.dpip__message_body').textContent =
            ircMessage.params[1];
        clone.querySelector('.dpip__message_timestamp').textContent =
            new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });

        clone.querySelector('.dpip__message_username').style.color =
            ircMessage.tags['color'];

        this.chat.appendChild(clone);

        this.chat.scrollTop = this.chat.scrollHeight;
    }
}

const PIP_WINDOW_HTML = `
    <style>
        @media all and (display-mode: picture-in-picture) {
            /* Reset and Base */
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            html {
                font-size: 62.5%;
                font-weight: var(--font-weight-normal);
                text-size-adjust: 100%;
                line-height: var(--line-height-body);
            }

            body {
                margin: 0;
                padding: 0;
                height: 100%;
                width: 100%;
                background: var(--color-background-body);
                color: var(--color-text-base);
                font-family: var(--font-base);
                overflow: hidden;
                line-height: var(--line-height-body);
            }

            /* Wrapper */
            .dpip__wrapper {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                width: 100%;
                flex-direction: row;
            }

            .dpip__wrapper video {
                max-width: 100%;
                max-height: 100%;
                width: auto;
                height: auto;
                background: inherit;
                flex-shrink: 0;
                border: var(--border-width-default) solid var(--color-border-base);
                border-radius: var(--border-radius-medium);
            }

            /* Container */
            .dpip__container {
                background: var(--color-background-body-alt);
                color: inherit;
                display: flex;
                overflow: auto;
                flex-grow: 1;
                min-width: 0;
                min-height: 0;
                width: 100%;
                height: 100%;
                padding: var(--space-05);
                border-left: var(--border-width-default) solid var(--color-border-base);
                border-radius: var(--border-radius-small);
                flex-direction: column;
            }

            /* Chat */
            .dpip__chat {
                flex: 1;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                background: var(--color-background-chat);
                color: var(--color-text-base);
                scrollbar-width: thin;
                scrollbar-color: var(--color-background-scrollbar) transparent;
                border-radius: var(--border-radius-small) var(--border-radius-small) 0 0;
            }

            .dpip__chat::-webkit-scrollbar {
                width: 8px;
                opacity: 0;
                transition: opacity var(--timing-medium);
            }

            .dpip__chat:hover::-webkit-scrollbar {
                opacity: 1;
            }

            .dpip__chat::-webkit-scrollbar-thumb {
                background-color: var(--color-background-scrollbar);
                border-radius: var(--border-radius-small);
                border: 2px solid transparent;
                background-clip: content-box;
            }

            .dpip__chat::-webkit-scrollbar-track {
                background: transparent;
            }

            /* Input Section */
            #dpip__input {
                display: flex;
                gap: var(--space-05);
                padding: var(--space-1);
                background: var(--color-background-input);
                border-top: var(--border-width-default) solid var(--color-border-base);
            }

            #dpip__textinput {
                flex-grow: 1;
                resize: none;
                padding: var(--button-padding-y) var(--button-padding-x);
                background: var(--color-background-input);
                border: var(--input-border-width-small) solid var(--color-border-input);
                border-radius: var(--input-border-radius-small);
                font-size: var(--input-text-small);
                font-family: var(--font-size-7);
                color: var(--color-text-input);
                outline: none;
                height: var(--input-size-default);
                min-height: var(--input-size-default);
                max-height: calc(var(--input-size-default) * 4);
                overflow-y: auto;
                line-height: var(--line-height-body);
                transition: border-color var(--timing-medium);
            }

            #dpip__textinput:focus {
                border-color: var(--color-border-input-focus);
            }

            #dpip__textinput::-webkit-scrollbar {
                width: 6px;
            }

            #dpip__textinput::-webkit-scrollbar-thumb {
                background-color: var(--color-background-scrollbar);
                border-radius: var(--border-radius-small);
            }

            #dpip__textinput::-webkit-scrollbar-track {
                background: transparent;
            }

            #dpip__sendbutton {
                padding: var(--button-padding-y) var(--button-padding-x);
                background: var(--color-background-button-brand);
                color: var(--color-text-button-brand);
                border: none;
                border-radius: var(--button-border-radius-small);
                font-size: var(--button-text-small);
                font-family: var(--font-size-7);
                font-weight: var(--font-weight-semibold);
                cursor: pointer;
                transition: background var(--timing-medium);
                height: var(--button-size-default);
                line-height: var(--button-size-small);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            #dpip__sendbutton:hover {
                background: var(--color-background-button-brand-hover);
            }
            /* Message */
            .dpip__message {
                overflow-wrap: anywhere;
                padding: var(--space-05);
                font-size: var(--font-size-8);
                vertical-align: baseline;
                display: inline-block;
                min-width: 0;
                border-radius: var(--border-radius-small);
                transition: background var(--timing-medium);
            }

            .dpip__message:hover,
            .dpip__message:focus {
                background: var(--color-background-interactable-hover);
            }

            /* Timestamp */
            .dpip__message_timestamp {
                color: var(--color-hinted-grey-9);
                margin-inline-end: var(--space-05);
                font-size: var(--font-size-7);
            }

            /* Username */
            .dpip__message_username {
                font-weight: var(--font-weight-bold);
                color: var(--color-text-link);
                transition: color var(--timing-medium);
            }

            .dpip__message_username:hover,
            .dpip__message_username:focus {
                color: var(--color-text-link-hover);
                text-decoration: underline;
            }

            /* Media Queries */
            @media (max-width: var(--break-sm)) {
                .dpip__wrapper {
                    flex-direction: column;
                }
            }
        }
    </style>
    <template id="dpip__message_template">
        <div class="dpip__message">
            <span class="dpip__message_timestamp"></span><span class="dpip__message_username"></span><span aria-hidden>:
            </span><span class="dpip__message_body"></span>
        </div>
    </template>
    <div class="dpip__wrapper">
        <!-- Video goes here -->
        <div id="dpip__container" class="dpip__container">
            <!-- Your content here -->
            <div id="dpip__chat" class="dpip__chat"></div>
            <div id="dpip__input" class="dpip__input">
                <textarea id="dpip__textinput" placeholder="Send a message"></textarea>
                <button id="dpip__sendbutton">Chat</button>
            </div>
        </div>
    </div>
`;

/** @typedef {import('./types.js').CommandType} CommandType */
/** @typedef {import('./types.js').Message} Message */

class ContentInterface extends PublishSubscribeTemplate {
    /**
     * flag for determining whether connection with content and worker is there.
     */
    isChromeConnected = false;
    /**
     * flag for determining whether connection with twitch chat and content is there.
     */
    isTwitchConnected = false;

    /**
     * @type {PIPWindowManager}
     */
    pipWindowManager = null;

    constructor() {
        super();
        this.pipWindowManager = new PIPWindowManager();
        this.pipWindowManager.subscribe(
            'enterpictureinpicture',
            this.onEnterPIP.bind(this)
        );
    }

    onEnterPIP() {
        // make sure to return original video element back to it's place.
        this.pipWindowManager.pipWindow.addEventListener('pagehide', (e) => {
            this.postChromeMessage('CFIN');
            this.pipWindowManager.originalParent.prepend(
                this.pipWindowManager.videoElement
            );
        });

        this.connect();
    }

    connect() {
        console.log('CONTENT: ', 'Connecting to worker');

        this.isChromeConnected = true;
        this.chromePort = chrome.runtime.connect({ name: 'content-client' });

        // Initial message that indicates that we've entered a picture in picture mode.
        let channelName = window.location.pathname.replace(/^\/|\/$/g, '');
        this.postChromeMessage('CSYN', { channel: channelName });

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

        this.pipWindowManager.addMessage(ircMessage);
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
