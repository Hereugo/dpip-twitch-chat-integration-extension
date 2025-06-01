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
            ircMessage.prefix.nickname;
        clone.querySelector('.dpip__message_body').textContent =
            ircMessage.params[1];
        clone.querySelector('.dpip__message_timestamp').textContent =
            new Date().toLocaleTimeString();

        this.chat.appendChild(clone);

        this.chat.scrollTop = this.chat.scrollHeight;
    }
}

const PIP_WINDOW_HTML = `
    <style>
        @media all and (display-mode: picture-in-picture) {
            * {
                margin: 0px;
                padding: 0px;
                box-sizing: border-box;
            }

            html,
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
            }

            .dpip__container {
                background: var(--color-background-body-alt);
                color: inherit;
                display: flex;
                overflow: auto;
                flex-grow: 1;

                /* allows shrinking */
                min-width: 0;
                min-height: 0;
                width: 100%;
                height: 100%;
            }
            .dpip__chat {
                flex: 1;
                overflow-y: auto;
                padding-bottom: 6rem;
            }
            .dpip__message {
                overflow-wrap: anywhere;
                padding: .5rem 2rem;
                margin: 0;
                font: inherit;
                vertical-align: baseline;
                display: inline;
                min-width: 0px;
            }
        }
    </style>
    <template id="dpip__message_template">
        <div class="dpip__message">
            <span class="dpip__message_timestamp"></span>
            <div class="dpip__message_username"></div>
            <span aria-hidden>: </span>
            <span class="dpip__message_body"></span>
        </div>
    </template>
    <div class="dpip__wrapper">
        <!-- Video goes here -->

        <div id="dpip__container" class="dpip__container">
            <!-- Your content here -->
            <div id="dpip__chat" class="dpip__chat">
            </div>
        </div>
    </div>
`;
