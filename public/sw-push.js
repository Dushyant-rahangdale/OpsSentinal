// Push Notification Event Handlers for Service Worker
// This file is automatically injected into the service worker by Next PWA

// Handle push events
self.addEventListener('push', function (event) {
    console.log('[SW] Push notification received:', event);

    let notificationData = {
        title: 'OpsKnight',
        body: 'New notification',
        icon: '/icons/android-chrome-192x192.png',
        badge: '/icons/android-chrome-192x192.png',
        url: '/m/notifications',
        actions: undefined
    };

    if (event.data) {
        try {
            const parsed = event.data.json();
            notificationData = {
                title: parsed.title || notificationData.title,
                body: parsed.body || notificationData.body,
                icon: parsed.icon || notificationData.icon,
                badge: parsed.badge || notificationData.badge,
                url: parsed.url || parsed.data?.url || notificationData.url,
                data: parsed.data || {},
                actions: parsed.actions || parsed.data?.actions
            };
        } catch (error) {
            console.error('[SW] Error parsing push data:', error);
        }
    }

    let resolvedActions;
    if (notificationData.actions) {
        if (Array.isArray(notificationData.actions)) {
            resolvedActions = notificationData.actions;
        } else if (typeof notificationData.actions === 'string') {
            try {
                const parsedActions = JSON.parse(notificationData.actions);
                if (Array.isArray(parsedActions)) {
                    resolvedActions = parsedActions;
                }
            } catch {
                resolvedActions = undefined;
            }
        }
    }

    const options = {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        data: {
            url: notificationData.url,
            ...notificationData.data
        },
        tag: 'opsknight-notification',
        requireInteraction: true, // Keep visible on mobile
        vibrate: [200, 100, 200]
    };

    if (resolvedActions && resolvedActions.length > 0) {
        options.actions = resolvedActions;
    } else {
        options.actions = [
            { action: 'open', title: 'View' },
            { action: 'close', title: 'Dismiss' }
        ];
    }

    event.waitUntil(
        self.registration.showNotification(notificationData.title, options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', function (event) {
    console.log('[SW] Notification clicked:', event.action);

    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    const urlToOpen = event.notification.data?.url || '/m/notifications';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function (clientList) {
                // Try to focus existing window
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin)) {
                        return client.focus().then(() => client.navigate(urlToOpen));
                    }
                }
                // Open new window if none exists
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

console.log('[SW] Push handlers registered');
