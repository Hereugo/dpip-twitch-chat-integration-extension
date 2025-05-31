import {
    PublishSubscribeTemplate,
    findLargestPlayingVideo,
} from './utils-esm.js';
import IRCMessage from './ircMessage.js';
import { PIP_WINDOW_HTML } from './pipWindowHTML.js';

/** @typedef {import('./types.js').CommandType} CommandType */
/** @typedef {import('./types.js').Message} Message */

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

        this.copyAllStyleSheets();

        this.videoElement.addEventListener(
            'loadedmetadata',
            this.updateLayout.bind(this)
        );
        this.pipWindow.addEventListener('resize', this.updateLayout.bind(this));

        this.emit('enterpictureinpicture');
    }

    /**
     * Copies all style sheets from original document to pip window.
     */
    copyAllStyleSheets() {
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
     *
     * @param {IRCMessage} ircMessage
     */
    addMessage(ircMessage) {
        const message = document.createElement('div');
        message.className = 'dpip__message';
        message.textContent = ircMessage.params[1];

        this.chat.appendChild(message);

        // Auto-scroll to the bottom
        this.chat.scrollTop = this.chat.scrollHeight;
    }
}

class ContentInterface extends PublishSubscribeTemplate {
    isChromeConnected = false;
    isTwitchConnected = false;
    pipWindowManager = null;

    constructor() {
        super();
        this.pipWindowManager = new PIPWindowManager();
        this.pipWindowManager.subscribe(
            'enterpictureinpicture',
            this.onEnterPIP.bind(this)
        );
    }

    /**
     */
    onEnterPIP() {
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
        this.postChromeMessage('CSYN', { channel: 'vanorsigma' });

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
