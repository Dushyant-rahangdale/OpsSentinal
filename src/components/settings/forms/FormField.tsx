'use client';

import {
  useFormContext,
  Controller,
  type ControllerRenderProps,
  type FieldValues,
} from 'react-hook-form';
import { Label } from '@/components/ui/shadcn/label';
import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/shadcn/tooltip';

interface FormFieldProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  tooltip?: string;
  children:
    | React.ReactNode
    | ((field: ControllerRenderProps<FieldValues, string>) => React.ReactNode);
  className?: string;
}

export function FormField({
  name,
  label,
  description,
  required,
  tooltip,
  children,
  className,
}: FormFieldProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const error = errors[name];
  const errorMessage = error?.message as string | undefined;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className={cn('space-y-2', className)}>
          <div className="flex items-center gap-2">
            <Label htmlFor={name} className="text-sm font-medium">
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {tooltip && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`More information about ${label}`}
                      className="inline-flex rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <HelpCircle aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start" className="max-w-xs leading-relaxed">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          {typeof children === 'function' ? children(field) : children}
          {errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}
        </div>
      )}
    />
  );
}

export default FormField;
