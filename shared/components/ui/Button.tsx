import React, { ReactNode } from 'react';
interface Props {
    active: boolean;
    children: ReactNode;
    onButtonClick?: () => void;
}
export default function Button({ active, children, onButtonClick }: Props) {
    return (
        <button
            className={`flex items-center justify-center gap-2 px-3 md:px-4 py-1.5 text-xs md:text-sm font-semibold rounded-md transition-all cursor-pointer ${
                active 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'bg-surface hover:bg-hover text-muted-foreground hover:text-foreground border border-surface-border'
            }`}
            onClick={() => {
                onButtonClick?.();
            }}
        >
            {children}
        </button>
    );
}
