"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Bell,
    Search,
    Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function Sidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
        { name: 'Tenders', icon: FileText, href: '/tenders' },
        { name: 'Templates', icon: Plus, href: '/templates' },
        { name: 'Settings', icon: Settings, href: '/settings' },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <aside
            className={`h-screen bg-card border-r border-border transition-all duration-300 flex flex-col z-40 ${isCollapsed ? 'w-20' : 'w-64'
                }`}
        >
            {/* Header */}
            <div className="p-6 flex items-center justify-between">
                {!isCollapsed && (
                    <h1 className="text-xl font-extrabold text-primary tracking-tight">GEMtracker</h1>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <item.icon size={22} className={isActive ? 'text-primary-foreground' : 'group-hover:text-foreground'} />
                            {!isCollapsed && <span className="font-medium">{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-border mt-auto">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2 w-full rounded-lg hover:bg-destructive/10 text-destructive transition-colors group"
                >
                    <LogOut size={22} />
                    {!isCollapsed && <span className="font-medium">Logout</span>}
                </button>
            </div>
        </aside>
    );
}
