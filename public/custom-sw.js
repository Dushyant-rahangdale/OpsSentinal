// Custom Service Worker for OpsSentinal PWA
// Handles push notifications and notification clicks

// Import Workbox (provided by Next.js PWA)
importScripts();

// Listen for push events
self.addEventListener('push', function (event) {
    console.log('[Service Worker] Push received', event);

    let data = {
        title: 'OpsSentinal',
        body: 'New notification',
        icon: '/icons/android-chrome-192x192.png',
        badge: '/icons/android-chrome-192x192.png',
        url: '/m/notifications'
    };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            console.error('[Service Worker] Failed to parse push data', e);
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/icons/android-chrome-192x192.png',
        badge: data.badge || '/icons/android-chrome-192x192.png',
        data: {
            url: data.url || data.data?.url || '/m/notifications',
            ...data.data
        },
        tag: data.tag || 'opssentinal-notification',
        requireInteraction: true, // Keep notification visible on mobile
        vibrate: [200, 100, 200], // Vibration pattern
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Listen for notification clicks
self.addEventListener('notificationclick', function (event) {
    console.log('[Service Worker] Notification clicked', event);

    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/m/notifications';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function (clientList) {
                // Check if there's already a window open
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus().then(() => {
                            // Navigate to the notification URL
                            return client.navigate(urlToOpen);
                        });
                    }
                }
                // If no window is open, open a new one
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Optional: Handle service worker installation
self.addEventListener('install', function (event) {
    console.log('[Service Worker] Installing');
    self.skipWaiting(); // Activate immediately
});

// Optional: Handle service worker activation
self.addEventListener('activate', function (event) {
    console.log('[Service Worker] Activating');
    event.waitUntil(clients.claim()); // Take control immediately
});

console.log('[Service Worker] Custom SW loaded with push handlers');
