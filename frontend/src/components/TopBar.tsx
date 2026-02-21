"use client";

import { useState, useEffect } from 'react';
import { Search, Bell, Moon, Sun, User } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function TopBar() {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [notificationCount, setNotificationCount] = useState(3); // Mock count

    useEffect(() => {
        if (document.documentElement.classList.contains('dark')) {
            setIsDarkMode(true);
        }

        // Fetch urgent tenders for notification count
        const fetchUrgentCount = async () => {
            const now = new Date();
            const fortyEightHours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

            const { count, error } = await supabase
                .from('tenders')
                .select('*', { count: 'exact', head: true })
                .gt('bid_end_date', now.toISOString())
                .lt('bid_end_date', fortyEightHours.toISOString())
                .eq('status', 'active');

            if (!error && count !== null) {
                setNotificationCount(count);
            }
        };

        fetchUrgentCount();
    }, []);

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    return (
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-8 sticky top-0 z-30">
            {/* Global Search */}
            <div className="flex-1 max-w-xl">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search tenders by ID, Client, or Amount..."
                        className="w-full bg-secondary border border-border rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleDarkMode}
                    className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                    title="Toggle Dark Mode"
                >
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <div className="relative">
                    <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors relative">
                        <Bell size={20} />
                        {notificationCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                                {notificationCount}
                            </span>
                        )}
                    </button>
                </div>

                <div className="h-8 w-px bg-border mx-2" />

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold leading-none">Admin User</p>
                        <p className="text-xs text-muted-foreground mt-1">kasjantechserve@gmail.com</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                        <User size={20} />
                    </div>
                </div>
            </div>
        </header>
    );
}
