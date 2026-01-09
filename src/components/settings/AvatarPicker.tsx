'use client';

import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { Button } from '@/components/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/shadcn/dialog';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Static custom avatars (call-center style with headsets)
const STATIC_AVATARS = [
  { id: 'custom-1', src: '/avatars/avatar-1.png', label: 'Agent Blue' },
  { id: 'custom-2', src: '/avatars/avatar-2.png', label: 'Agent Pink' },
  { id: 'custom-3', src: '/avatars/avatar-3.png', label: 'Agent Green' },
  { id: 'custom-4', src: '/avatars/avatar-4.png', label: 'Agent Purple' },
  { id: 'custom-5', src: '/avatars/avatar-5.png', label: 'Agent Orange' },
  { id: 'custom-6', src: '/avatars/avatar-6.png', label: 'Agent Teal' },
  { id: 'custom-7', src: '/avatars/avatar-7.png', label: 'Agent Violet' },
  { id: 'custom-8', src: '/avatars/avatar-8.png', label: 'Agent Red' },
  { id: 'custom-9', src: '/avatars/avatar-9.png', label: 'Agent Cyan' },
  { id: 'custom-10', src: '/avatars/avatar-10.png', label: 'Agent Indigo' },
  { id: 'custom-11', src: '/avatars/avatar-11.png', label: 'Agent Amber' },
  { id: 'custom-12', src: '/avatars/avatar-12.png', label: 'Agent Emerald' },
  { id: 'custom-13', src: '/avatars/avatar-13.png', label: 'Agent Rose' },
  { id: 'custom-14', src: '/avatars/avatar-14.png', label: 'Agent Yellow' },
  { id: 'custom-15', src: '/avatars/avatar-15.png', label: 'Agent Lime' },
];

const ANIMAL_AVATARS = [
  { id: 'animal-1', src: '/avatars/avatar-animal-1.png', label: 'Agent Owl' },
  { id: 'animal-2', src: '/avatars/avatar-animal-2.png', label: 'Agent Cat' },
  { id: 'animal-3', src: '/avatars/avatar-animal-3.png', label: 'Agent Dog' },
  { id: 'animal-4', src: '/avatars/avatar-animal-4.png', label: 'Agent Panda' },
  { id: 'animal-5', src: '/avatars/avatar-animal-5.png', label: 'Agent Fox' },
];

// DiceBear avataaars style avatars (via proxy)
const DICEBEAR_AVATARS = [
  { id: 'db-1', seed: 'professional-1', bg: 'b91c1c', label: 'Pro 1' },
  { id: 'db-2', seed: 'professional-2', bg: '65a30d', label: 'Pro 2' },
  { id: 'db-3', seed: 'professional-3', bg: '7c3aed', label: 'Pro 3' },
  { id: 'db-4', seed: 'creative-lead', bg: 'ea580c', label: 'Creative' },
  { id: 'db-5', seed: 'tech-support', bg: '0891b2', label: 'Support' },
  { id: 'db-6', seed: 'manager-1', bg: '2563eb', label: 'Manager' },
  { id: 'db-7', seed: 'developer-1', bg: '9333ea', label: 'Developer' },
  { id: 'db-8', seed: 'ops-team-1', bg: 'ca8a04', label: 'Ops' },
  { id: 'db-9', seed: 'executive-1', bg: 'be185d', label: 'Executive' },
  { id: 'db-10', seed: 'analyst-1', bg: '059669', label: 'Analyst' },
  { id: 'db-11', seed: 'designer-1', bg: 'dc2626', label: 'Designer' },
  { id: 'db-12', seed: 'architect-1', bg: '4b5563', label: 'Architect' },
  { id: 'db-13', seed: 'consultant-1', bg: '0f766e', label: 'Consultant' },
  { id: 'db-14', seed: 'engineer-1', bg: 'b45309', label: 'Engineer' },
];

interface AvatarPickerProps {
  currentAvatarUrl?: string | null;
  onSelect: (avatarUrl: string) => void;
  userName: string;
}

