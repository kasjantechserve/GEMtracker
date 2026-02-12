'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Download } from 'lucide-react'

interface Template {
    id: string
    name: string
    description: string | null
    category: string | null
    file_type: string | null
    download_count: number
    created_at: string
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([])
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState(null)
    const router = useRouter()

    useEffect(() => {
        // Check authentication
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                router.push('/login')
            } else {
                setUser(session.user)
                fetchTemplates()
            }
        })
    }, [router])

    const fetchTemplates = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('templates')
                .select('*')
                .eq('is_public', true)
                .order('category')

            if (error) throw error
            setTemplates(data || [])
        } catch (err) {
            console.error('Error fetching templates:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleDownload = async (templateId: string) => {
        try {
            const session = await supabase.auth.getSession()
            const token = session.data.session?.access_token

            const response = await fetch(`/api/templates/${templateId}/download`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) throw new Error('Download failed')

            const { download_url } = await response.json()

            // Open download in new tab
            window.open(download_url, '_blank')
        } catch (err) {
            console.error('Download error:', err)
            alert('Download failed')
        }
    }

    const groupedTemplates = templates.reduce((acc, template) => {
        const category = template.category || 'Other'
        if (!acc[category]) acc[category] = []
        acc[category].push(template)
        return acc
    }, {} as Record<string, Template[]>)

    if (!user) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>
    }

    return (
        <main className="min-h-screen bg-gray-100 p-8">
            <header className="mb-8 flex justify-between items-center bg-white p-6 rounded-xl shadow-md">
                <div>
                    <h1 className="text-3xl font-extrabold text-blue-900">Template Repository</h1>
                    <p className="text-gray-500">Downloadable Compliance Formats</p>
                </div>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                    ← Back to Dashboard
                </button>
            </header>

            {loading ? (
                <div className="text-center py-12">
                    <p className="text-gray-500">Loading templates...</p>
                </div>
            ) : Object.keys(groupedTemplates).length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <p className="text-gray-500">No templates available yet.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                        <div key={category} className="bg-white rounded-xl shadow-md p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">{category}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {categoryTemplates.map(template => (
                                    <div
                                        key={template.id}
                                        className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="font-semibold text-gray-900">{template.name}</h3>
                                            <span className="text-xs text-gray-500 uppercase">{template.file_type}</span>
                                        </div>

                                        {template.description && (
                                            <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">
                                                {template.download_count} downloads
                                            </span>
                                            <button
                                                onClick={() => handleDownload(template.id)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    )
}
