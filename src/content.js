import { PublishSubscribeTemplate } from './utils-esm.js';
import IRCMessage from './ircMessage.js';
import { PIPWindowManager } from './pipWindow.js';

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
