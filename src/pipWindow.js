import { findLargestPlayingVideo, PublishSubscribeTemplate } from './utils-esm';

export class PIPWindowManager extends PublishSubscribeTemplate {
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

        // For some reason this resolve the issue of random video resizing
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
