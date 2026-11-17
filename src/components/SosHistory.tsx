import React, { useState } from 'react';
import { SOSEvent, NotificationItem } from '../types';
import {
  History,
  MapPin,
  ExternalLink,
  Filter,
  Search,
  ShieldAlert,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  X,
  Download
} from 'lucide-react';

interface SosHistoryProps {
  events: SOSEvent[];
  onRefresh: () => void;
}

export const SosHistory: React.FC<SosHistoryProps> = ({ events, onRefresh }) => {
  const [filterTrigger, setFilterTrigger] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<SOSEvent | null>(null);

  const handleExportCSV = () => {
    if (events.length === 0) return;

    const headers = [
      'Event ID',
      'Trigger Method',
      'Event Status',
      'Latitude',
      'Longitude',
      'Accuracy (meters)',
      'Google Maps URL',
      'Address / Label',
      'Date & Time (ISO)',
      'Date & Time (Local)',
      'Alerted Contacts Count',
      'SMS Notifications Detail'
    ];

    const escapeCSV = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = events.map((ev) => {
      const notifs = ev.notifications || [];
      const notifSummary = notifs
        .map(
          (n) =>
            `${n.contact_name || 'Contact'} (${n.mobile_number}): ${n.delivery_status} [ID: ${n.provider_message_id}]`
        )
        .join(' | ');

      return [
        escapeCSV(ev.id),
        escapeCSV(ev.trigger_type),
        escapeCSV(ev.status),
        escapeCSV(ev.latitude ?? ''),
        escapeCSV(ev.longitude ?? ''),
        escapeCSV(ev.accuracy ? Math.round(ev.accuracy) : ''),
        escapeCSV(ev.maps_url || ''),
        escapeCSV(ev.address_label || ''),
        escapeCSV(ev.created_at || ''),
        escapeCSV(ev.created_at ? new Date(ev.created_at).toLocaleString() : ''),
        escapeCSV(notifs.length),
        escapeCSV(notifSummary || 'None')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.setAttribute('href', url);
    link.setAttribute('download', `sos_guardian_events_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredEvents = events.filter((ev) => {
    if (filterTrigger !== 'all' && ev.trigger_type !== filterTrigger) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = String(ev.id).includes(q);
      const matchTrigger = ev.trigger_type.toLowerCase().includes(q);
      const matchAddr = (ev.address_label || '').toLowerCase().includes(q);
      if (!matchId && !matchTrigger && !matchAddr) return false;
    }
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      {/* Title & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold text-white">SOS Event History</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete emergency audit log with GPS coordinates and MSG91 SMS delivery records
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Trigger filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            {(['all', 'manual', 'gesture', 'voice'] as const).map((trig) => (
              <button
                key={trig}
                onClick={() => setFilterTrigger(trig)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors capitalize ${
                  filterTrigger === trig
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {trig}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
            title="Refresh History"
          >
            <Clock className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={events.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
            title={events.length === 0 ? 'No events to export' : `Export ${events.length} emergency events to CSV`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
            {events.length > 0 && (
              <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-emerald-500/20 rounded font-mono text-emerald-300">
                {events.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Events Table */}
      {filteredEvents.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
          <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No SOS Events Found</p>
          <p className="text-xs text-slate-500 mt-1">
            Emergency records will appear here whenever manual, gesture, or voice SOS is triggered.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">Event ID</th>
                <th className="py-3 px-3">Trigger Method</th>
                <th className="py-3 px-3">Location Coordinates</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">SMS Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEvents.map((ev) => {
                const notifs = ev.notifications || [];
                const deliveredCount = notifs.filter((n) => n.delivery_status === 'Delivered').length;
                const acceptedCount = notifs.filter((n) => n.delivery_status === 'Accepted').length;
                const failedCount = notifs.filter((n) => n.delivery_status === 'Failed').length;

                return (
                  <tr key={ev.id} className="hover:bg-slate-950/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-200">
                      #{String(ev.id).padStart(4, '0')}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          ev.trigger_type === 'manual'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : ev.trigger_type === 'gesture'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {ev.trigger_type}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {ev.latitude && ev.longitude ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span className="font-mono text-slate-300">
                            {ev.latitude.toFixed(4)}, {ev.longitude.toFixed(4)}
                          </span>
                          <a
                            href={ev.maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 ml-1 inline-flex items-center"
                            title="Open Google Maps"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-500">Location Unavailable</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {ev.created_at ? new Date(ev.created_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-3">
                      {notifs.length === 0 ? (
                        <span className="text-slate-500 text-[11px]">No contacts alerted</span>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] font-mono">
                          {deliveredCount > 0 && (
                            <span className="text-emerald-400 font-semibold">
                              {deliveredCount} Delivered
                            </span>
                          )}
                          {acceptedCount > 0 && (
                            <span className="text-blue-400 font-semibold">
                              {acceptedCount} Sent
                            </span>
                          )}
                          {failedCount > 0 && (
                            <span className="text-red-400 font-semibold">
                              {failedCount} Failed
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedEvent(ev)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-white text-base">
                  Emergency Event Details #{String(selectedEvent.id).padStart(4, '0')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Event Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Trigger Method</span>
                  <span className="font-bold uppercase text-red-400">{selectedEvent.trigger_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Event Status</span>
                  <span className="font-semibold text-emerald-400">{selectedEvent.status}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Timestamp</span>
                  <span className="font-mono text-slate-300">
                    {selectedEvent.created_at ? new Date(selectedEvent.created_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">GPS Precision</span>
                  <span className="font-mono text-slate-300">
                    {selectedEvent.accuracy ? `±${Math.round(selectedEvent.accuracy)}m` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Map Coordinate Link */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Emergency GPS Location</span>
                  <span className="text-sm font-mono font-bold text-white">
                    {selectedEvent.latitude && selectedEvent.longitude
                      ? `${selectedEvent.latitude.toFixed(6)}, ${selectedEvent.longitude.toFixed(6)}`
                      : 'Coordinates not recorded'}
                  </span>
                </div>
                {selectedEvent.maps_url && (
                  <a
                    href={selectedEvent.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                  >
                    <span>View Map</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* MSG91 SMS Dispatch Audit */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  MSG91 Automatic SMS Notifications
                </h4>
                {(!selectedEvent.notifications || selectedEvent.notifications.length === 0) ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-lg border border-slate-800">
                    No SMS notifications recorded for this event.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedEvent.notifications.map((notif: NotificationItem) => (
                      <div
                        key={notif.id}
                        className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">
                            {notif.contact_name || 'Contact'} ({notif.mobile_number})
                          </span>
                          <span
                            className={`font-semibold uppercase text-[10px] px-2 py-0.5 rounded ${
                              notif.delivery_status === 'Delivered'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : notif.delivery_status === 'Accepted'
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {notif.delivery_status}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                          <span>Request ID: {notif.provider_message_id}</span>
                          <span>Provider: {notif.provider}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
