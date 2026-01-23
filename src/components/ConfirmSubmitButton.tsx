'use client';

import type { CSSProperties, ReactNode } from 'react';

type ConfirmSubmitButtonProps = {
    confirmMessage: string;
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
};

export default function ConfirmSubmitButton({
    confirmMessage,
    children,
    className,
    style
}: ConfirmSubmitButtonProps) {
    return (
        <button
            type="submit"
            className={className}
            style={style}
            onClick={(e) => {
                // eslint-disable-next-line no-alert
                if (!confirm(confirmMessage)) {
                    e.preventDefault();
                }
            }}
        >
            {children}
        </button>
    );
}
