"use client";

import { useEffect, useState, useRef } from 'react'
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
    FileUp
} from 'lucide-react'
import Checklist from '@/components/Checklist'

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null)
    const [companyId, setCompanyId] = useState<string | null>(null)
    const [selectedTender, setSelectedTender] = useState<Tender | null>(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
    const [isEditingNickname, setIsEditingNickname] = useState(false)
    const [newNickname, setNewNickname] = useState('')
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
    const router = useRouter()

    const { tenders, loading, error: realtimeError, refetch } = useRealtimeTenders(companyId)

    useEffect(() => {
        // Check authentication
        supabase.auth.getSession().then(({ data: { session }, error: authError }) => {
            if (authError) {
                setError(`Auth Error: ${authError.message}`)
                return
            }
            if (!session) {
                router.push('/login')
            } else {
                setUser(session.user)

                // Get user's company_id
                supabase
                    .from('users')
                    .select('company_id')
                    .eq('id', session.user.id)
                    .single()
                    .then(({ data, error: profileError }) => {
                        if (profileError) {
                            setError(`Profile Error: ${profileError.message} - Please ensure your user record exists in the public.users table.`)
                        } else if (data) {
                            setCompanyId(data.company_id)
                        } else {
                            setError('No profile data found for this user.')
                        }
                    })
            }
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                router.push('/login')
            }
        })

        return () => subscription.unsubscribe()
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

            console.log('Attempting upload to:', `${apiUrl}/api/upload/`)

            const response = await fetch(`${apiUrl}/api/upload/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
                throw new Error(errorData.detail || `Upload failed with status ${response.status}`)
            }

            console.log('Upload successful!')
            alert('PDF uploaded successfully!')
            // Tenders will update via real-time subscription
        } catch (err: any) {
            console.error('Upload error detail:', err)
            alert(`Upload failed: ${err.message}`)
        } finally {
            setUploading(false)
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

    const handleUpdateNickname = async () => {
        if (!selectedTender) return

        try {
            const { error } = await supabase
                .from('tenders')
                .update({ nickname: newNickname })
                .eq('id', selectedTender.id)

            if (error) throw error

            setSelectedTender(prev => prev ? { ...prev, nickname: newNickname } : null)
            setIsEditingNickname(false)
        } catch (err: any) {
            alert('Failed to update nickname: ' + err.message)
        }
    }

    const handleDownloadPdf = async (tenderId: string) => {
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token
            const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
            const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl

            const response = await fetch(`${apiUrl}/api/tenders/${tenderId}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Download failed')

            const data = await response.json()
            window.open(data.download_url, '_blank')
        } catch (err: any) {
            alert('Failed to download PDF: ' + err.message)
        }
    }

    const openPdfPreview = async (tender: Tender) => {
        if (!tender.file_path) return

        try {
            const { data, error } = await supabase.storage
                .from('tender-pdfs')
                .createSignedUrl(tender.file_path, 3600)

            if (error) throw error
            setPdfPreviewUrl(data.signedUrl)
        } catch (err: any) {
            alert('Failed to load preview: ' + err.message)
        }
    }

    const calculateTimeRemaining = (endDateStr: string | null) => {
        if (!endDateStr) return "N/A"
        const end = new Date(endDateStr)
        const now = new Date()
        const diff = end.getTime() - now.getTime()

        if (diff <= 0) return "Expired"

        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

        return `${days}d ${hours}h`
    }

    const updateChecklist = async (itemId: string, updates: any) => {
        try {
            const { error } = await supabase
                .from('checklist_items')
                .update(updates)
                .eq('id', itemId)

            if (error) throw error

            // Sync selected tender state if needed
            if (selectedTender) {
                const updatedItems = selectedTender.checklist_items?.map(item =>
                    item.id === itemId ? { ...item, ...updates } : item
                )
                setSelectedTender({ ...selectedTender, checklist_items: updatedItems })
            }
        } catch (err) {
            console.error('Update error:', err)
        }
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-red-50">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200 max-w-lg w-full">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Dashboard Loading Error</h2>
                    <p className="text-gray-700 mb-6">{error}</p>
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                        >
                            Retry Loading
                        </button>
                        <button
                            onClick={() => supabase.auth.signOut()}
                            className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!user || !companyId) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium">Loading Dashboard...</p>
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-gray-100 p-8">
            <header className="mb-8 flex justify-between items-center bg-white p-6 rounded-xl shadow-md border-b-4 border-blue-900">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight">GEMtracker <span className="text-sm font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded">v2.0 Cloud</span></h1>
                        <p className="text-gray-500 font-medium">Enterprise Tender Management</p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border">
                        <Clock size={14} />
                        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className={`ml-2 p-1 hover:bg-gray-200 rounded-full transition ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
                            title="Refresh Data"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900 font-semibold transition"
                    >
                        Sign Out
                    </button>
                    <label className={`cursor-pointer flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform active:scale-95 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        {uploading ? <Loader2 className="animate-spin" size={20} /> : <FileUp size={20} />}
                        <span className="font-bold">{uploading ? 'Processing...' : 'Upload PDF'}</span>
                        <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
                    </label>
                </div>
            </header>

            {error && (
                <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar: Tender List */}
                <div className="lg:col-span-1">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Active Tenders</h2>
                    <div className="bg-white rounded-xl shadow-md overflow-hidden divide-y">
                        {loading ? (
                            <p className="p-4 text-gray-400 text-center">Loading...</p>
                        ) : tenders.length === 0 ? (
                            <p className="p-4 text-gray-400 text-center">No tenders found.</p>
                        ) : (
                            tenders.map(tender => (
                                <button
                                    key={tender.id}
                                    onClick={() => setSelectedTender(tender)}
                                    className={`w-full text-left p-4 hover:bg-blue-50 transition flex flex-col gap-1 border-l-4 ${selectedTender?.id === tender.id ? 'bg-blue-50 border-blue-500' : 'border-transparent'
                                        }`}
                                >
                                    <span className="font-semibold text-gray-900 truncate">{tender.nickname || tender.bid_number}</span>
                                    <span className="text-sm text-gray-700 truncate">{tender.subject || "No Subject"}</span>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${calculateTimeRemaining(tender.bid_end_date) === "Expired"
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-green-100 text-green-700'
                                            }`}>
                                            {calculateTimeRemaining(tender.bid_end_date)}
                                        </span>
                                        <span className="text-xs text-gray-500 font-medium">
                                            {tender.bid_end_date ? new Date(tender.bid_end_date).toLocaleDateString() : 'No date'}
                                        </span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Content: Checklist */}
                <div className="lg:col-span-3">
                    {selectedTender ? (
                        <div className="bg-white rounded-xl shadow-md p-8 border-t-4 border-blue-600">
                            <div className="mb-8 border-b pb-6 flex justify-between items-start">
                                <div className="flex-1">
                                    {isEditingNickname ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={newNickname}
                                                onChange={(e) => setNewNickname(e.target.value)}
                                                className="text-2xl font-bold text-gray-800 border-b-2 border-blue-600 focus:outline-none bg-blue-50 px-2 py-1 rounded"
                                                autoFocus
                                            />
                                            <button onClick={handleUpdateNickname} className="p-2 text-green-600 hover:bg-green-50 rounded-full transition"><Check size={24} /></button>
                                            <button onClick={() => setIsEditingNickname(false)} className="p-2 text-red-600 hover:bg-red-50 rounded-full transition"><X size={24} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 group">
                                            <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">
                                                {selectedTender.nickname || selectedTender.bid_number}
                                            </h2>
                                            <button
                                                onClick={() => {
                                                    setNewNickname(selectedTender.nickname || '')
                                                    setIsEditingNickname(true)
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition opacity-0 group-hover:opacity-100"
                                                title="Edit Nickname"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-4 mt-4">
                                        <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full border">
                                            <FileText size={14} />
                                            <span className="font-bold">Bid:</span> {selectedTender.bid_number}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full border">
                                            <ChevronRight size={14} />
                                            <span className="font-bold">Category:</span> {selectedTender.item_category || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openPdfPreview(selectedTender)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-semibold transition shadow-sm"
                                        title="Quick Preview"
                                    >
                                        <Eye size={18} />
                                        <span>Quick View</span>
                                    </button>
                                    <button
                                        onClick={() => handleDownloadPdf(selectedTender.id)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 font-semibold transition shadow-sm"
                                        title="Download Original"
                                    >
                                        <Download size={18} />
                                        <span>Download</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                                    <Check size={20} className="text-green-600" />
                                    Compliance Documents
                                </h3>
                                <div className="text-sm text-gray-500 font-medium italic">
                                    * Max 10MB per document
                                </div>
                            </div>

                            <Checklist
                                items={selectedTender.checklist_items || []}
                                onUpdate={updateChecklist}
                            />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl shadow-md p-10 text-gray-400 border-2 border-dashed border-gray-200">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <FileText size={32} className="text-gray-300" />
                            </div>
                            <p className="text-lg font-medium text-gray-500">Select a tender from the sidebar to begin compliance management</p>
                            <p className="text-sm">Real-time status tracking and document storage is active.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* PDF Preview Modal */}
            {pdfPreviewUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl relative">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                                <FileText size={20} />
                                Document Preview
                            </h3>
                            <button
                                onClick={() => setPdfPreviewUrl(null)}
                                className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500 hover:text-red-600"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 bg-gray-100 rounded-b-2xl overflow-hidden">
                            <iframe
                                src={pdfPreviewUrl}
                                className="w-full h-full border-none"
                                title="PDF Preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
