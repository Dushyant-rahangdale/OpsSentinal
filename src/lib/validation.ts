import { z } from 'zod';

export const IncidentCreateSchema = z.object({
    title: z.string().trim().min(1).max(500),
    description: z.string().trim().max(10000).optional().nullable(),
    serviceId: z.string().min(1),
    urgency: z.enum(['LOW', 'HIGH']),
    priority: z.string().trim().max(20).optional().nullable()
});

export const IncidentPatchSchema = z.object({
    status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'SNOOZED', 'SUPPRESSED']).optional(),
    urgency: z.enum(['LOW', 'HIGH']).optional(),
    assigneeId: z.string().max(100).optional().nullable()
});

export const EventSchema = z.object({
    event_action: z.enum(['trigger', 'resolve', 'acknowledge']),
    dedup_key: z.string().trim().min(1).max(200),
    payload: z.object({
        summary: z.string().trim().min(1).max(500),
        source: z.string().trim().min(1).max(200),
        severity: z.enum(['critical', 'error', 'warning', 'info']),
        custom_details: z.unknown().optional()
    })
});

export const NotificationPatchSchema = z.object({
    markAllAsRead: z.boolean().optional(),
    notificationIds: z.array(z.string()).optional()
}).refine((data) => data.markAllAsRead || (data.notificationIds && data.notificationIds.length > 0), {
    message: 'markAllAsRead or notificationIds is required'
});

export const StatusPageSettingsSchema = z.object({
    name: z.string().trim().min(1).max(200).optional(),
    subdomain: z.string().trim().max(200).optional().nullable(),
    customDomain: z.string().trim().max(200).optional().nullable(),
    enabled: z.boolean().optional(),
    showServices: z.boolean().optional(),
    showIncidents: z.boolean().optional(),
    showMetrics: z.boolean().optional(),
    footerText: z.string().trim().max(1000).optional().nullable(),
    contactEmail: z.string().trim().max(320).optional().nullable(),
    contactUrl: z.string().trim().max(500).optional().nullable(),
    branding: z.unknown().optional().nullable(),
    serviceIds: z.array(z.string()).optional(),
    serviceConfigs: z.record(z.object({
        displayName: z.string().trim().max(200).optional().nullable(),
        order: z.number().int().optional(),
        showOnPage: z.boolean().optional()
    })).optional()
});

export const StatusAnnouncementCreateSchema = z.object({
    statusPageId: z.string().min(1),
    title: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(5000),
    type: z.string().trim().max(50).optional(),
    startDate: z.string().min(1),
    endDate: z.string().optional().nullable(),
    isActive: z.boolean().optional()
});

export const StatusAnnouncementPatchSchema = z.object({
    id: z.string().min(1),
    title: z.string().trim().min(1).max(200).optional(),
    message: z.string().trim().min(1).max(5000).optional(),
    type: z.string().trim().max(50).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional().nullable(),
    isActive: z.boolean().optional()
});

export const StatusAnnouncementDeleteSchema = z.object({
    id: z.string().min(1)
});

export const CustomFieldCreateSchema = z.object({
    name: z.string().trim().min(1).max(200),
    key: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_]+$/),
    type: z.enum(['TEXT', 'NUMBER', 'DATE', 'SELECT', 'BOOLEAN', 'URL', 'EMAIL']),
    required: z.boolean().optional(),
    defaultValue: z.string().optional().nullable(),
    options: z.unknown().optional().nullable(),
    showInList: z.boolean().optional()
});

export const IncidentCustomFieldSchema = z.object({
    customFieldId: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional().nullable()
});

export const SearchPresetCreateSchema = z.object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(1000).optional().nullable(),
    filterCriteria: z.record(z.unknown()),
    isShared: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    icon: z.string().trim().max(100).optional().nullable(),
    color: z.string().trim().max(50).optional().nullable(),
    sharedWithTeams: z.array(z.string()).optional()
});

export const SearchPresetPatchSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
    filterCriteria: z.record(z.unknown()).optional(),
    isShared: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    icon: z.string().trim().max(100).optional().nullable(),
    color: z.string().trim().max(50).optional().nullable(),
    order: z.number().int().optional(),
    sharedWithTeams: z.array(z.string()).optional()
});
