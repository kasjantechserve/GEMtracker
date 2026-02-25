"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRealtimeTenders, Tender } from '@/hooks/useRealtimeTenders';
import {
    LayoutDashboard,
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ClipboardPaste,
    Image as ImageIcon,
    Check,
    X,
    ChevronRight,
    Search,
    Filter,
    ArrowUpRight,
    Send
} from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

interface TenderUpdate {
    bid_number: string;
    evaluation_status: string;
    ra_status?: string;
    result_details?: string;
}

export default function ParticipatedTendersPage() {
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [analyzingScreenshot, setAnalyzingScreenshot] = useState(false);
    const [pendingUpdates, setPendingUpdates] = useState<TenderUpdate[]>([]);
    const [isPasting, setIsPasting] = useState(false);

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

    // Filter for participated tenders
    const participatedTenders = tenders.filter(t =>
        t.is_participated &&
        (t.bid_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.nickname || '').toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Filter for pending evaluation
    const pendingTenders = participatedTenders.filter(t =>
        t.evaluation_status !== 'Awarded' && t.evaluation_status !== 'Disqualified'
    );

    const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        let imageFile: File | null = null;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                imageFile = items[i].getAsFile();
                break;
            }
        }

        if (imageFile) {
            await uploadScreenshot(imageFile);
        }
    }, []);

    const uploadScreenshot = async (file: File) => {
        setAnalyzingScreenshot(true);
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${apiUrl}/api/tenders/analyze-screenshot`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Analysis failed' }));
                throw new Error(errorData.detail || `Analysis failed (Status: ${response.status})`);
            }

            const data = await response.json();
            setPendingUpdates(data.updates);
        } catch (err: any) {
            alert(`Error analyzing screenshot: ${err.message}`);
        } finally {
            setAnalyzingScreenshot(false);
        }
    };

    const applyUpdates = async () => {
        try {
            for (const update of pendingUpdates) {
                // Find tender by bid number
                const tender = tenders.find(t => t.bid_number === update.bid_number);
                if (tender) {
                    await supabase
                        .from('tenders')
                        .update({
                            evaluation_status: update.evaluation_status,
                            is_participated: true // Ensure it's marked as participated if seen in portal
                        })
                        .eq('id', tender.id);
                }
            }
            alert('Tenders updated successfully!');
            setPendingUpdates([]);
            refetch();
        } catch (err: any) {
            alert(`Update failed: ${err.message}`);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-primary" size={40} />
                <p className="text-muted-foreground font-medium">Loading Participated Tenders...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10" onPaste={handlePaste}>
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
                        <Send className="text-primary" size={28} />
                        Participated Bids
                    </h1>
                    <p className="text-muted-foreground">Track results for tenders you have participated in.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Search bids..."
                            className="pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all w-64"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {/* Paste Dropzone */}
            <div
                className={`bento-card border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 text-center gap-3 ${analyzingScreenshot ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 cursor-pointer'
                    }`}
            >
                {analyzingScreenshot ? (
                    <>
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <p className="font-bold text-lg">Analyzing Screenshot...</p>
                        <p className="text-sm text-muted-foreground">Extracting bid numbers and evaluation cycles</p>
                    </>
                ) : (
                    <>
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                            <ClipboardPaste size={24} />
                        </div>
                        <p className="font-bold text-lg">Quick Update from Portal</p>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Paste (Ctrl+V) a screenshot of the GeM portal "Results Pending" table here to automatically update your dashboard.
                        </p>
                    </>
                )}
            </div>

            {/* Pending Updates Review */}
            {pendingUpdates.length > 0 && (
                <div className="bento-card border-primary/30 bg-primary/5 animate-in slide-in-from-top duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <ImageIcon className="text-primary" size={20} />
                            Extracted Updates ({pendingUpdates.length})
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={() => setPendingUpdates([])} className="px-3 py-1.5 text-xs font-bold border border-border rounded-lg hover:bg-card transition-colors">Discard</button>
                            <button onClick={applyUpdates} className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">Apply All Updates</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {pendingUpdates.map((update, idx) => (
                            <div key={idx} className="bg-card p-3 rounded-xl border border-primary/10 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-primary">{update.bid_number}</p>
                                    <p className="text-xs text-muted-foreground">{update.evaluation_status}</p>
                                </div>
                                <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                    <Check size={14} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tenders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {participatedTenders.length > 0 ? (
                    participatedTenders.map((tender) => (
                        <div key={tender.id} className="bento-card group hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <FileText size={20} />
                                </div>
                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${tender.evaluation_status === 'Awarded'
                                    ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                    }`}>
                                    {tender.evaluation_status || 'Participated'}
                                </span>
                            </div>

                            <h3 className="font-bold text-sm mb-1 line-clamp-1">{tender.nickname || tender.bid_number}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-4 h-8">{tender.subject || 'No description'}</p>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                        <Clock size={12} /> Deadline:
                                    </span>
                                    <span className="font-medium">{formatDate(tender.bid_end_date)}</span>
                                </div>

                                {/* Progress Bar for Evaluation Stages */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground/60">
                                        <span>Tech</span>
                                        <span>Fin</span>
                                        <span>Award</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                                        <div className={`h-full transition-all duration-500 ${['Technical Evaluation', 'Financial Evaluation', 'Awarded'].includes(tender.evaluation_status || '') ? 'bg-primary w-1/3' : 'w-0'
                                            }`} />
                                        <div className={`h-full transition-all duration-500 ${['Financial Evaluation', 'Awarded'].includes(tender.evaluation_status || '') ? 'bg-primary w-1/3 border-l border-background/20' : 'w-0'
                                            }`} />
                                        <div className={`h-full transition-all duration-500 ${['Awarded'].includes(tender.evaluation_status || '') ? 'bg-green-500 w-1/3 border-l border-background/20' : 'w-0'
                                            }`} />
                                    </div>
                                </div>
                            </div>

                            <button className="w-full py-2 bg-muted hover:bg-primary hover:text-primary-foreground rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 group/btn">
                                View Details <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full bento-card border-dashed py-20 flex flex-col items-center justify-center text-center text-muted-foreground/60">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6 opacity-40">
                            <AlertCircle size={32} />
                        </div>
                        <p className="font-bold text-foreground/80 mb-2">No Participated Bids Found</p>
                        <p className="text-xs max-w-[200px] leading-relaxed mb-6">You haven't marked any tenders as participated yet, or none match your search.</p>
                        <p className="text-xs bg-muted px-4 py-2 rounded-lg">
                            <span className="font-bold text-primary">Pro Tip:</span> Paste a screenshot of your portal results to get started quickly.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
