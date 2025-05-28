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
export function getHashParams(hash) {
    return new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
}

export function findLargestPlayingVideo() {
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
export class PublishSubscribeTemplate {
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
