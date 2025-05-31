export const PIP_WINDOW_HTML = `
    <style>
        @media all and (display-mode: picture-in-picture) {
            html,
            body {
                margin: 0;
                padding: 0;
                height: 100%;
                width: 100%;
                background: black;
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
                object-fit: contain;
                background: black;
                flex-shrink: 0;
            }

            .dpip__container {
                background: #222;
                color: white;
                display: flex;
                overflow: auto;
                flex-grow: 1;
                min-width: 0;
                /* allows shrinking */
                min-height: 0;
                width: 100%;
                height: 100%;
            }

            .dpip__chat {
                flex: 1;
                overflow-y: auto;
                padding: 10px;
            }

            .dpip__message {
                margin-bottom: 10px;
                padding: 8px;
                background: #333;
                border-radius: 5px;
                word-wrap: break-word;
            }
        }
    </style>
    <div class="dpip__wrapper">
        <!-- Video goes here -->
        <!-- <video id="dpip__video" src="video.mp4" autoplay loop controls></video> -->

        <div id="dpip__container" class="dpip__container">
            <!-- Your content here -->
            <div id="dpip__chat" class="dpip__chat"></div>
        </div>
    </div>
`;
