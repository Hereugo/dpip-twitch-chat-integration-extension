console.log('Hello');

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

function copyAllStylesheets(pipWindow) {
    // Copy all style sheets.
    [...document.styleSheets].forEach((styleSheet) => {
        try {
            const cssRules = [...styleSheet.cssRules]
                .map((rule) => rule.cssText)
                .join('');
            const style = document.createElement('style');

            style.textContent = cssRules;
            pipWindow.document.head.appendChild(style);
        } catch (e) {
            const link = document.createElement('link');

            link.rel = 'stylesheet';
            link.type = styleSheet.type;
            link.media = styleSheet.media;
            link.href = styleSheet.href;
            pipWindow.document.head.appendChild(link);
        }
    });
}

navigator.mediaSession.setActionHandler(
    'enterpictureinpicture',
    async function () {
        const videoElement = findLargestPlayingVideo();
        if (!videoElement) {
            return;
        }

        // Open a Picture-in-Picture window.
        const pipWindow = await documentPictureInPicture.requestWindow({
            width: 480,
            height: 300,
            preferInitialWindowPlacement: true,
        });

        // Move the player to the Picture-in-Picture window.
        pipWindow.document.body.append(videoElement.parentNode);

        copyAllStylesheets(pipWindow);

        const MIN_SPACE = 200; // minimum px required for container to show

        const wrapper = pipWindow.document.querySelector('.dpip__wrapper');
        const video = pipWindow.document.getElementById('video');
        const container = pipWindow.document.getElementById('dpip__container');
        const chat = pipWindow.document.getElementById('dpip__chat');

        function updateLayout() {
            const windowWidth = pipWindow.innerWidth;
            const windowHeight = pipWindow.innerHeight;
            const videoAspect = video.videoWidth / video.videoHeight;

            const windowAspect = windowWidth / windowHeight;

            let videoWidth, videoHeight;

            if (windowAspect > videoAspect) {
                // Fit by height
                videoHeight = windowHeight;
                videoWidth = videoHeight * videoAspect;
                wrapper.style.flexDirection = 'row';
                const leftoverWidth = windowWidth - videoWidth;
                if (leftoverWidth < MIN_SPACE) {
                    container.style.display = 'none';
                } else {
                    container.style.display = 'flex';
                }
            } else {
                // Fit by width
                videoWidth = windowWidth;
                videoHeight = videoWidth / videoAspect;
                wrapper.style.flexDirection = 'column';
                const leftoverHeight = windowHeight - videoHeight;
                if (leftoverHeight < MIN_SPACE) {
                    container.style.display = 'none';
                } else {
                    container.style.display = 'flex';
                }
            }
        }

        videoElement.addEventListener('loadedmetadata', updateLayout);
        pipWindow.addEventListener('resize', updateLayout);

        function getRandomColor() {
            const letters = '0123456789ABCDEF';
            let color = '#';
            for (let i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        }
        function addMessage(ircMessage) {
            const template = document.getElementById('dpip__message_template');
            const clone = template.content.cloneNode(true);

            clone.querySelector('.dpip__message_username').textContent =
                'Hereugo';
            clone.querySelector('.dpip__message_body').textContent =
                'Hello world this is a message from twitch chat!';
            clone.querySelector('.dpip__message_timestamp').textContent =
                new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                });

            clone.querySelector('.dpip__message_username').style.color =
                getRandomColor();

            chat.appendChild(clone);

            // chat.scrollTop = chat.scrollHeight;
        }

        // Simulate incoming messages
        setInterval(() => {
            addMessage();
        }, 2000);
    }
);
