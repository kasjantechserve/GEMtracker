"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
    User,
    Building2,
    Bell,
    Shield,
    Mail,
    Save,
    Loader2,
    Lock,
    ExternalLink
} from 'lucide-react';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [companyData, setCompanyData] = useState<any>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: user } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

            setUserData(user);

            if (user?.company_id) {
                const { data: company } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('id', user.company_id)
                    .single();
                setCompanyData(company);
            }
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-primary" size={40} />
                <p className="text-muted-foreground font-medium">Loading Settings...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-8">
            <header>
                <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account preferences and company information.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Sidebar */}
                <aside className="space-y-1">
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium transition-all">
                        <User size={18} /> Profile
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-accent text-muted-foreground transition-all">
                        <Building2 size={18} /> Company
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-accent text-muted-foreground transition-all">
                        <Bell size={18} /> Notifications
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-accent text-muted-foreground transition-all">
                        <Shield size={18} /> Security
                    </button>
                </aside>

                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    <section className="bento-card">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <User className="text-primary" size={20} /> Personal Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Full Name</label>
                                <input
                                    type="text"
                                    defaultValue={userData?.full_name || ''}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Email Address</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        defaultValue={userData?.email || ''}
                                        disabled
                                        className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-muted-foreground cursor-not-allowed"
                                    />
                                    <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30" />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bento-card">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Building2 className="text-primary" size={20} /> Company Details
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Company Name</label>
                                <input
                                    type="text"
                                    defaultValue={companyData?.name || ''}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground">GSTIN (Verified)</label>
                                <input
                                    type="text"
                                    defaultValue={companyData?.gstin || ''}
                                    disabled
                                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-muted-foreground cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end gap-3">
                        <button className="px-6 py-2.5 rounded-lg border border-border font-medium hover:bg-accent transition-all">
                            Cancel
                        </button>
                        <button
                            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95"
                            onClick={() => {
                                setSaving(true);
                                setTimeout(() => {
                                    setSaving(false);
                                    alert('Settings updated successfully!');
                                }, 1000);
                            }}
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Save Changes
                        </button>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-3">
                        <Shield className="text-primary shrink-0" size={20} />
                        <div>
                            <p className="text-sm font-bold text-primary">Need higher permissions?</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Contact your administrator to change company-wide settings or billing information.</p>
                            <button className="text-xs font-bold text-primary mt-2 flex items-center gap-1 hover:underline">
                                Request Admin Access <ExternalLink size={12} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
