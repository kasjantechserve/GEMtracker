'use client';
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { FileUp, Eye, Check, X, Loader2 } from 'lucide-react';

interface ChecklistItem {
    id: string; // Changed to string UUID
    tender_id: string;
    name: string;
    code: string;
    is_ready: boolean;
    is_submitted: boolean;
    document_url: string | null;
}

interface ChecklistProps {
    items: ChecklistItem[];
    onUpdate: (itemId: string, updates: any) => void;
}

export default function Checklist({ items, onUpdate }: ChecklistProps) {
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    const handleFileUpload = async (itemId: string, file: File) => {
        if (file.size > 10 * 1024 * 1024) {
            alert('File too large. Maximum size is 10MB.');
            return;
        }

        const item = items.find(i => i.id === itemId);
        if (!item) return;

        setUploadingId(itemId);
        try {
            // Path: /compliance-docs/{bid_id}/{document_code}/{filename}
            // Using item.id as a fallback for bid_id if tender_id isn't the bid_id
            const storagePath = `${item.tender_id}/${item.code}/${file.name}`;

            const { data, error } = await supabase.storage
                .from('compliance-docs')
                .upload(storagePath, file, { upsert: true });

            if (error) throw error;

            // Update database via parent handler
            await onUpdate(itemId, {
                document_url: data.path,
                is_ready: true
            });

            alert(`${item.code} uploaded successfully!`);
        } catch (err: any) {
            console.error('Upload failed:', err);
            alert(`Upload failed: ${err.message}`);
        } finally {
            setUploadingId(null);
        }
    };

    const handleViewDocument = async (itemId: string) => {
        const item = items.find(i => i.id === itemId);
        if (!item?.document_url) return;

        try {
            const { data, error } = await supabase.storage
                .from('compliance-docs')
                .createSignedUrl(item.document_url, 60);

            if (error) throw error;
            window.open(data.signedUrl, '_blank');
        } catch (err: any) {
            alert('Could not open document: ' + err.message);
        }
    };

    if (!items || items.length === 0) {
        return <div className="p-4 text-gray-500">No checklist items found.</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                        <th className="py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Name</th>
                        <th className="py-2 px-4 border-b text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        <th className="py-2 px-4 border-b text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ready?</th>
                        <th className="py-2 px-4 border-b text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted?</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-2 px-4 text-sm font-medium text-gray-900">{item.code}</td>
                            <td className="py-2 px-4 text-sm text-gray-700">{item.name}</td>
                            <td className="py-2 px-4 text-right space-x-2">
                                {item.document_url ? (
                                    <button
                                        onClick={() => handleViewDocument(item.id)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                        title="View Document"
                                    >
                                        <Eye size={18} />
                                    </button>
                                ) : null}
                                <button
                                    onClick={() => {
                                        setSelectedItemId(item.id);
                                        fileInputRef.current?.click();
                                    }}
                                    disabled={uploadingId === item.id}
                                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                                    title="Upload Document"
                                >
                                    {uploadingId === item.id ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <FileUp size={18} />
                                    )}
                                </button>
                            </td>
                            <td className="py-2 px-4 text-center">
                                <input
                                    type="checkbox"
                                    checked={item.is_ready}
                                    onChange={(e) => onUpdate(item.id, { is_ready: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                />
                            </td>
                            <td className="py-2 px-4 text-center">
                                <input
                                    type="checkbox"
                                    checked={item.is_submitted}
                                    onChange={(e) => onUpdate(item.id, { is_submitted: e.target.checked })}
                                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.[0] && selectedItemId) {
                        handleFileUpload(selectedItemId, e.target.files[0]);
                    }
                }}
            />
        </div>
    );
}
