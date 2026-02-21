"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRealtimeTenders, Tender } from '@/hooks/useRealtimeTenders';
import {
    FileText,
    Search,
    Filter,
    Download,
    Eye,
    MoreVertical,
    Loader2,
    Calendar,
    Tag,
    Clock
} from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

export default function TendersPage() {
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all');

    const { tenders, loading } = useRealtimeTenders(companyId);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                supabase
                    .from('users')
                    .select('company_id')
                    .eq('id', session.user.id)
                    .single()
                    .then(({ data }) => {
                        if (data) setCompanyId(data.company_id);
                    });
            }
        });
    }, []);

    const filteredTenders = tenders.filter(t => {
        const matchesSearch = (t.nickname || t.bid_number).toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || t.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-primary" size={40} />
                <p className="text-muted-foreground font-medium">Loading Tenders...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Tender Repository</h1>
                    <p className="text-muted-foreground">Manage and track all your government bids in one place.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Search by ID or nickname..."
                            className="pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all w-64"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filterStatus === 'all' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-card border border-border text-muted-foreground hover:border-primary/50'}`}
                >
                    All Tenders
                </button>
                <button
                    onClick={() => setFilterStatus('active')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filterStatus === 'active' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-card border border-border text-muted-foreground hover:border-green-500/50'}`}
                >
                    Active
                </button>
                <button
                    onClick={() => setFilterStatus('expired')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filterStatus === 'expired' ? 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20' : 'bg-card border border-border text-muted-foreground hover:border-destructive/50'}`}
                >
                    Expired
                </button>
            </div>

            <div className="bento-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider">Tender Info</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider">Category</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider">Deadline</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredTenders.map((tender) => (
                                <tr key={tender.id} className="group hover:bg-accent/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{tender.nickname || tender.bid_number}</p>
                                                <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{tender.subject || "No description availble"}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Tag size={14} />
                                            {tender.item_category || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium flex items-center gap-1.5">
                                                <Calendar size={14} className="text-muted-foreground" />
                                                {formatDate(tender.bid_end_date)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${tender.status === 'active'
                                                ? 'bg-green-500/10 text-green-500'
                                                : 'bg-destructive/10 text-destructive'
                                            }`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${tender.status === 'active' ? 'bg-green-500' : 'bg-destructive'}`} />
                                            {tender.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button title="View Details" className="p-2 hover:bg-background rounded-lg transition-colors text-muted-foreground hover:text-primary">
                                                <Eye size={18} />
                                            </button>
                                            <button title="Download PDF" className="p-2 hover:bg-background rounded-lg transition-colors text-muted-foreground hover:text-primary">
                                                <Download size={18} />
                                            </button>
                                            <button className="p-2 hover:bg-background rounded-lg transition-colors text-muted-foreground hover:text-primary">
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredTenders.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-medium">No tenders found matching your criteria.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
