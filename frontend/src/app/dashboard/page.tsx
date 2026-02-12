'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRealtimeTenders, Tender } from '@/hooks/useRealtimeTenders'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null)
    const [companyId, setCompanyId] = useState<string | null>(null)
    const [selectedTender, setSelectedTender] = useState<Tender | null>(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const { tenders, loading, error: realtimeError } = useRealtimeTenders(companyId)

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
            // UI will update via real-time subscription
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
            <header className="mb-8 flex justify-between items-center bg-white p-6 rounded-xl shadow-md">
                <div>
                    <h1 className="text-3xl font-extrabold text-blue-900">GEMtracker</h1>
                    <p className="text-gray-500">Real-time Tender Management</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                        Sign Out
                    </button>
                    <label className={`cursor-pointer px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${uploading ? 'opacity-50' : ''}`}>
                        {uploading ? 'Uploading...' : '+ Upload PDF'}
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
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <div className="mb-6 border-b pb-4">
                                <h2 className="text-2xl font-bold text-gray-800">{selectedTender.nickname || selectedTender.bid_number}</h2>
                                <div className="grid grid-cols-2 gap-4 mt-4 text-sm text-gray-800">
                                    <p><span className="font-bold">Bid Number:</span> {selectedTender.bid_number}</p>
                                    <p><span className="font-bold">Category:</span> {selectedTender.item_category}</p>
                                    <p><span className="font-bold">Deadline:</span> {selectedTender.bid_end_date ? new Date(selectedTender.bid_end_date).toLocaleString() : 'N/A'}</p>
                                </div>
                            </div>

                            <h3 className="text-lg font-semibold text-gray-700 mb-4">Compliance Checklist</h3>

                            {selectedTender.checklist_items && selectedTender.checklist_items.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full bg-white border">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="py-2 px-4 border text-left text-xs font-bold text-gray-700 uppercase">Code</th>
                                                <th className="py-2 px-4 border text-left text-xs font-bold text-gray-700 uppercase">Document</th>
                                                <th className="py-2 px-4 border text-center text-xs font-bold text-gray-700 uppercase">Ready?</th>
                                                <th className="py-2 px-4 border text-center text-xs font-bold text-gray-700 uppercase">Submitted?</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {selectedTender.checklist_items
                                                .sort((a, b) => a.display_order - b.display_order)
                                                .map((item) => (
                                                    <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                                                        <td className="py-2 px-4 text-sm font-bold text-gray-900 border">{item.code}</td>
                                                        <td className="py-2 px-4 text-sm font-medium text-gray-800 border">{item.name}</td>
                                                        <td className="py-2 px-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={item.is_ready}
                                                                onChange={(e) => updateChecklist(item.id, { is_ready: e.target.checked })}
                                                                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="py-2 px-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={item.is_submitted}
                                                                onChange={(e) => updateChecklist(item.id, { is_submitted: e.target.checked })}
                                                                className="w-4 h-4 text-green-600 rounded cursor-pointer"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-500">No checklist items found.</p>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center bg-white rounded-xl shadow-md p-10 text-gray-400">
                            Select a tender to view details
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}
