'use client';

import { useEffect, useState } from 'react';

/**
 * Periodically checks if the server version/instance has changed.
 * If a new deployment is detected (different instanceId), refreshes the page
 * to prevent Stale Server Action errors.
 */
export default function VersionCheck() {
    const [instanceId, setInstanceId] = useState<string | null>(null);

    useEffect(() => {
        // Initial check
        fetchVersion();

        // Check every 30 seconds
        const interval = setInterval(fetchVersion, 30_000);

        // Also check when window regains focus (user comes back to tab)
        window.addEventListener('focus', fetchVersion);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', fetchVersion);
        };

        async function fetchVersion() {
            try {
                // Add timestamp to prevent caching
                const res = await fetch(`/api/health?t=${Date.now()}`, {
                    headers: { 'Cache-Control': 'no-cache' }
                });

                if (!res.ok) return;

                const data = await res.json();
                const newId = data.instanceId;

                if (!newId) return;

                setInstanceId(currentId => {
                    // First load, just set it
                    if (currentId === null) {
                        return newId;
                    }

                    // If ID changed and we had a previous one, REFRESH!
                    if (currentId !== newId) {
                        console.log('New deployment detected (Instance ID mismatch). Refreshing...');
                        window.location.reload();
                    }

                    return currentId;
                });
            } catch (err) {
                // Ignore network errors, retry next time
                console.debug('Version check failed', err);
            }
        }
    }, []);

    return null; // This component renders nothing
}
