'use client';

import { AutosaveForm } from '@/components/settings/forms/AutosaveForm';
import { FormField } from '@/components/settings/forms/FormField';
import { SettingsSection } from '@/components/settings/layout/SettingsSection';
import { SettingsRow } from '@/components/settings/layout/SettingsRow';
import { Input } from '@/components/ui/shadcn/input';
import { Switch } from '@/components/ui/shadcn/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import { Button } from '@/components/ui/shadcn/button';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Badge } from '@/components/ui/shadcn/badge';
import { z } from 'zod';
import { useState } from 'react';

// Define schema for form validation
const exampleSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  email: z.string().email('Invalid email address'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  timezone: z.string(),
  notifications: z.boolean(),
  digestFrequency: z.enum(['daily', 'weekly', 'never']),
  autoSave: z.boolean(),
});

type ExampleFormData = z.infer<typeof exampleSchema>;

export default function ExampleSettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  const defaultValues: ExampleFormData = {
    displayName: 'John Doe',
    email: 'john.doe@example.com',
    bio: 'Software engineer passionate about building great user experiences.',
    timezone: 'America/New_York',
    notifications: true,
    digestFrequency: 'daily',
    autoSave: true,
  };

  const handleSave = async (data: ExampleFormData) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Saving data:', data);

    // Simulate random success/failure for demo
    if (Math.random() > 0.1) {
      return { success: true };
    } else {
      return { success: false, error: 'Failed to save settings. Please try again.' };
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-4xl font-bold">Example Settings</h1>
          <Badge variant="secondary">Demo</Badge>
        </div>
        <p className="text-muted-foreground text-base">
          This page demonstrates all the new settings components with auto-save functionality.
        </p>
      </div>

      {/* Auto-save Form */}
      <AutosaveForm
        defaultValues={defaultValues}
        schema={exampleSchema}
        onSave={handleSave}
        showSaveIndicator={true}
        saveIndicatorPosition="top-right"
        delay={500}
      >
        {form => (
          <div className="space-y-6">
            {/* Personal Information Section */}
            <SettingsSection
              title="Personal Information"
              description="Update your personal details and profile information"
            >
              <div className="divide-y">
                <SettingsRow
                  label="Display Name"
                  description="This is your public display name"
                  required
                  htmlFor="displayName"
                >
                  <Input
                    id="displayName"
                    {...form.register('displayName')}
                    placeholder="Enter your name"
                    className="max-w-md"
                  />
                </SettingsRow>

                <SettingsRow
                  label="Email Address"
                  description="Your email for notifications and account recovery"
                  required
                  tooltip="This email cannot be changed after initial setup"
                  htmlFor="email"
                >
                  <Input
                    id="email"
                    {...form.register('email')}
                    type="email"
                    placeholder="you@example.com"
                    className="max-w-md"
                  />
                </SettingsRow>

                <SettingsRow
                  label="Bio"
                  description="Tell us a little about yourself (max 500 characters)"
                  htmlFor="bio"
                >
                  <Textarea
                    id="bio"
                    {...form.register('bio')}
                    placeholder="Enter your bio..."
                    rows={4}
                    className="max-w-md resize-none"
                  />
                </SettingsRow>
              </div>
            </SettingsSection>

            {/* Preferences Section */}
            <SettingsSection
              title="Preferences"
              description="Customize your experience"
              action={
                <Button variant="outline" size="sm">
                  Reset to defaults
                </Button>
              }
            >
              <div className="divide-y">
                <SettingsRow
                  label="Timezone"
                  description="Used for email digests and timestamps"
                  htmlFor="timezone"
                >
                  <Select
                    value={form.watch('timezone')}
                    onValueChange={value => form.setValue('timezone', value)}
                  >
                    <SelectTrigger className="max-w-md" id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingsRow>

                <SettingsRow
                  label="Auto-save"
                  description="Automatically save changes as you type"
                  tooltip="When enabled, changes are saved automatically after you stop typing"
                >
                  <Switch
                    checked={form.watch('autoSave')}
                    onCheckedChange={checked => {
                      form.setValue('autoSave', checked);
                      setAutoSave(checked);
                    }}
                  />
                </SettingsRow>
              </div>
            </SettingsSection>

            {/* Notifications Section */}
            <SettingsSection
              title="Email Notifications"
              description="Manage how you receive email updates"
            >
              <div className="divide-y">
                <SettingsRow
                  label="Enable Notifications"
                  description="Receive email updates about incidents and system status"
                >
                  <Switch
                    checked={form.watch('notifications')}
                    onCheckedChange={checked => {
                      form.setValue('notifications', checked);
                      setEmailNotifications(checked);
                    }}
                  />
                </SettingsRow>

                {emailNotifications && (
                  <SettingsRow
                    label="Digest Frequency"
                    description="How often to receive incident summary emails"
                    htmlFor="digestFrequency"
                  >
                    <Select
                      value={form.watch('digestFrequency')}
                      onValueChange={value =>
                        form.setValue('digestFrequency', value as 'daily' | 'weekly' | 'never')
                      }
                    >
                      <SelectTrigger className="max-w-md" id="digestFrequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingsRow>
                )}
              </div>
            </SettingsSection>

            {/* Using FormField (Alternative Pattern) */}
            <SettingsSection
              title="Alternative Form Pattern"
              description="This section demonstrates using FormField directly instead of SettingsRow"
            >
              <div className="space-y-6 py-4">
                <FormField
                  name="displayName"
                  label="Display Name"
                  description="Alternative form field pattern"
                  required
                  tooltip="This is the same field as above, just demonstrating different layout"
                >
                  <Input {...form.register('displayName')} placeholder="Enter your name" />
                </FormField>

                <FormField
                  name="email"
                  label="Email Address"
                  description="This layout stacks vertically instead of two columns"
                  required
                >
                  <Input {...form.register('email')} type="email" placeholder="you@example.com" />
                </FormField>
              </div>
            </SettingsSection>
          </div>
        )}
      </AutosaveForm>

      {/* Info Section */}
      <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20 p-4 rounded">
        <h4 className="font-semibold mb-2">How to use this example</h4>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• Make changes to any field - they auto-save after 500ms</li>
          <li>• Watch the save indicator in the top-right corner</li>
          <li>• Toggle switches save instantly (delay=0)</li>
          <li>• Form validation happens in real-time</li>
          <li>• Error messages appear below invalid fields</li>
          <li>• Toast notifications show on save errors</li>
        </ul>
      </div>
    </div>
  );
}
