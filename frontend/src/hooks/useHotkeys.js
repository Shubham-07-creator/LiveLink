import { useEffect } from 'react';

/**
 * Custom hook to handle global meeting hotkeys
 * M: Toggle microphone
 * V: Toggle camera
 * H: Toggle raise hand
 * C: Toggle chat / drawer
 * Esc: Close open modals, drawers, or menus
 */
export default function useHotkeys({
    onToggleAudio,
    onToggleVideo,
    onToggleHand,
    onToggleChat,
    onCloseModals,
    enabled = true
} = {}) {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e) => {
            const activeEl = document.activeElement;
            const tagName = activeEl?.tagName?.toLowerCase();
            const isTyping = tagName === 'input' || tagName === 'textarea' || activeEl?.isContentEditable;

            if (isTyping) {
                if (e.key === 'Escape') {
                    activeEl.blur();
                    onCloseModals?.();
                }
                return;
            }

            if (e.key === 'Escape') {
                onCloseModals?.();
            } else if (e.key === 'm' || e.key === 'M') {
                onToggleAudio?.();
            } else if (e.key === 'v' || e.key === 'V') {
                onToggleVideo?.();
            } else if (e.key === 'h' || e.key === 'H') {
                onToggleHand?.();
            } else if (e.key === 'c' || e.key === 'C') {
                onToggleChat?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onToggleAudio, onToggleVideo, onToggleHand, onToggleChat, onCloseModals, enabled]);
}
