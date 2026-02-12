import { useState, useEffect } from 'react';
import axios from 'axios';

interface ChecklistItem {
    id: number;
    tender_id: number;
    name: string;
    code: string;
    is_ready: boolean;
    is_submitted: boolean;
}

interface ChecklistProps {
    items: ChecklistItem[];
    onUpdate: (itemId: number, updates: any) => void;
}

const API_URL = "";

export default function Checklist({ items, onUpdate }: ChecklistProps) {
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
                        <th className="py-2 px-4 border-b text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ready?</th>
                        <th className="py-2 px-4 border-b text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted?</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-2 px-4 text-sm font-medium text-gray-900">{item.code}</td>
                            <td className="py-2 px-4 text-sm text-gray-700">{item.name}</td>
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
        </div>
    );
}
