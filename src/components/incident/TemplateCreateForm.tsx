'use client';

import * as React from 'react';
import { useState, useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/shadcn/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/shadcn/form';
import { Input } from '@/components/ui/shadcn/input';
import { Textarea } from '@/components/ui/shadcn/textarea';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/shadcn/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { Switch } from '@/components/ui/shadcn/switch';
import { cn } from '@/lib/utils';
import {
  Check,
  ChevronsUpDown,
  AlertTriangle,
  AlertCircle,
  Info,
  Layers,
  FileText,
  Globe,
} from 'lucide-react';

// Types
type Service = {
  id: string;
  name: string;
};

type TemplateCreateFormProps = {
  services: Service[];
  action: (prevState: null, formData: FormData) => Promise<null>;
};

// Zod Schema
const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().optional(),
  title: z.string().min(5, 'Default Title must be at least 5 characters').max(255),
  descriptionText: z.string().optional(),
  defaultUrgency: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  defaultPriority: z.string().optional(),
  defaultServiceId: z.string().optional(),
  isPublic: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function TemplateCreateForm({ services, action }: TemplateCreateFormProps) {
  const router = useRouter();

  // Form definition
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      title: '',
      descriptionText: '',
      defaultUrgency: 'HIGH',
      defaultPriority: '',
      defaultServiceId: '',
      isPublic: false,
    },
  });

  // Server Action State
  const [_state, formAction, isPending] = useActionState(action, null);

  // Custom submit handler to bridge RHF and Server Actions
  const onSubmit = (data: FormValues) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description || '');
    formData.append('title', data.title);
    formData.append('descriptionText', data.descriptionText || '');
    formData.append('defaultUrgency', data.defaultUrgency);
    if (data.defaultPriority) formData.append('defaultPriority', data.defaultPriority);
    if (data.defaultServiceId) formData.append('defaultServiceId', data.defaultServiceId);
    if (data.isPublic) formData.append('isPublic', 'on');

    // Trigger the server action
    React.startTransition(() => {
      formAction(formData);
    });
  };

  // Helper State for Service Combobox
  const [serviceOpen, setServiceOpen] = useState(false);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"
      >
        {/* Main Card - Glassmorphism & Structured */}
        <div className="rounded-xl border bg-card/40 backdrop-blur-md shadow-xl ring-1 ring-white/10 overflow-hidden">
          {/* Header Strip - Decorative */}
          <div className="h-1.5 w-full bg-slate-500/50" />

          <div className="p-6 md:p-8 space-y-8">
            {/* Section 1: Template Info */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-2 border-b pb-2">
                <Layers className="w-5 h-5 text-slate-500" />
                <h3 className="font-semibold text-lg">Template Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Database Outage"
                          className="bg-background/50 border-input/50 focus:bg-background transition-all shadow-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Description (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="When to use this..."
                          className="bg-background/50 border-input/50 focus:bg-background transition-all shadow-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background/50">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        Public Template
                      </FormLabel>
                      <FormDescription>
                        Make this template visible to all users in the organization?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value || false} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Section 2: Default Values */}
            <div className="space-y-5 pt-4">
              <div className="flex items-center gap-2 mb-2 border-b pb-2">
                <FileText className="w-5 h-5 text-slate-500" />
                <h3 className="font-semibold text-lg">Default Incident Values</h3>
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Incident Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. High Latency Detected"
                        className="font-medium bg-background/50 border-input/50 focus:bg-background transition-all shadow-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descriptionText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Incident Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Steps to investigate..."
                        className="min-h-[120px] bg-background/50 border-input/50 focus:bg-background transition-all shadow-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Service Selection */}
              <FormField
                control={form.control}
                name="defaultServiceId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Default Service (Optional)</FormLabel>
                    <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between h-11 bg-background/50 border-input/50',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value
                              ? services.find(service => service.id === field.value)?.name
                              : 'Select default service...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                        align="start"
                      >
                        <Command>
                          <CommandInput placeholder="Search services..." />
                          <CommandList>
                            <CommandEmpty>No service found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="none"
                                onSelect={() => {
                                  form.setValue('defaultServiceId', '');
                                  setServiceOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    !field.value ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                None (User Selects)
                              </CommandItem>
                              {services.map(service => (
                                <CommandItem
                                  value={service.name}
                                  key={service.id}
                                  onSelect={() => {
                                    form.setValue('defaultServiceId', service.id);
                                    setServiceOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      service.id === field.value ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  {service.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                {/* Urgency Selector - Visual Cards */}
                <FormField
                  control={form.control}
                  name="defaultUrgency"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" /> Default Urgency
                      </FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-1 gap-3">
                          {[
                            {
                              value: 'LOW',
                              label: 'Low',
                              icon: Info,
                              color: 'text-green-600',
                              bg: 'bg-green-500/10',
                              border: 'border-green-200 dark:border-green-900',
                            },
                            {
                              value: 'MEDIUM',
                              label: 'Medium',
                              icon: AlertCircle,
                              color: 'text-yellow-600',
                              bg: 'bg-yellow-500/10',
                              border: 'border-yellow-200 dark:border-yellow-900',
                            },
                            {
                              value: 'HIGH',
                              label: 'High',
                              icon: AlertTriangle,
                              color: 'text-red-600',
                              bg: 'bg-red-500/10',
                              border: 'border-red-200 dark:border-red-900',
                            },
                          ].map(option => (
                            <div
                              key={option.value}
                              className={cn(
                                'cursor-pointer rounded-lg border p-3 flex items-center gap-3 transition-all duration-200',
                                field.value === option.value
                                  ? `${option.border} ${option.bg} ring-1 ring-offset-1 ring-offset-background`
                                  : 'border-muted bg-background/50 hover:bg-accent/50'
                              )}
                              onClick={() => field.onChange(option.value)}
                            >
                              <option.icon className={cn('h-4 w-4', option.color)} />
                              <span className={cn('font-medium', option.color)}>
                                {option.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Priority Badges */}
                <FormField
                  control={form.control}
                  name="defaultPriority"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="font-semibold">Default Priority</FormLabel>
                      <FormControl>
                        <div className="flex flex-wrap gap-2">
                          {['P1', 'P2', 'P3', 'P4', 'P5'].map(p => {
                            const isSelected = field.value === p;
                            return (
                              <div
                                key={p}
                                onClick={() => field.onChange(isSelected ? '' : p)}
                                className={cn(
                                  'cursor-pointer px-4 py-2 rounded-full border text-sm font-semibold transition-all',
                                  isSelected
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105'
                                    : 'bg-background/80 border-input text-muted-foreground hover:bg-accent hover:text-foreground'
                                )}
                              >
                                {p}
                              </div>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-muted/20 border-t flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white min-w-[140px]"
            >
              {isPending ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
