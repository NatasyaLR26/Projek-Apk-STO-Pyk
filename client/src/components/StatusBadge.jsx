import React from 'react';

const StatusBadge = ({ status, className = '' }) => {
  let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';

  const s = String(status || '').toLowerCase();

  if (s === 'done' || s === 'selesai' || s === 'released' || s === 'approved') {
    badgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  } else if (s === 'pending' || s === 'menunggu') {
    badgeStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  } else if (s === 'open' || s === 'progress' || s === 'tracking' || s === 'online') {
    badgeStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  } else if (s === 'rejected' || s === 'batal') {
    badgeStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border tracking-wide uppercase ${badgeStyle} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {status}
    </span>
  );
};

export default StatusBadge;
