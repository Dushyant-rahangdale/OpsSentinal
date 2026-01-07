'use client';

import { useState, useRef, useTransition } from 'react';
import { AutosaveForm } from '@/components/settings/forms/AutosaveForm';
import { SettingsSection } from '@/components/settings/layout/SettingsSection';
import { SettingsRow } from '@/components/settings/layout/SettingsRow';
import { Input } from '@/components/ui/shadcn/input';
import { Badge } from '@/components/ui/shadcn/badge';
import { Alert, AlertDescription } from '@/components/ui/shadcn/alert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { Button } from '@/components/ui/shadcn/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/shadcn/form';
import { Lock, RefreshCw, Info, Camera, Upload, Loader2, Check } from 'lucide-react';
import { z } from 'zod';
import { updateProfile } from '@/app/(app)/settings/actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Props = {
  name: string;
  email: string | null;
  role: string;
  memberSince: string;
  department?: string | null;
  jobTitle?: string | null;
  avatarUrl?: string | null;
  lastOidcSync?: string | null;
  gender?: string | null;
};

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  gender: z.string().optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileForm({
  name,
  email,
  role,
  memberSince,
  department,
  jobTitle,
  avatarUrl,
  lastOidcSync,
  gender,
}: Props) {
  const router = useRouter();
  const [isUploading, startTransition] = useTransition();
  // Use local state for preview
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultValues: ProfileFormData = {
    name,
    gender: gender ?? undefined,
    department: department ?? undefined,
    jobTitle: jobTitle ?? undefined,
  };

  // Handle immediate avatar upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File is too large. Max 5MB.');
        return;
      }

      // Optimistic preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Immediate Upload
      startTransition(async () => {
        const formData = new FormData();
        formData.append('avatar', file);

        // We don't need to send other fields, the server action handles partial updates now
        const result = await updateProfile({ error: null, success: false }, formData);

        if (result.success) {
          toast.success('Profile photo updated');
          router.refresh();
        } else {
          toast.error(result.error || 'Failed to upload photo');
          // Revert preview on failure
          setAvatarPreview(avatarUrl ?? null);
        }
      });
    }
  };

  const handleAutosave = async (data: ProfileFormData) => {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.gender) formData.append('gender', data.gender);
    if (data.department) formData.append('department', data.department);
    if (data.jobTitle) formData.append('jobTitle', data.jobTitle);

    const result = await updateProfile({ error: null, success: false }, formData);

    if (result.success) {
      // router.refresh() // Autosave usually feels smoother without full refresh, but we need it for deep updates.
      // AutosaveForm component might handle visual feedback. We can debounce refresh.
      // For now, let's trust the AutosaveForm's save indicator.
      setTimeout(() => router.refresh(), 500);
    }

    return {
      success: result.success ?? false,
      error: result.error ?? undefined,
    };
  };

  // Get initials from name for fallback
  const getInitials = (nameInput: string) => {
    return (nameInput || 'User')
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Avatar Section - Independent of Autosave Form */}
      <div className="flex flex-col items-center justify-center py-6 gap-4 border-b pb-8">
        <div
          className="relative group cursor-pointer"
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <Avatar
            className={cn(
              'h-32 w-32 border-4 border-background shadow-xl ring-2 ring-border/50 transition-all group-hover:ring-primary/50',
              isUploading && 'opacity-70'
            )}
          >
            {avatarPreview ? (
              <AvatarImage src={avatarPreview} alt={name} className="object-cover" />
            ) : null}
            <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary/10 via-primary/5 to-background text-primary">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>

          <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
            {isUploading ? (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            ) : (
              <Camera className="h-8 w-8 text-white drop-shadow-md" />
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            disabled={isUploading}
          />
        </div>

        <div className="flex flex-col items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-2"
          >
            <Upload className="h-3.5 w-3.5" />
            Change Photo
          </Button>
          <p className="text-xs text-muted-foreground">JPG, GIF or PNG. Max 5MB.</p>
        </div>
      </div>

      {/* Editable Section with Auto-save */}
      <AutosaveForm
        defaultValues={defaultValues}
        schema={profileSchema}
        onSave={handleAutosave}
        showSaveIndicator={true}
        saveIndicatorPosition="top-right"
        delay={1000}
      >
        {form => (
          <SettingsSection
            title="Account Details"
            description="Manage your public profile and workspace preferences"
          >
            <div className="divide-y text-sm">
              <SettingsRow
                label="Display Name"
                description="Your public name in the workspace"
                required
                htmlFor="name"
              >
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Enter your display name"
                  className="w-full"
                />
              </SettingsRow>

              <SettingsRow
                label="Gender"
                description="Your gender identity (optional)"
                htmlFor="gender"
              >
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || undefined}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="non-binary">Non-binary</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SettingsRow>

              <SettingsRow
                label="Job Title"
                description="Your professional role"
                htmlFor="jobTitle"
              >
                <div className="w-full space-y-1">
                  <Input
                    id="jobTitle"
                    {...form.register('jobTitle')}
                    placeholder="e.g. Senior Site Reliability Engineer"
                    className="w-full"
                  />
                  {lastOidcSync && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" /> Synced from SSO
                    </p>
                  )}
                </div>
              </SettingsRow>

              <SettingsRow
                label="Department"
                description="Your team or division"
                htmlFor="department"
              >
                <Input
                  id="department"
                  {...form.register('department')}
                  placeholder="e.g. Platform Engineering"
                  className="w-full"
                />
              </SettingsRow>

              <SettingsRow label="Email Address" description="Managed by your identity provider">
                <div className="relative w-full">
                  <Input
                    value={email ?? 'Not available'}
                    readOnly
                    disabled
                    className="pr-10 bg-muted/50 font-mono text-xs"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              </SettingsRow>

              <SettingsRow label="Role" description="Determines your permission level">
                <div className="relative w-full">
                  <Input value={role} readOnly disabled className="pr-10 bg-muted/50" />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              </SettingsRow>

              <SettingsRow label="Member Since" description="Join date">
                <div className="relative w-full">
                  <Input value={memberSince} readOnly disabled className="pr-10 bg-muted/50" />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              </SettingsRow>
            </div>
          </SettingsSection>
        )}
      </AutosaveForm>

      {/* Info Note */}
      <Alert className="bg-muted/30 border-none">
        <Info className="h-4 w-4 text-muted-foreground" />
        <AlertDescription className="text-xs text-muted-foreground">
          Contact your administrator to update locked fields.
        </AlertDescription>
      </Alert>
    </div>
  );
}
