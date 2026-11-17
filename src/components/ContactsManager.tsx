import React, { useState } from 'react';
import { EmergencyContact } from '../types';
import { api } from '../services/api';
import {
  Users,
  UserPlus,
  Phone,
  Trash2,
  Edit2,
  CheckCircle,
  ShieldCheck,
  Send,
  AlertTriangle,
  X,
  Radio,
  Info,
  ArrowRight,
  MessageSquare,
  PhoneCall,
  ExternalLink
} from 'lucide-react';

interface ContactsManagerProps {
  contacts: EmergencyContact[];
  onRefresh: () => void;
  onNavigateToSettings?: () => void;
  isLiveSms?: boolean;
  userName?: string;
  lastMapsUrl?: string;
}

export const ContactsManager: React.FC<ContactsManagerProps> = ({
  contacts,
  onRefresh,
  onNavigateToSettings,
  isLiveSms = false,
  userName = 'User',
  lastMapsUrl = 'https://www.google.com/maps?q=12.9716,77.5946'
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [mobile, setMobile] = useState<string>('+91');
  const [relationship, setRelationship] = useState<string>('Parent');
  const [consent, setConsent] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<Record<number, string>>({});

  const getEmergencyMessage = (contactName: string) => {
    return `🚨 *EMERGENCY SOS ALERT* 🚨\n\nDear ${contactName},\n${userName} has activated an Emergency SOS signal.\n\n📍 *Live GPS Location:* ${lastMapsUrl}\n\nPlease check on me or contact emergency responders immediately!`;
  };

  const getWhatsAppLink = (mobileNumber: string, contactName: string) => {
    const cleanNumber = mobileNumber.replace(/[^0-9]/g, '');
    const text = getEmergencyMessage(contactName);
    return `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encodeURIComponent(text)}`;
  };

  const getNativeSmsLink = (mobileNumber: string, contactName: string) => {
    const text = getEmergencyMessage(contactName);
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    return `sms:${mobileNumber}${isIOS ? '&' : '?'}body=${encodeURIComponent(text)}`;
  };

  const getCallLink = (mobileNumber: string) => {
    return `tel:${mobileNumber}`;
  };

  const openAdd = () => {
    setEditingContact(null);
    setName('');
    setMobile('+91');
    setRelationship('Parent');
    setConsent(false);
    setError(null);
    setIsAddModalOpen(true);
  };

  const openEdit = (c: EmergencyContact) => {
    setEditingContact(c);
    setName(c.contact_name);
    setMobile(c.mobile_number);
    setRelationship(c.relationship || 'Other');
    setConsent(Boolean(c.consent));
    setError(null);
    setIsAddModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !mobile.trim()) {
      setError('Contact name and mobile number are required.');
      return;
    }

    if (!consent) {
      setError('Explicit consent is required. Contact must agree to receive emergency SMS alerts.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingContact) {
        await api.updateContact(editingContact.id, {
          contact_name: name.trim(),
          mobile_number: mobile.trim(),
          relationship,
          consent,
        });
      } else {
        await api.addContact({
          contact_name: name.trim(),
          mobile_number: mobile.trim(),
          relationship,
          consent,
        });
      }

      setIsAddModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this emergency contact?')) return;
    try {
      await api.deleteContact(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete contact.');
    }
  };

  const handleTestSms = async (contactId: number) => {
    setTestStatus((prev) => ({ ...prev, [contactId]: 'Sending...' }));
    try {
      const res = await api.testNotification(contactId);
      setTestStatus((prev) => ({
        ...prev,
        [contactId]: res.result?.deliveryStatus === 'Accepted' ? 'SMS Accepted' : 'Failed',
      }));
      setTimeout(() => {
        setTestStatus((prev) => {
          const next = { ...prev };
          delete next[contactId];
          return next;
        });
      }, 4000);
    } catch (err: any) {
      setTestStatus((prev) => ({ ...prev, [contactId]: `Error: ${err.message}` }));
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold text-white">Emergency Contacts &amp; Multi-Channel Alerts</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dispatch instant alerts to trusted numbers via WhatsApp, Direct Call, Native SMS, or MSG91 Flow
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Emergency Contact</span>
        </button>
      </div>

      {/* Alternative Alert Channels Banner */}
      <div className="mb-6 p-4 rounded-xl border bg-slate-950 border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
              isLiveSms
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white block">
                  Zero-DLT Alternative Alerting Channels Active
                </span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider bg-emerald-500/20 text-emerald-300">
                  Instant Delivery
                </span>
              </div>
              <p className="text-slate-400 mt-1 text-[11px] leading-relaxed max-w-2xl">
                Commercial telecom SMS in India requires paid DLT entity registration. To ensure your emergency alerts <strong>always reach your guardians</strong>, you can use <strong>WhatsApp Instant Dispatch</strong>, <strong>Direct Cellular Dialing</strong>, <strong>Telegram Push Bot</strong>, and <strong>Native Device SMS</strong> directly from each contact card below.
              </p>
            </div>
          </div>

          {onNavigateToSettings && (
            <button
              onClick={onNavigateToSettings}
              className="self-start sm:self-center shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:text-white bg-sky-500/10 hover:bg-sky-600 border border-sky-500/30 rounded-lg transition-colors cursor-pointer"
            >
              <span>Telegram &amp; SMS Settings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-200">No Emergency Contacts Registered</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Add trusted family members, colleagues, or medical contacts. They will receive automated GPS coordinates when you trigger an emergency.
          </p>
          <button
            onClick={openAdd}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg"
          >
            Add Your First Contact
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-white text-base">{contact.contact_name}</h4>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      {contact.relationship || 'Emergency Contact'}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    <ShieldCheck className="w-3 h-3" /> Consent Verified
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-slate-300 mt-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{contact.mobile_number}</span>
                  </div>
                  <a
                    href={getCallLink(contact.mobile_number)}
                    className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20"
                    title="Direct Phone Call"
                  >
                    <PhoneCall className="w-3 h-3" />
                    <span>Call</span>
                  </a>
                </div>

                {/* Instant Alert Dispatch Buttons (Zero DLT Alternatives) */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold uppercase tracking-wider text-slate-400">
                      Emergency Alert Dispatch:
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                      Zero DLT
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* WhatsApp Alert Button */}
                    <a
                      href={getWhatsAppLink(contact.mobile_number, contact.contact_name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-sm text-center"
                      title="Send pre-filled emergency alert with live Google Maps link via WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Alert</span>
                    </a>

                    {/* Direct Cellular Call */}
                    <a
                      href={getCallLink(contact.mobile_number)}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer shadow-sm text-center"
                      title="Direct cellular voice call to guardian"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call Guardian</span>
                    </a>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {/* Native Device SMS (Bypasses DLT) */}
                    <a
                      href={getNativeSmsLink(contact.mobile_number, contact.contact_name)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/50 rounded-lg transition-colors"
                      title="Send SMS from your phone SIM card without commercial DLT blocks"
                    >
                      <Send className="w-3 h-3 text-purple-400" />
                      <span>Native SIM SMS</span>
                    </a>

                    {/* MSG91 Test SMS */}
                    <button
                      onClick={() => handleTestSms(contact.id)}
                      disabled={Boolean(testStatus[contact.id])}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Test MSG91 Flow SMS API"
                    >
                      <Send className="w-3 h-3 text-red-400" />
                      <span>{testStatus[contact.id] || 'Test MSG91'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                <span>Contact #{contact.id}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(contact)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
                    title="Edit Contact"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors"
                    title="Delete Contact"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <h3 className="font-bold text-white text-base">
                {editingContact ? 'Edit Emergency Contact' : 'Add New Emergency Contact'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name / Identifier *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mobile Number (with Country Code) *
                </label>
                <input
                  type="text"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Indian numbers: +91XXXXXXXXXX (10-digit mobile)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Relationship
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                >
                  <option value="Parent">Parent</option>
                  <option value="Spouse">Spouse / Partner</option>
                  <option value="Sibling">Brother / Sister</option>
                  <option value="Friend">Trusted Friend</option>
                  <option value="Doctor">Doctor / Physician</option>
                  <option value="Colleague">Work Colleague</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Mandatory Consent Checkbox */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-red-600 focus:ring-red-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200 block">
                      Confirmed SMS Emergency Consent *
                    </span>
                    <span className="text-slate-400 block mt-0.5">
                      I confirm this contact has explicitly agreed to receive automated emergency SMS notifications containing my GPS coordinates when SOS is activated.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Contact'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
