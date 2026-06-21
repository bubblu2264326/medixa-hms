'use client';

import { useState, useEffect, useMemo } from 'react';
import { PartyDetail, PartyPermissions } from '../types';
import { getAllParties } from '../api';
import { AddPartyDialog } from './AddPartyDialog';
import { PartyDetailModal } from './PartyDetailModal';
import { Building2, Plus, Search, Phone, MapPin, ChevronRight, Users } from 'lucide-react';

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const COLORS = [
  'bg-primary', 'bg-primary', 'bg-cyan-500', 'bg-info',
  'bg-primary', 'bg-primary', 'bg-pink-500', 'bg-orange-500',
];

function avatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function PartiesView() {
  const [parties, setParties] = useState<PartyDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedParty, setSelectedParty] = useState<PartyDetail | null>(null);
  const [permissions, setPermissions] = useState<PartyPermissions>({
    canViewFinancials: false,
  });

  async function load() {
    setLoading(true);
    try {
      setParties(await getAllParties());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadUser = async () => {
      try {
        const response = await fetch('/api/user', { signal: controller.signal });
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        if (controller.signal.aborted) {
          return;
        }

        setPermissions({
          canViewFinancials: payload?.role !== 'Pharmacist',
        });
      } catch {
        if (controller.signal.aborted) {
          return;
        }
      }
    };

    void loadUser();

    return () => controller.abort();
  }, []);

  const filtered = useMemo(() =>
    parties.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.contact_number ?? '').includes(search) ||
      (p.gst_number ?? '').toLowerCase().includes(search.toLowerCase())
    ), [parties, search]);

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-md">
            <Users size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Parties & Suppliers</h3>
            <p className="text-xs text-muted-foreground font-medium">{parties.length} registered {parties.length === 1 ? 'party' : 'parties'}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary transition-all shadow-lg "
        >
          <Plus size={16} />
          Add Party
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, or GST…"
          className="w-full pl-11 pr-4 py-3 border border-border rounded-md text-sm font-semibold text-foreground bg-muted focus:outline-none focus:ring-2 focus:ring-ring/20 focus:bg-white transition-all"
        />
      </div>

      {/* Party Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 opacity-40">
            <Building2 size={36} className="text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground font-semibold text-sm">Loading parties…</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-40">
          <Building2 size={40} className="text-muted-foreground" />
          <p className="text-muted-foreground font-bold text-sm">{search ? 'No parties match your search' : 'No parties yet — add one!'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-auto custom-scrollbar pr-1">
          {filtered.map(party => (
            <button
              key={party.party_id}
              onClick={() => setSelectedParty(party)}
              className="group text-left bg-white border border-border rounded-md p-4 hover:border-primary/30 hover:shadow-lg  transition-all duration-200 flex items-start gap-3"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0 ${avatarColor(party.name)}`}>
                {initials(party.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{party.name}</p>
                {party.contact_number && (
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5 truncate">
                    <Phone size={10} /> {party.contact_number}
                  </p>
                )}
                {party.address && (
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5 truncate">
                    <MapPin size={10} /> {party.address}
                  </p>
                )}
                {!party.status && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/30">Inactive</span>
                )}
              </div>
              <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-all" />
            </button>
          ))}
        </div>
      )}

      {showAdd && (
        <AddPartyDialog onClose={() => setShowAdd(false)} onAdded={load} />
      )}

      {selectedParty && (
        <PartyDetailModal
          party={selectedParty}
          permissions={permissions}
          onClose={() => setSelectedParty(null)}
        />
      )}
    </div>
  );
}
