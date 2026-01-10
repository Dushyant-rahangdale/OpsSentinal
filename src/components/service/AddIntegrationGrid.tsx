'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/shadcn/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import { INTEGRATION_TYPES, IntegrationType } from './integration-types';
import { createIntegration } from '@/app/(app)/services/actions';
import { useToast } from '@/components/ToastProvider';
import { Loader2, Plus, Info } from 'lucide-react';

interface AddIntegrationGridProps {
  serviceId: string;
}

export default function AddIntegrationGrid({ serviceId }: AddIntegrationGridProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<IntegrationType | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleTypeClick = (type: IntegrationType) => {
    setSelectedType(type);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    // Reset selection after delay to avoid content jump during close animation
    setTimeout(() => setSelectedType(null), 300);
  };

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    try {
      await createIntegration(formData);
      showToast('Integration created successfully', 'success');
      router.refresh();
      handleClose();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to create integration';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeInfo = selectedType
    ? INTEGRATION_TYPES.find(t => t.value === selectedType)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Add New Integration</h2>
          <p className="text-sm text-slate-500">Select a tool to connect with OpsSentinal</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {INTEGRATION_TYPES.map(type => (
          <Card
            key={type.value}
            className="p-4 cursor-pointer hover:border-primary/50 hover:bg-slate-50 transition-all group relative overflow-hidden"
            onClick={() => handleTypeClick(type.value)}
          >
            <div className="flex flex-col h-full gap-3">
              <div className="flex items-start justify-between">
                <div
                  className="mx-auto w-12 h-12 flex items-center justify-center rounded-lg border border-white/30 shadow-sm mb-3 group-hover:scale-110 transition-transform duration-300"
                  style={{ backgroundColor: type.iconBg }}
                >
                  {type.icon}
                </div>
                <div className="bg-primary/10 text-primary p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="h-4 w-4" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-primary transition-colors">
                  {type.label}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{type.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={val => !val && handleClose()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span
                className="h-10 w-10 rounded-xl border border-white/30 shadow-sm flex items-center justify-center"
                style={{ backgroundColor: selectedTypeInfo?.iconBg || '#0f172a' }}
              >
                {selectedTypeInfo?.icon}
              </span>
              Add {selectedTypeInfo?.label} Integration
            </DialogTitle>
            <DialogDescription>
              Configure the basic details for your new integration.
            </DialogDescription>
          </DialogHeader>

          {selectedTypeInfo && (
            <form action={handleSubmit} className="space-y-6 pt-4">
              <input type="hidden" name="serviceId" value={serviceId} />
              <input type="hidden" name="type" value={selectedTypeInfo.value} />

              <div className="space-y-2">
                <Label htmlFor="name">
                  Integration Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={`e.g. Production ${selectedTypeInfo.label}`}
                  required
                  autoFocus
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-md border text-xs text-slate-600 flex gap-2">
                <Info className="h-4 w-4 shrink-0 text-blue-500" />
                <div>
                  For <strong>{selectedTypeInfo.label}</strong>, you will receive a unique API Key
                  or Webhook URL after creating this integration.
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Integration
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
