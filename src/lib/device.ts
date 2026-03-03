const STORAGE_DEVICE_ID = 'akurana-device-id';

/**
 * Robust device ID generator with sessionStorage fallback.
 * Ensures the same ID is returned across page reloads to prevent orphaned data.
 */
export function getOrCreateDeviceId(): string {
    try {
        if (typeof window === 'undefined') return 'server';

        // Try localStorage first
        let deviceId: string | null = null;
        try {
            deviceId = localStorage.getItem(STORAGE_DEVICE_ID);
        } catch {
            console.warn('[device] localStorage not available, trying sessionStorage');
        }

        // Fallback to sessionStorage if localStorage failed
        if (!deviceId || deviceId === 'unknown-device') {
            try {
                deviceId = sessionStorage.getItem(STORAGE_DEVICE_ID);
            } catch {
                console.warn('[device] sessionStorage also not available');
            }
        }

        // Return existing valid ID
        if (deviceId && deviceId !== 'unknown-device') {
            console.log('[device] Using existing deviceId:', deviceId.substring(0, 12) + '...');
            return deviceId;
        }

        // Generate new ID
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            deviceId = crypto.randomUUID();
        } else {
            // Robust fallback for non-secure contexts
            deviceId = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 15);
        }

        console.warn('[device] Generated NEW deviceId:', deviceId.substring(0, 12) + '... — if this happens repeatedly, data will be orphaned');

        // Persist to both storages for maximum resilience
        try { localStorage.setItem(STORAGE_DEVICE_ID, deviceId); } catch { /* ignore */ }
        try { sessionStorage.setItem(STORAGE_DEVICE_ID, deviceId); } catch { /* ignore */ }

        return deviceId;
    } catch (e) {
        console.error('[device] Critical error in getOrCreateDeviceId:', e);
        // Last resort: use a session-stable fallback rather than random
        try {
            let fallback = sessionStorage.getItem(STORAGE_DEVICE_ID);
            if (fallback) return fallback;
            fallback = 'fallback-' + Date.now().toString(36);
            sessionStorage.setItem(STORAGE_DEVICE_ID, fallback);
            return fallback;
        } catch {
            return 'fallback-' + Date.now().toString(36);
        }
    }
}
