import { PublishSubscribeTemplate, getHashParams } from './lib/utils-esm';
import IRCMessage from './irc-message';
import Logger from './lib/logger';

class WorkerInterfacer extends PublishSubscribeTemplate {
    /** WebSocket connection to Twitch IRC */
    socket: WebSocket | null = null;
    clientId = 'znac5nmb20lcql1osiepyv43yuibo2';
    redirectUri = chrome.identity.getRedirectURL('twitch');
    scope = 'chat:read';

    /** Chrome runtime port to content script */
    chromePort: chrome.runtime.Port | null = null;

    /** Current channel name */
    channel!: string;

    isChromeConnected = false;
    isTwitchConnected = false;

    logger = new Logger();

    constructor() {
        super();

        chrome.runtime.onConnect.addListener(this.onChromeConnect.bind(this));
    }

    /**
     * @param {chrome.runtime.Port} port [description]
     */
    onChromeConnect(port: chrome.runtime.Port) {
        console.assert(
            port.name === 'content-client',
            `expected "client-content" port name but received "${port.name}"`
        );

        // only one connection per chrome client is allowed for this extension to work
        if (this.isChromeConnected || this.chromePort !== null) {
            this.logger.warn(
                'Only one connection per chrome client is allowed, disconnecting from previous'
            );
            this.chromePort?.disconnect();

            // but it doesn't get called therefore I'll do this.
            this.onChromeDisconnect(null);
        }

        console.assert(
            !this.isChromeConnected && this.chromePort === null,
            'chrome port should be empty but is still connected to someone.'
        );

        this.chromePort = port;
        this.chromePort.onMessage.addListener(this.onChromeMessage.bind(this));
        this.chromePort.onDisconnect.addListener(
            this.onChromeDisconnect.bind(this)
        );
    }

    /**
     * @param {chrome.runtime.Port} e
     */
    onChromeDisconnect(_e: chrome.runtime.Port | null) {
        this.isChromeConnected = false;
        this.chromePort = null;

        if (chrome.runtime.lastError) {
            this.logger.error(
                `Chrome port disconnected due to error: ${chrome.runtime.lastError.message}`
            );
        } else {
            this.logger.info('Chrome port disconnected');
        }
    }

    /**
     * @param {Message} message
     */
    onChromeMessage(message: any) {
        this.logger.log(`Received chrome command: ${message.command}`);

        this.emit(message.command, message);
        switch (message.command) {
            case 'CSYN':
                return this.handleChromeCSYN(message);
            case 'CFIN':
                return this.handleChromeCFIN(message);
            case 'TFIN':
                return this.handleTFIN(message);
        }
    }

    /**
     * @param {CommandType} command [description]
     * @param {Object} payload [description]
     */
    async postChromeMessage(command: string, payload?: unknown) {
        this.chromePort?.postMessage({
            command: command,
            payload: payload,
        });
    }

    /**
     * @param {Message} message
     */
    handleChromeCSYN(message: any) {
        // console.assert(
        //     this.socket === null || this.socket.readyState === WebSocket.CLOSED,
        //     'Expected socket to twitch to be empty, but something is still open'
        // );

        this.isChromeConnected = true;
        this.logger.info('Chrome port connected!');

        // TODO: this should be somehow better handled
        this.channel = message.payload.channel;

        // subscribe to an event when connection with twitch has been successfully established
        // TODO: I believe there should be an event for state when connection was wrong
        this.logger.info(`Connecting to twitch channel ${this.channel}`);

        if (!this.isTwitchConnected) {
            this.subscribe(
                'GLOBALUSERSTATE',
                this.twitchConnectedCallback.bind(this),
                {
                    once: true,
                }
            );
            this.connectTwitch();
        } else {
            this.postChromeMessage('TCON');
            this.join();
        }

        this.postChromeMessage('CACK');
    }

    /**
     * [handle closing socket session when chrome client has closed pip view]
     *
     * @param{Message} message
     */
    handleChromeCFIN(_message: any) {
        this.postChromeMessage('CFIN');
    }

