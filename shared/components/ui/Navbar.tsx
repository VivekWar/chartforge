'use client';
import Link from 'next/link';
import { useState } from 'react';
import ThemeSwitch from './ModeToggle';
import SearchSymbol from './SearchSymbol';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { usePathname } from 'next/navigation';
import AppLogo from './AppLogo';

const navLinks = [
    { name: 'Terminal', href: '/terminal' },
    { name: 'Watchlist', href: '/watchlist' },
];

// const navLinkClass =
//     'relative text-base font-medium text-muted-foreground transition-colors duration-200  after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-blue-600 after:transition-all after:duration-300 hover:after:w-full';
function getLinkClass(active: boolean) {
    return `relative text-base font-medium text-muted-foreground transition-colors duration-200  after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-blue-600 after:transition-all after:duration-300 ${active ? 'after:w-full' : 'hover:after:w-full'}`;
}
const avatarAppearance = {
    elements: {
        avatarBox: {
            height: '32px',
            width: '32px',
        },
    },
};

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathName = usePathname();
    return (
        <nav className="relative flex items-center justify-between h-14 md:h-16 w-full px-6 border-b border-surface-border bg-background z-50">
            {/* Logo */}
            <AppLogo />
            {/* Desktop Nav */}
            <ul className="hidden xl:flex items-center gap-8 ml-8 flex-1">
                {navLinks.map((link) => {
                    const isActive = pathName.startsWith(link.href);
                    return (
                        <li key={link.name}>
                            <Link
                                href={link.href}
                                className={`text-sm font-bold tracking-wide transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {link.name}
                            </Link>
                        </li>
                    );
                })}
            </ul>

            {/* Right Section Desktop */}
            <div className="hidden xl:flex items-center gap-4">
                <SearchSymbol isRedirect={true}>
                    <button className="flex items-center justify-center p-2 rounded-full hover:bg-surface transition-colors cursor-pointer text-muted-foreground hover:text-foreground">
                        <MagnifyingGlassIcon className="h-5 w-5" />
                    </button>
                </SearchSymbol>
                <ThemeSwitch />
            </div>

            {/* Mobile Right Section */}
            <div className="xl:hidden flex items-center gap-2 z-[100]">
                <SearchSymbol isRedirect={true}>
                    <button className="flex items-center justify-center p-2 rounded-full hover:bg-surface transition-colors cursor-pointer text-muted-foreground hover:text-foreground">
                        <MagnifyingGlassIcon className="h-5 w-5" />
                    </button>
                </SearchSymbol>
                <ThemeSwitch />

                <button
                    aria-label="Toggle menu"
                    aria-expanded={isOpen}
                    onClick={() => setIsOpen((prev) => !prev)}
                    className="flex flex-col justify-center gap-1.5 p-2 cursor-pointer rounded-md hover:bg-surface transition-colors ml-1"
                >
                    <span
                        className={`block w-5 h-[2px] bg-foreground transition-transform origin-center ${
                            isOpen ? 'rotate-45 translate-y-[8px]' : ''
                        }`}
                    />
                    <span
                        className={`block w-5 h-[2px] bg-foreground transition-opacity ${
                            isOpen ? 'opacity-0' : ''
                        }`}
                    />
                    <span
                        className={`block w-5 h-[2px] bg-foreground transition-transform origin-center ${
                            isOpen ? '-rotate-45 -translate-y-[8px]' : ''
                        }`}
                    />
                </button>
            </div>

            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm xl:hidden z-40 transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Mobile Drawer */}
            <div
                className={`fixed top-14 md:top-16 right-0 h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] w-full max-w-sm bg-surface border-l border-surface-border transform transition-transform duration-300 xl:hidden z-50 shadow-2xl ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <ul className="flex flex-col px-6 py-8 gap-4">
                    {navLinks.map((link) => {
                        const isActive = pathName.startsWith(link.href);
                        return (
                            <li key={link.name}>
                                <Link
                                    href={link.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center w-full px-4 py-3 rounded-lg text-base font-bold transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-hover hover:text-foreground'}`}
                                >
                                    {link.name}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </nav>
    );
}
