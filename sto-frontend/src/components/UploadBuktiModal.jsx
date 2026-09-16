import { useState } from 'react';
import api from '../api/axiosInstance';

function UploadBuktiModal({ tugasId, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      setError('File harus berupa gambar');
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError('');
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Pilih foto terlebih dahulu');
      return;
    }

    setSubmitting(true);
    setError('');

    const formData = new FormData();
    formData.append('foto', file);

    try {
      await api.patch(`/tugas/${tugasId}/selesai`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal upload bukti');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-bg-dark-2 rounded-xl p-5 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Upload Bukti Selesai</h2>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <label className="block mb-4">
          <div className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:border-telkom-red">
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded" />
            ) : (
              <p className="text-gray-400 text-sm">Tap untuk pilih foto dari galeri/kamera</p>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded bg-slate-700 text-sm font-medium"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2 rounded bg-telkom-red text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Mengupload...' : 'Selesaikan Tugas'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadBuktiModal;