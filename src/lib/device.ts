const STORAGE_DEVICE_ID = 'akurana-device-id';

/**
 * Robust device ID generator.
 * Tries to use crypto.randomUUID() but falls back to a custom implementation 
 * for non-secure contexts (HTTP) or older browsers.
 */
export function getOrCreateDeviceId(): string {
    try {
        if (typeof window === 'undefined') return 'server';

        let deviceId = localStorage.getItem(STORAGE_DEVICE_ID);
        if (deviceId && deviceId !== 'unknown-device') return deviceId;

        // Generate new ID
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            deviceId = crypto.randomUUID();
        } else {
            // Robust fallback for non-secure contexts
            deviceId = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 15);
        }

        localStorage.setItem(STORAGE_DEVICE_ID, deviceId);
        return deviceId;
    } catch (e) {
        console.error('Error in getOrCreateDeviceId:', e);
        return 'fallback-' + Math.random().toString(36).substring(2, 10);
    }
}
