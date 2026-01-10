'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/shadcn/alert-dialog';
import { Trash2 } from 'lucide-react';

type DeleteIntegrationButtonProps = {
  action: (formData: FormData) => void;
  integrationName: string;
};

export default function DeleteIntegrationButton({
  action,
  integrationName,
}: DeleteIntegrationButtonProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    const formData = new FormData();
    action(formData);
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Integration</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the integration{' '}
            <span className="font-semibold text-foreground">"{integrationName}"</span>?
            <br />
            This will stop receiving alerts from this source. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={e => {
              e.preventDefault();
              handleConfirm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Yes, Delete Integration
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
