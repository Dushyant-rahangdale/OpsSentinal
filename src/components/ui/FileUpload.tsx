'use client';

import { useState, DragEvent, ChangeEvent, ReactNode } from 'react';

interface FileUploadProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  onUpload?: (files: File[]) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
}

export default function FileUpload({
  label,
  accept,
  multiple = false,
  maxSize,
  onUpload,
  error,
  helperText,
  required,
  fullWidth,
  className = '',
  children,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      return `File size exceeds ${maxSize}MB limit`;
    }
    return null;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      const newFiles = multiple ? [...uploadedFiles, ...validFiles] : validFiles;
      setUploadedFiles(newFiles);
      onUpload?.(newFiles);
    }

    if (errors.length > 0) {
      console.error('File upload errors:', errors);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleRemove = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onUpload?.(newFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={`ui-file-upload ${fullWidth ? 'ui-file-upload-full-width' : ''} ${className}`} style={{ width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: 'var(--spacing-2)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          {label}
          {required && <span style={{ color: 'var(--color-error)', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? 'var(--primary)' : error ? 'var(--color-error)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-8)',
          textAlign: 'center',
          background: isDragging ? 'var(--color-neutral-50)' : 'var(--bg-secondary)',
          cursor: 'pointer',
          transition: 'all var(--transition-base) var(--ease-out)',
        }}
        onClick={() => document.getElementById(`file-input-${label}`)?.click()}
      >
        <input
          id={`file-input-${label}`}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
        {children || (
          <>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-2)' }}>📁</div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-1)' }}>
              Drag and drop files here, or click to select
            </div>
            {accept && (
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                Accepted: {accept}
              </div>
            )}
            {maxSize && (
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                Max size: {maxSize}MB
              </div>
            )}
          </>
        )}
      </div>
      {uploadedFiles.length > 0 && (
        <div style={{ marginTop: 'var(--spacing-4)' }}>
          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-2)' }}>
            Uploaded Files ({uploadedFiles.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--spacing-2) var(--spacing-3)',
                  background: 'var(--color-neutral-50)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                  <span>📄</span>
                  <div>
                    <div style={{ fontWeight: 500 }}>{file.name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-error)',
                    cursor: 'pointer',
                    padding: 'var(--spacing-1)',
                    fontSize: 'var(--font-size-lg)',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {error && (
        <div
          style={{
            marginTop: 'var(--spacing-2)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-error)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {helperText && !error && (
        <div
          style={{
            marginTop: 'var(--spacing-2)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-muted)',
          }}
        >
          {helperText}
        </div>
      )}
    </div>
  );
}


