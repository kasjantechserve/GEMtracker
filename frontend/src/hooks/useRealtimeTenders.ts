/**
 * Real-time Tenders Hook
 * Subscribes to tender changes and provides live updates
 */
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface Tender {
    id: string
    company_id: string
    uploaded_by: string
    bid_number: string
    bid_end_date: string | null
    item_category: string | null
    subject: string | null
    nickname: string | null
    file_path: string | null
    status: 'active' | 'expired'
    created_at: string
    updated_at: string
    checklist_items?: ChecklistItem[]
}

export interface ChecklistItem {
    id: string
    tender_id: string
    code: string
    name: string
    display_order: number
    is_ready: boolean
    is_submitted: boolean
    document_url: string | null
    notes: string | null
    updated_by: string | null
    created_at: string
    updated_at: string
}

export function useRealtimeTenders(companyId: string | null) {
    const [tenders, setTenders] = useState<Tender[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!companyId) {
            setLoading(false)
            return
        }

        let channel: RealtimeChannel

        const fetchTenders = async () => {
            try {
                setLoading(true)

                const { data, error } = await supabase
                    .from('tenders')
                    .select(`
            *,
            checklist_items (*)
          `)
                    .eq('company_id', companyId)
                    .order('bid_end_date', { ascending: true })

                if (error) throw error

                // Sort: Active first (by deadline), then Expired (recent first)
                const now = new Date()
                const active = (data || []).filter(t => {
                    const endDate = t.bid_end_date ? new Date(t.bid_end_date) : null
                    return endDate && endDate >= now
                }).sort((a, b) => {
                    const dateA = new Date(a.bid_end_date!).getTime()
                    const dateB = new Date(b.bid_end_date!).getTime()
                    return dateA - dateB
                })

                const expired = (data || []).filter(t => {
                    const endDate = t.bid_end_date ? new Date(t.bid_end_date) : null
                    return !endDate || endDate < now
                }).sort((a, b) => {
                    const dateA = new Date(a.bid_end_date || 0).getTime()
                    const dateB = new Date(b.bid_end_date || 0).getTime()
                    return dateB - dateA
                })

                setTenders([...active, ...expired])
                setError(null)
            } catch (err: any) {
                setError(err.message || 'Failed to fetch tenders')
            } finally {
                setLoading(false)
            }
        }

        // Initial fetch
        fetchTenders()

        // Subscribe to real-time changes
        channel = supabase
            .channel('tenders-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'tenders',
                    filter: `company_id=eq.${companyId}`
                },
                (payload) => {
                    console.log('New tender inserted:', payload.new)
                    // Refetch to get checklist items
                    fetchTenders()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'tenders',
                    filter: `company_id=eq.${companyId}`
                },
                (payload) => {
                    console.log('Tender updated:', payload.new)
                    setTenders(prev =>
                        prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t)
                    )
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'tenders',
                    filter: `company_id=eq.${companyId}`
                },
                (payload) => {
                    console.log('Tender deleted:', payload.old)
                    setTenders(prev => prev.filter(t => t.id !== payload.old.id))
                }
            )
            .subscribe()

        // Subscribe to checklist changes
        const checklistChannel = supabase
            .channel('checklist-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'checklist_items'
                },
                (payload) => {
                    console.log('Checklist item changed:', payload)
                    // Refetch to update checklist
                    fetchTenders()
                }
            )
            .subscribe()

        // Cleanup
        return () => {
            supabase.removeChannel(channel)
            supabase.removeChannel(checklistChannel)
        }
    }, [companyId])

    return { tenders, loading, error, refetch: () => { } }
}
