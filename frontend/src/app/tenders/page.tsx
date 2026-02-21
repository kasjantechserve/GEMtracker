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
    Clock,
    X,
    Edit2,
    Trash2,
    Send
} from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

export default function TendersPage() {
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all');
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [editingTender, setEditingTender] = useState<{ id: string, name: string } | null>(null);
    const [newNickname, setNewNickname] = useState('');

    const { tenders, loading, refetch } = useRealtimeTenders(companyId);

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

    const handleDownloadTender = async (tenderId: string, tenderName: string) => {
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

            const response = await fetch(`${apiUrl}/api/tenders/${tenderId}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to get download URL');
            const { download_url } = await response.json();

            const link = document.createElement('a');
            link.href = download_url;
            link.download = `${tenderName}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err: any) {
            alert(`Download failed: ${err.message}`);
        }
    };

    const handleViewTender = async (tenderId: string) => {
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

            const response = await fetch(`${apiUrl}/api/tenders/${tenderId}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to get view URL');
            const { download_url } = await response.json();
            setPdfPreviewUrl(download_url);
        } catch (err: any) {
            alert(`Could not open preview: ${err.message}`);
        }
    };

    const handleEditTender = async () => {
        if (!editingTender) return;
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

            const response = await fetch(`${apiUrl}/api/tenders/${editingTender.id}?nickname=${encodeURIComponent(newNickname)}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to update nickname');

            alert('Nickname updated successfully!');
            setEditingTender(null);
            refetch();
        } catch (err: any) {
            alert(`Update failed: ${err.message}`);
        }
    };

    const handleDeleteTender = async (tenderId: string, tenderName: string) => {
        if (!confirm(`Are you sure you want to delete the tender "${tenderName}"?`)) return;

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

            const response = await fetch(`${apiUrl}/api/tenders/${tenderId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Delete failed');
            alert('Tender deleted successfully!');
            refetch();
        } catch (err: any) {
            alert(`Delete failed: ${err.message}`);
        }
    };

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
                                            <button
                                                onClick={() => handleViewTender(tender.id)}
                                                title="Quick View"
                                                className="p-2 hover:bg-background rounded-lg transition-colors text-muted-foreground hover:text-primary"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDownloadTender(tender.id, tender.nickname || tender.bid_number)}
                                                title="Download PDF"
                                                className="p-2 hover:bg-background rounded-lg transition-colors text-muted-foreground hover:text-primary"
                                            >
                                                <Download size={18} />
                                            </button>
                                            <div className="relative group/menu">
                                                <button className="p-2 hover:bg-background rounded-lg transition-colors text-muted-foreground hover:text-primary">
                                                    <MoreVertical size={18} />
                                                </button>
                                                <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-xl z-20 hidden group-hover/menu:block text-left">
                                                    <button
                                                        onClick={() => {
                                                            setEditingTender({ id: tender.id, name: tender.nickname || tender.bid_number });
                                                            setNewNickname(tender.nickname || '');
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"
                                                    >
                                                        <Edit2 size={14} /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => alert('Reminder feature coming soon!')}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"
                                                    >
                                                        <Send size={14} /> Send Reminder
                                                    </button>
                                                    <div className="border-t border-border" />
                                                    <button
                                                        onClick={() => handleDeleteTender(tender.id, tender.nickname || tender.bid_number)}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-destructive/10 text-destructive flex items-center gap-2"
                                                    >
                                                        <Trash2 size={14} /> Delete
                                                    </button>
                                                </div>
                                            </div>
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
            {/* Modals */}
            {pdfPreviewUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2">
                                <FileText className="text-primary" size={20} /> PDF Preview
                            </h3>
                            <button onClick={() => setPdfPreviewUrl(null)} className="p-2 hover:bg-accent rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <iframe src={pdfPreviewUrl} className="flex-1 w-full border-none" title="PDF Preview" />
                    </div>
                </div>
            )}

            {editingTender && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold mb-4">Edit Tender Nickname</h3>
                        <p className="text-sm text-muted-foreground mb-6">Enter a familiar name for tender <span className="font-bold text-foreground">{editingTender.name}</span></p>

                        <input
                            type="text"
                            className="w-full px-4 py-2 bg-background border border-border rounded-xl mb-6 focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="e.g. Office Supplies 2026"
                            value={newNickname}
                            onChange={(e) => setNewNickname(e.target.value)}
                            autoFocus
                        />

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setEditingTender(null)} className="px-4 py-2 rounded-xl border border-border hover:bg-accent transition-all font-medium">Cancel</button>
                            <button onClick={handleEditTender} className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">Save Updates</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
