import type { Metadata } from 'next';
import '@/app/_styles/globals.css';
import ThemeProvider from '@/shared/providers/theme-provider';
export const metadata: Metadata = {
    title: {
        template: '%s • ChartForge',
        default: 'ChartForge',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="h-[100dvh] w-screen overflow-hidden flex flex-col">
                <ThemeProvider>{children}</ThemeProvider>
            </body>
        </html>
    );
}