    /**
     * [handle closing socket session when chrome client has closed pip view]
     *
     * @param{Message} message
     */
    handleTFIN(_message: any) {
        console.assert(
            this.socket != null && this.socket.readyState === WebSocket.OPEN,
            'Expected socket to be open, but the socket is either not there or already closed'
        );

        this.part();

        // this.socket.close();
        this.postChromeMessage('TFIN');
    }

    /**
     * Establish a connection between service worker and Twitch IRC
     */
    connectTwitch() {
        this.logger.info('Setup socket connection with twitch');

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.close();
        }

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
    twitchConnectedCallback(_ircMessage: IRCMessage) {
        this.isTwitchConnected = true;
        this.logger.info('Twitch connected!');

        this.postChromeMessage('TCON');

        // Forward all chat messages to chrome client
        this.logger.info('Starting to forward all PRIVMSG to chrome client');
        this.subscribe('PRIVMSG', (irc: IRCMessage) =>
            this.postChromeMessage('TIRC', irc.toJSON())
        );

        this.join();
    }

    oauth() {
        this.logger.info('Setting up 2oath page');

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
    onSocketMessage(e: MessageEvent) {
        const delimiter = '\r\n';
        (e.data as string)
            .trim()
            .split(delimiter)
            .forEach((line: string) =>
                this.onIRCMessage(IRCMessage.parse(line))
            );
    }

    /**
     * @param {CloseEvent} e [description]
     */
    onSocketClose(_e: CloseEvent) {
        this.isTwitchConnected = false;
        this.logger.info('Twitch disconnected');
        this.socket = null;

        this.postChromeMessage('TFIN');
    }

    /**
     * @param {Event} e [description]
     */
    async onSocketOpen(_e: Event) {
        const responseURL = (await this.oauth()) as string;
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
                this.logger.warn(`Stored state: ${oauth_state}`);
                this.logger.warn(`Returned state: ${state}`);
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
    onSocketError(e: Event) {
        console.error(e);
    }

    /**
     * @param {string} message [Send a IRC message to twitch]
     */
    send(message: string) {
        this.socket?.send(message);
    }

    /**
     * @param {IRCMessage} ircMessage
     */
    onIRCMessage(ircMessage: IRCMessage) {
        this.logger.info(`Received ircMessage command: ${ircMessage.command}`);

        this.emit(ircMessage.command, ircMessage);
        switch (ircMessage.command) {
            case 'PING':
                return this.handlePING(ircMessage);
            case 'NOTICE':
                return this.handleNOTICE(ircMessage);
            case 'RECONNECT':
                return this.handleRECONNECT(ircMessage);
            // Ignore these messages
            case 'CAP':
            case '001':
            case '002':
            case '003':
            case '004':
            case '353':
            case '366':
            case '375':
            case '376':
            case '372': {
                break;
            }
            default: {
                break;
            }
        }
    }

    /**
     * @param {IRCMessage} ircMessage [description]
     */
    handlePING(_ircMessage: IRCMessage) {
        this.send(`PONG :tmi.twitch.tv`);
    }

    /**
     * @param {IRCMessage} ircMessage [description]
     */
    async handleNOTICE(ircMessage: IRCMessage) {
        const msgId = ircMessage.tags['msg-id'];
        if (msgId !== null) {
            this.logger.error(`Error: ${msgId}, ${ircMessage.params[1]}`);
            this.postChromeMessage('TERR', {
                reason: msgId,
                description: ircMessage.params[1],
            });
        }
    }

    /**
     * @param {IRCMessage} ircMessage [description]
     */
    handleRECONNECT(_ircMessage: IRCMessage) {}

    join() {
        this.logger.info(`Joining channel: ${this.channel}`);
        this.send(`JOIN #${this.channel}`);
    }

    part() {
        this.logger.info(`Leaving channel: ${this.channel}`);
        this.send(`PART #${this.channel}`);
    }
}

console.log('Worker bootup!');
new WorkerInterfacer();