export function AvatarPicker({ currentAvatarUrl, onSelect, userName }: AvatarPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Generate DiceBear URL via our proxy
  const getDiceBearUrl = (seed: string, bg: string) => {
    return `/api/avatar?style=avataaars&seed=${seed}&backgroundColor=${bg}&radius=50`;
  };

  const handleStaticSelect = (avatar: (typeof STATIC_AVATARS)[0]) => {
    setSelectedId(avatar.id);
    onSelect(avatar.src);
    setOpen(false);
  };

  const handleDiceBearSelect = (avatar: (typeof DICEBEAR_AVATARS)[0]) => {
    const url = getDiceBearUrl(avatar.seed, avatar.bg);
    setSelectedId(avatar.id);
    onSelect(url);
    setOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if current avatar is selected
  const isStaticSelected = (id: string) =>
    selectedId === id ||
    STATIC_AVATARS.find(a => a.id === id && a.src === currentAvatarUrl) ||
    ANIMAL_AVATARS.find(a => a.id === id && a.src === currentAvatarUrl);
  const isDiceBearSelected = (avatar: (typeof DICEBEAR_AVATARS)[0]) =>
    selectedId === avatar.id || currentAvatarUrl === getDiceBearUrl(avatar.seed, avatar.bg);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        Choose Avatar Style
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose Your Avatar</DialogTitle>
            <DialogDescription>
              Select a professional avatar that represents you. These avatars will be visible to
              your team.
            </DialogDescription>
          </DialogHeader>

          {/* Custom Call-Center Avatars */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Support Team Avatars</h4>
            <div className="grid grid-cols-5 gap-3">
              {STATIC_AVATARS.map(avatar => {
                const isSelected = isStaticSelected(avatar.id);
                return (
                  <button
                    key={avatar.id}
                    onClick={() => handleStaticSelect(avatar)}
                    className="group relative flex flex-col items-center gap-1.5"
                  >
                    <div
                      className={cn(
                        'relative rounded-full p-0.5 transition-all duration-200',
                        isSelected
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : 'hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background'
                      )}
                    >
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={avatar.src} alt={avatar.label} className="object-cover" />
                        <AvatarFallback className="text-xs font-semibold bg-muted">
                          {getInitials(userName)}
                        </AvatarFallback>
                      </Avatar>
                      {isSelected && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate max-w-full">
                      {avatar.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Animal Avatars */}
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-medium text-muted-foreground">Animal Friends</h4>
            <div className="grid grid-cols-5 gap-3">
              {ANIMAL_AVATARS.map(avatar => {
                const isSelected = isStaticSelected(avatar.id);
                return (
                  <button
                    key={avatar.id}
                    onClick={() => handleStaticSelect(avatar)}
                    className="group relative flex flex-col items-center gap-1.5"
                  >
                    <div
                      className={cn(
                        'relative rounded-full p-0.5 transition-all duration-200',
                        isSelected
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : 'hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background'
                      )}
                    >
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={avatar.src} alt={avatar.label} className="object-cover" />
                        <AvatarFallback className="text-xs font-semibold bg-muted">
                          {getInitials(userName)}
                        </AvatarFallback>
                      </Avatar>
                      {isSelected && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate max-w-full">
                      {avatar.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DiceBear Avataaars */}
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-medium text-muted-foreground">Professional Avatars</h4>
            <div className="grid grid-cols-5 gap-3">
              {DICEBEAR_AVATARS.map(avatar => {
                const isSelected = isDiceBearSelected(avatar);
                const url = getDiceBearUrl(avatar.seed, avatar.bg);
                return (
                  <button
                    key={avatar.id}
                    onClick={() => handleDiceBearSelect(avatar)}
                    className="group relative flex flex-col items-center gap-1.5"
                  >
                    <div
                      className={cn(
                        'relative rounded-full p-0.5 transition-all duration-200',
                        isSelected
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : 'hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background'
                      )}
                    >
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={url} alt={avatar.label} className="object-cover" />
                        <AvatarFallback className="text-xs font-semibold bg-muted">
                          {getInitials(userName)}
                        </AvatarFallback>
                      </Avatar>
                      {isSelected && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate max-w-full">
                      {avatar.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            Or upload your own photo from the main profile section
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
