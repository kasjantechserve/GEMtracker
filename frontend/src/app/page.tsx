'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Checklist from '@/components/Checklist';

const API_URL = "";

interface Tender {
  id: number;
  bid_number: string;
  bid_end_date: string;
  item_category: string;
  subject: string;
  nickname: string;
  file_path: string;
  items: any[];
}

export default function Home() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTenders();
  }, []);

  const fetchTenders = async () => {
    try {
      const res = await axios.get(`${API_URL}/tenders/`);
      setTenders(res.data);
      if (res.data.length > 0 && !selectedTender) {
        // Select the first one by default if none selected
        // Or better, don't auto select. Let's auto select the first for convenience now.
        setSelectedTender(res.data[0]);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch tenders.");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      await axios.post(`${API_URL}/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchTenders();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateChecklist = async (itemId: number, updates: any) => {
    if (!selectedTender) return;

    try {
      // Optimistic update
      const updatedItems = selectedTender.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      );
      setSelectedTender({ ...selectedTender, items: updatedItems });

      await axios.put(`${API_URL}/checklist/${itemId}`, updates);

      // Refresh in background to ensure sync
      fetchTenders();
    } catch (err) {
      console.error(err);
      setError("Failed to update item.");
      fetchTenders(); // Revert on error
    }
  };

  // Update selected tender whenever tenders list changes (to keep it in sync)
  useEffect(() => {
    if (selectedTender) {
      const updated = tenders.find(t => t.id === selectedTender.id);
      if (updated) setSelectedTender(updated);
    }
  }, [tenders]);

  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");

  useEffect(() => {
    if (selectedTender) {
      setNicknameInput(selectedTender.nickname || "");
    }
  }, [selectedTender]);

  const handleBackup = () => {
    window.open(`${API_URL}/backup`, '_blank');
  };

  const saveNickname = async () => {
    if (!selectedTender) return;
    try {
      const res = await axios.put(`${API_URL}/tenders/${selectedTender.id}`, { nickname: nicknameInput });
      // Update local state
      const updatedTender = { ...selectedTender, nickname: res.data.nickname };
      setSelectedTender(updatedTender);
      setTenders(tenders.map(t => t.id === updatedTender.id ? updatedTender : t));
      setEditingNickname(false);
    } catch (err) {
      console.error(err);
      setError("Failed to update nickname.");
    }
  };

  const calculateTimeRemaining = (endDateStr: string) => {
    if (!endDateStr) return "N/A";
    const end = new Date(endDateStr);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return `${days}d ${hours}h`;
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8 font-sans">
      <header className="mb-8 flex justify-between items-center bg-white p-6 rounded-xl shadow-md">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight">GEMtracker</h1>
          <p className="text-gray-500">Tender Management System</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleBackup}
            className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg shadow hover:bg-gray-300 transition font-medium"
          >
            ⬇ Backup Data
          </button>
          <label className={`cursor-pointer px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-medium ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? 'Parsing...' : '+ Upload New Tender PDF'}
            <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded shadow-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Tender List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-bold text-gray-800">Active Tenders</h2>
          <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col divide-y divide-gray-100">
            {tenders.length === 0 ? (
              <p className="p-4 text-gray-400 italic text-center">No tenders found.</p>
            ) : (
              tenders.map(tender => (
                <button
                  key={tender.id}
                  onClick={() => setSelectedTender(tender)}
                  className={`w-full text-left p-4 hover:bg-blue-50 transition flex flex-col gap-1 border-l-4 ${selectedTender?.id === tender.id ? 'bg-blue-50 border-blue-500' : 'border-transparent'}`}
                >
                  <span className="font-semibold text-gray-900 truncate w-full">{tender.nickname || tender.bid_number}</span>
                  {tender.nickname && <span className="text-xs text-gray-500 truncate w-full">({tender.bid_number})</span>}

                  <span className="text-sm text-gray-700 font-medium truncate w-full">{tender.subject || "No Subject"}</span>
                  <span className="text-xs text-gray-500 truncate w-full">{tender.item_category}</span>
                  <div className="flex justify-between items-center mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${new Date(tender.bid_end_date) < new Date() ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {calculateTimeRemaining(tender.bid_end_date)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(tender.bid_end_date).toLocaleDateString()}
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
                <div className="flex justify-between items-start mb-2">
                  {editingNickname ? (
                    <div className="flex gap-2 items-center w-full">
                      <input
                        type="text"
                        value={nicknameInput}
                        onChange={(e) => setNicknameInput(e.target.value)}
                        className="border rounded px-2 py-1 flex-grow text-lg font-bold text-gray-800"
                        placeholder="Enter nickname..."
                      />
                      <button onClick={saveNickname} className="text-green-600 hover:text-green-800 font-semibold px-2">Save</button>
                      <button onClick={() => setEditingNickname(false)} className="text-gray-500 hover:text-gray-700 px-2">Cancel</button>
                    </div>
                  ) : (
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 group">
                      {selectedTender.nickname || selectedTender.bid_number}
                      <button onClick={() => setEditingNickname(true)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition-opacity">
                        ✏️
                      </button>
                    </h2>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  {selectedTender.nickname && <p><span className="font-semibold text-gray-900">Bid Number:</span> {selectedTender.bid_number}</p>}
                  <p><span className="font-semibold text-gray-900">Category:</span> {selectedTender.item_category}</p>
                  <p><span className="font-semibold text-gray-900">Deadline:</span> {new Date(selectedTender.bid_end_date).toLocaleString()} ({calculateTimeRemaining(selectedTender.bid_end_date)} left)</p>
                  <a
                    href={`${API_URL}/tenders/${selectedTender.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition"
                  >
                    📄 Download PDF
                  </a>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-700 mb-4">Compliance Checklist</h3>
              <Checklist items={selectedTender.items} onUpdate={handleUpdateChecklist} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-white rounded-xl shadow-md p-10 text-gray-400">
              Select a tender to view details
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
