import { PublishSubscribeTemplate } from './utils-esm.js';
import IRCMessage from './ircMessage.js';
import { PIPWindowManager } from './pipWindow.js';
import Logger from './logger.js';

/** @typedef {import('./types.js').CommandType} CommandType */
/** @typedef {import('./types.js').Message} Message */

class ContentInterface extends PublishSubscribeTemplate {
    logger = new Logger();

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
        this.pipWindowManager.pipWindow.addEventListener('pagehide', (e) => {
            this.logger.info(
                `Closing PIP Window, closing connection with worker and twitch`
            );
            this.postChromeMessage('TFIN');

            // make sure to return original video element back to it's place.
            this.pipWindowManager.originalParent.prepend(
                this.pipWindowManager.videoElement
            );
        });

        this.logger.info(`Entering picture in picture mode`);
        this.connect();
    }

    connect() {
        this.logger.info('Connecting to worker');

        this.chromePort = chrome.runtime.connect({ name: 'content-client' });

        this.chromePort.onMessage.addListener(this.onMessage.bind(this));
        this.chromePort.onDisconnect.addListener(this.onDisconnect.bind(this));

        // Initial message that indicates that we've entered a picture in picture mode.
        let channelName = window.location.pathname.replace(/^\/|\/$/g, '');
        this.logger.info(
            `Sending Chrome SYN to connect twitch channel ${channelName}`
        );

        this.postChromeMessage('CSYN', { channel: channelName });
    }

    /**
     * post a message
     * @param {CommandType} command [description]
     * @param {Object} payload [description]
     */
    postChromeMessage(command, payload = {}) {
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
            this.logger.error(
                `Chrome port disconnected due to error: ${chrome.runtime.lastError.message}`
            );
        } else {
            this.logger.info('Chrome port disconnected');
        }
    }

    /**
     * handle on message
     * @param {Message} message [received message from worker]
     */
    onMessage(message) {
        this.logger.log(`Received command: ${message.command}`);

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
                this.logger.error(`Unknown command: ${message.command}`);
                break;
            }
        }
    }

    /**
     * handle IRC message
     * @param {Message} message [description]
     */
    handleTCON(message) {
        this.isTwitchConnected = true;
        this.logger.info('Twitch connected!');
    }

    /**
     * handle IRC message
     * @param {Message} message [description]
     */
    handleTFIN(message) {
        this.isTwitchConnected = false;
        this.logger.info('Twitch disconnected');

        // addtionally close chrome port
        this.postChromeMessage('CFIN');
    }

    /**
     * handle IRC message
     * @param {Message} message [description]
     */
    handleTIRC(message) {
        console.assert(
            this.isTwitchConnected === true,
            'received a IRC message but isTwitchConnected is set to false'
        );

        const ircMessage = IRCMessage.fromJSON(message.payload);

        this.logger.info('Adding a new message to PIP Window');
        this.pipWindowManager.addMessage(ircMessage);
    }

    /**
     * handle CACK message response
     * @param {Message} message [description]
     */
    handleCACK(message) {
        this.isChromeConnected = true;
        this.logger.info('Chrome port connected!');
        this.logger.log('Worker is establishing twitch connection now');
    }

    /**
     * handle CFIN message response
     * @param {Message} message [description]
     */
    handleCFIN(message) {
        this.chromePort.disconnect();
        // this should have been called by disconnect() method on chromePort,
        // but it doesn't get called therefore I'll do this.
        this.onDisconnect(null);
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
