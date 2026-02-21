"use client";

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRealtimeTenders, Tender } from '@/hooks/useRealtimeTenders'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import {
    RefreshCw,
    FileText,
    Download,
    Eye,
    Edit2,
    Check,
    X,
    Clock,
    ChevronRight,
    Loader2,
    FileUp,
    MoreVertical,
    Send,
    Trash2,
    AlertCircle,
    Calendar,
    Layers,
    Plus
} from 'lucide-react'
import Checklist from '@/components/Checklist'
import { formatDate } from '@/lib/dateUtils'

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null)
    const [companyId, setCompanyId] = useState<string | null>(null)
    const [selectedTender, setSelectedTender] = useState<Tender | null>(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const router = useRouter()

    const { tenders, loading, error: realtimeError, refetch } = useRealtimeTenders(companyId)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session }, error: authError }) => {
            if (authError) {
                setError(`Auth Error: ${authError.message}`)
                return
            }
            if (!session) {
                router.push('/login')
            } else {
                setUser(session.user)
                supabase
                    .from('users')
                    .select('company_id')
                    .eq('id', session.user.id)
                    .single()
                    .then(({ data, error: profileError }) => {
                        if (profileError) {
                            setError(`Profile Error: ${profileError.message}`)
                        } else if (data) {
                            setCompanyId(data.company_id)
                        }
                    })
            }
        })
    }, [router])

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return
        setUploading(true)
        const file = e.target.files[0]
        const formData = new FormData()
        formData.append('file', file)

        try {
            const session = await supabase.auth.getSession()
            const token = session.data.session?.access_token
            const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
            const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl

            const response = await fetch(`${apiUrl}/api/upload/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })

            if (!response.ok) throw new Error('Upload failed')
            alert('PDF uploaded successfully!')
        } catch (err: any) {
            alert(`Upload failed: ${err.message}`)
        } finally {
            setUploading(false)
        }
    }

    const handleDeleteTender = async (tenderId: string, tenderName: string) => {
        if (!confirm(`Are you sure you want to delete the tender "${tenderName}"? This action cannot be undone.`)) {
            return
        }

        try {
            const session = await supabase.auth.getSession()
            const token = session.data.session?.access_token
            const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
            const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl

            const response = await fetch(`${apiUrl}/api/tenders/${tenderId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) {
                const err = await response.json().catch(() => ({ detail: 'Failed to delete' }))
                throw new Error(err.detail || 'Delete failed')
            }

            alert('Tender deleted successfully!')
            if (selectedTender?.id === tenderId) {
                setSelectedTender(null)
            }
            window.location.reload()
        } catch (err: any) {
            alert(`Delete failed: ${err.message}`)
        }
    }

    const handleRefresh = async () => {
        setIsRefreshing(true)
        try {
            await refetch()
            setLastUpdated(new Date())
        } finally {
            setIsRefreshing(false)
        }
    }

    const getUrgencyStyles = (endDateStr: string | null) => {
        if (!endDateStr) return ""
        const end = new Date(endDateStr)
        const now = new Date()
        const diff = end.getTime() - now.getTime()
        const diffHours = diff / (1000 * 60 * 60)
        const diffDays = diffHours / 24

        if (diff <= 0) return "bg-destructive/10 text-destructive border-destructive/20"
        if (diffHours < 24) return "pulse-red border-red-500/50"
        if (diffDays < 7) return "bg-[var(--urgency-warning)] text-[var(--urgency-warning-text)] border-amber-500/30"
        return "bg-card border-border"
    }

    const calculateTimeRemaining = (endDateStr: string | null) => {
        if (!endDateStr) return "N/A"
        const end = new Date(endDateStr)
        const now = new Date()
        const diff = end.getTime() - now.getTime()
        if (diff <= 0) return "Expired"
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        return days > 0 ? `${days}d ${hours}h` : `${hours}h remaining`
    }

    const filteredTenders = tenders.filter(t =>
        (t.nickname || t.bid_number).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.subject || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (!user || !companyId) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-primary" size={40} />
                <p className="text-muted-foreground font-medium">Loading Dashboard...</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* KPI Section - Bento Style */}
            <section className="bento-grid">
                <div className="bento-card border-l-4 border-l-primary flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Tenders</h3>
                        <Layers className="text-primary" size={20} />
                    </div>
                    <p className="text-4xl font-extrabold mt-2">{tenders.length}</p>
                    <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                        <span className="text-green-500 font-bold">+2</span> from last week
                    </p>
                </div>

                <div className="bento-card border-l-4 border-l-red-500 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Expiring Soon</h3>
                        <Clock className="text-red-500" size={20} />
                    </div>
                    <p className="text-4xl font-extrabold mt-2 text-red-500">
                        {tenders.filter(t => {
                            const diff = new Date(t.bid_end_date || '').getTime() - new Date().getTime()
                            return diff > 0 && diff < (7 * 24 * 60 * 60 * 1000)
                        }).length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-4">Needs immediate action</p>
                </div>

                <div className="bento-card border-l-4 border-l-amber-500 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">In Progress</h3>
                        <RefreshCw className="text-amber-500" size={20} />
                    </div>
                    <p className="text-4xl font-extrabold mt-2">
                        {tenders.filter(t => t.status === 'active').length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-4">Active submissions</p>
                </div>

                <div className="bento-card bg-primary text-primary-foreground border-none flex flex-col justify-center items-center text-center cursor-pointer hover:bg-primary/90 transition-colors group relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="z-10">
                        <div className="h-12 w-12 rounded-full bg-primary-foreground/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <Plus className="text-primary-foreground" size={24} />
                        </div>
                        <h3 className="font-bold">New Tender</h3>
                        <p className="text-xs text-primary-foreground/70 mt-1">Upload PDF to start</p>
                    </div>
                    <input type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUpload} disabled={uploading} />
                </div>
            </section>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left: Tender Table */}
                <div className="xl:col-span-2 bento-card overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <FileText className="text-primary" size={22} />
                            Active Submissions
                        </h2>
                        <div className="flex gap-2">
                            <button onClick={handleRefresh} disabled={isRefreshing} className="p-2 hover:bg-accent rounded-lg transition-colors">
                                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto -mx-6">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/50 border-y border-border">
                                    <th className="px-6 py-3 text-xs font-bold uppercase text-muted-foreground tracking-wider">Tender Details</th>
                                    <th className="px-6 py-3 text-xs font-bold uppercase text-muted-foreground tracking-wider">Deadline</th>
                                    <th className="px-6 py-3 text-xs font-bold uppercase text-muted-foreground tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredTenders.map((tender) => (
                                    <tr
                                        key={tender.id}
                                        onClick={() => setSelectedTender(tender)}
                                        className={`group cursor-pointer hover:bg-accent/50 transition-colors ${selectedTender?.id === tender.id ? 'bg-primary/5' : ''
                                            } ${getUrgencyStyles(tender.bid_end_date)}`}
                                    >
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-sm">{tender.nickname || tender.bid_number}</p>
                                            <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">{tender.subject || "No details extracted"}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{formatDate(tender.bid_end_date)}</span>
                                                <span className="text-[10px] font-bold uppercase opacity-70">{calculateTimeRemaining(tender.bid_end_date)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${tender.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
                                                }`}>
                                                {tender.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 hover:bg-background rounded transition-colors text-muted-foreground hover:text-primary">
                                                    <Eye size={16} />
                                                </button>
                                                <button className="p-1.5 hover:bg-background rounded transition-colors text-muted-foreground hover:text-primary">
                                                    <Download size={16} />
                                                </button>
                                                <div className="relative group/menu">
                                                    <button className="p-1.5 hover:bg-background rounded transition-colors text-muted-foreground hover:text-primary">
                                                        <MoreVertical size={16} />
                                                    </button>
                                                    {/* Quick Action Hub */}
                                                    <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-xl z-20 hidden group-hover/menu:block">
                                                        <button className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2">
                                                            <Edit2 size={14} /> Edit
                                                        </button>
                                                        <button className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2">
                                                            <Send size={14} /> Send Reminder
                                                        </button>
                                                        <div className="border-t border-border" />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteTender(tender.id, tender.nickname || tender.bid_number);
                                                            }}
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
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Compliance Overview */}
                <div className="xl:col-span-1 space-y-8">
                    {selectedTender ? (
                        <div className="bento-card bg-primary/5 border-primary/20 animate-in fade-in slide-in-from-right duration-300">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg">Compliance Hub</h3>
                                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">{selectedTender.bid_number}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-6">{selectedTender.nickname || "No nickname set"}</p>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Check className="text-green-500" size={18} />
                                        <span className="text-sm font-medium">Ready Items</span>
                                    </div>
                                    <span className="font-bold">{selectedTender.checklist_items?.filter(i => i.is_ready).length || 0}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Clock className="text-amber-500" size={18} />
                                        <span className="text-sm font-medium">Pending</span>
                                    </div>
                                    <span className="font-bold">{selectedTender.checklist_items?.filter(i => !i.is_ready).length || 0}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedTender(null)}
                                className="w-full mt-6 py-3 bg-card hover:bg-accent border border-border rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                Close Details <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="bento-card border-dashed flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                            <AlertCircle size={40} className="mb-4 opacity-20" />
                            <p className="font-medium text-sm">Select a tender for checklist management</p>
                        </div>
                    )}

                    {/* Quick Stats/Tips */}
                    <div className="bento-card bg-card">
                        <h3 className="font-bold text-sm mb-4 uppercase tracking-wider opacity-60">Pro Tip</h3>
                        <p className="text-sm italic">"Tenders with higher urgency are pulsing in red. Complete the compliance checklist at least 48 hours before the deadline."</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
