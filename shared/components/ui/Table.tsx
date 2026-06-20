// import { createContext, ReactNode, useContext } from 'react';
// type ContextProps = {
//     columns: number;
// };
// const TableContext = createContext<ContextProps>({ columns: 0 });

// type TableProps = {
//     columns: number;
//     children: ReactNode;
// };
// function Table({ columns, children }: TableProps) {
//     <TableContext.Provider value={{ columns }}>
//         <div className="border border-gray-200 bg-transparent rounded-2xl overflow-hidden">
//             {children}
//         </div>
//     </TableContext.Provider>;
// }

// function Header() {
//     const { columns } = useContext(TableContext);
//     return (
//         <div className="py-5 px-9 bg-gray-50 border-b border-gray-100  text-gray-600"></div>
//     );
// }

'use client';
import { useRouter } from 'next/navigation';
import React, {
    createContext,
    useContext,
    ReactNode,
    CSSProperties,
    MouseEvent,
} from 'react';

interface TableContextType {
    columns: CSSProperties['gridTemplateColumns'];
    scroll: boolean;
    label: string;
}

const TableContext = createContext<TableContextType | null>(null);

interface TableProps {
    columns: CSSProperties['gridTemplateColumns'];
    label?: string;
    children: ReactNode;
    scroll?: boolean;
}

interface TableSectionProps {
    children: ReactNode;
}
interface TableSectionWithOnClickProps extends TableSectionProps {
    onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}
type TableRowProps = {
    children: ReactNode;
    onClick?: (e: MouseEvent<HTMLDivElement>) => void;

    isRedirectable?: boolean;
    to?: string;
};
function Table({ columns, scroll = false, label = '', children }: TableProps) {
    return (
        <TableContext.Provider value={{ columns, scroll, label }}>
            <div
                className={`flex flex-col h-full ${scroll ? 'overflow-hidden' : ''}`}
            >
                <div
                    className="flex-1 border border-surface-border bg-card rounded-xl shadow-lg flex flex-col overflow-hidden"
                >
                    {children}
                </div>
            </div>
        </TableContext.Provider>
    );
}

function Header({ children }: TableSectionProps) {
    const context = useContext(TableContext);
    if (!context) throw new Error('Header must be used inside Table');

    return (
        <div className="flex flex-col bg-surface border-b border-surface-border">
            {context.label && (
                <div className="px-5 py-4 border-b border-surface-border">
                    <span className="text-lg font-bold text-foreground tracking-tight">
                        {context.label}
                    </span>
                </div>
            )}
            <div
                style={{ gridTemplateColumns: context.columns }}
                className="grid items-center gap-x-2 px-4 py-3 uppercase tracking-wider font-bold text-muted-foreground text-xs"
            >
                {children}
            </div>
        </div>
    );
}

function Row({
    children,
    onClick,
    isRedirectable = false,
    to = '',
}: TableRowProps) {
    const context = useContext(TableContext);
    const router = useRouter();
    if (!context) throw new Error('Row must be used inside Table');
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // priority: custom click first
        onClick?.(e);

        // redirect logic
        if (isRedirectable && to) {
            router.push(to);
        }
    };
    return (
        <div
            style={{ gridTemplateColumns: context.columns }}
            className="grid items-center gap-x-2 px-4 py-3 border-b border-surface-border last:border-b-0 text-sm font-medium hover:bg-hover cursor-pointer transition-colors"
            onClick={handleClick}
        >
            {children}
        </div>
    );
}

interface BodyProps<T> {
    data: T[];
    render: (item: T, index: number) => ReactNode;
}

function Body<T>({ data, render }: BodyProps<T>) {
    const context = useContext(TableContext);

    if (!data.length)
        return (
            <div className="flex items-center justify-center h-full min-h-[150px]">
                <p className="text-sm font-medium text-muted-foreground">
                    No data to show at the moment
                </p>
            </div>
        );

    return (
        <div className={`flex-1 ${context?.scroll ? 'overflow-y-auto' : ''}`}>
            {data.map(render)}
        </div>
    );
}

function Footer({ children }: TableSectionProps) {
    if (!children) return null;

    return <div className="bg-surface border-t border-surface-border flex justify-center p-3 text-sm font-medium">{children}</div>;
}

Table.Header = Header;
Table.Row = Row;
Table.Body = Body;
Table.Footer = Footer;

export default Table;
