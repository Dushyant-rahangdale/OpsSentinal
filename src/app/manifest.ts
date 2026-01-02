import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'OpsSentinal',
        short_name: 'OpsSentinal',
        description: 'Enterprise Incident Management Platform',
        start_url: '/',
        display: 'standalone',
        background_color: '#09090b',
        theme_color: '#09090b',
        icons: [
            {
                src: '/icons/android-chrome-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icons/apple-touch-icon.png',
                sizes: '180x180',
                type: 'image/png',
            },
            {
                src: '/icons/android-chrome-512x512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
        shortcuts: [
            {
                name: "Mobile Dashboard",
                url: "/m",
                description: "Open the mobile dashboard",
                icons: [{ src: "/icons/android-chrome-192x192.png", sizes: "192x192", type: "image/png" }]
            }
        ]
    };
}
