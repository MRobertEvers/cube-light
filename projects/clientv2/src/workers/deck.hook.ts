import { useRef } from 'react';
import type { OnMessageResponseHandler, Message } from './utils/messageToolkit';
import { handleDeckMessage } from './deck.worker';

/** Compatibility hook: domain operations now execute through Redux/core in the window. */
export function useDeckWorker(onmessage: OnMessageResponseHandler): <T, R>(message: Message<T, R>) => void {
    const handler = useRef(onmessage);
    handler.current = onmessage;
    return function <T, R>(message: Message<T, R>): void {
        void handleDeckMessage(message).then((reply) => { if (reply) void handler.current(reply); });
    };
}
