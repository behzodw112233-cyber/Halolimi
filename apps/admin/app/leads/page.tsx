'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { Button, Card, Chip, Dropdown, Label } from '@heroui/react';
import { useMutation, useQuery } from 'convex/react';
import {
  Building2,
  ChevronDown,
  Crown,
  Download,
  Handshake,
  MapPin,
  Phone,
  Sprout,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';

type LeadType = 'big_player' | 'farm_ranch' | 'potential_user' | 'dealer' | 'partner';
type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';

type LeadForm = {
  name: string;
  contactName: string;
  phone: string;
  region: string;
  category: string;
  source: string;
  estimatedValue: string;
  owner: string;
  notes: string;
};

const TYPE_META: Record<LeadType, { label: string; icon: React.ReactNode; color: string; hint: string }> = {
  big_player: {
    label: 'Big player',
    icon: <Crown size={16} />,
    color: '#7C3AED',
    hint: 'Large buyer, trader, or high-volume operator',
  },
  farm_ranch: {
    label: 'Farm / ranch',
    icon: <Sprout size={16} />,
    color: '#16A34A',
    hint: 'Farm, ranch, livestock yard, or breeder',
  },
  potential_user: {
    label: 'Potential user',
    icon: <Users size={16} />,
    color: '#0A6CFF',
    hint: 'Likely buyer/seller who should join Halolmi',
  },
  dealer: {
    label: 'Dealer',
    icon: <Building2 size={16} />,
    color: '#F59E0B',
    hint: 'Official or semi-official reseller',
  },
  partner: {
    label: 'Partner',
    icon: <Handshake size={16} />,
    color: '#0F766E',
    hint: 'Media, logistics, vet, feed, or growth partner',
  },
};

const STATUS_META: Record<LeadStatus, { label: string; color: 'default' | 'warning' | 'accent' | 'success' | 'danger' }> = {
  new: { label: 'Yangi', color: 'default' },
  contacted: { label: 'Aloqada', color: 'warning' },
  qualified: { label: 'Mos', color: 'accent' },
  won: { label: 'Yutildi', color: 'success' },
  lost: { label: 'Yo‘qoldi', color: 'danger' },
};

const blankForm = (type: LeadType): LeadForm => ({
  name:
    type === 'big_player'
      ? 'Big player'
      : type === 'farm_ranch'
        ? 'Farm / ranch'
        : type === 'dealer'
          ? 'Dealer'
          : type === 'partner'
            ? 'Partner'
            : 'Potential user',
  contactName: '',
  phone: '',
  region: '',
  category: '',
  source: '',
  estimatedValue: '',
  owner: 'Admin',
  notes: '',
});

const fmtMoney = (value?: number) =>
  value ? `${value.toLocaleString('en-US').replace(/,/g, ' ')} so‘m` : '-';

export default function LeadsPage() {
  const leads = useQuery(api.leads.list) ?? [];
  const createLead = useMutation(api.leads.create);
  const updateStatus = useMutation(api.leads.updateStatus);
  const removeLead = useMutation(api.leads.remove);
  const [selectedType, setSelectedType] = useState<LeadType | null>(null);
  const [form, setForm] = useState<LeadForm>(() => blankForm('potential_user'));

  const totals = useMemo(() => {
    const bigPlayers = leads.filter((lead) => lead.type === 'big_player').length;
    const farms = leads.filter((lead) => lead.type === 'farm_ranch').length;
    const open = leads.filter((lead) => !['won', 'lost'].includes(lead.status)).length;
    const value = leads.reduce((sum, lead) => sum + (lead.estimatedValue ?? 0), 0);
    return { bigPlayers, farms, open, value };
  }, [leads]);

  const openCreate = (type: LeadType) => {
    setSelectedType(type);
    setForm(blankForm(type));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedType || !form.name.trim()) return;
    await createLead({
      name: form.name.trim(),
      type: selectedType,
      contactName: form.contactName.trim(),
      phone: form.phone.trim(),
      region: form.region.trim(),
      category: form.category.trim(),
      source: form.source.trim(),
      estimatedValue: form.estimatedValue.trim() ? Number(form.estimatedValue) : undefined,
      owner: form.owner.trim() || 'Admin',
      notes: form.notes.trim(),
    });
    setSelectedType(null);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Leads"
        subtitle="Big players, farms, ranches and potential users pipeline"
        action={<LeadDropdown onPick={openCreate} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: 'Open leads', value: totals.open },
          { label: 'Big players', value: totals.bigPlayers },
          { label: 'Farms / ranches', value: totals.farms },
          { label: 'Pipeline value', value: fmtMoney(totals.value) },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-2xl border border-neutral-200 bg-white shadow-none">
            <Card.Content className="p-5">
              <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
              <p className="mt-0.5 text-sm text-neutral-500">{stat.label}</p>
            </Card.Content>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
        <Card.Content className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs uppercase text-neutral-400">
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Region</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Value</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const type = TYPE_META[lead.type as LeadType];
                  const status = STATUS_META[lead.status as LeadStatus];
                  return (
                    <tr key={lead._id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-neutral-900">{lead.name}</p>
                        <p className="mt-0.5 max-w-[260px] truncate text-xs text-neutral-400">
                          {lead.notes || lead.source || 'No notes yet'}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                          <span style={{ color: type.color }}>{type.icon}</span>
                          {type.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-neutral-800">{lead.contactName || '-'}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
                          <Phone size={12} /> {lead.phone || '-'}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-neutral-600">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={14} className="text-neutral-400" />
                          {lead.region || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-neutral-600">{lead.category || '-'}</td>
                      <td className="px-5 py-4 font-medium text-neutral-900">{fmtMoney(lead.estimatedValue)}</td>
                      <td className="px-5 py-4">
                        <select
                          value={lead.status}
                          onChange={(event) =>
                            updateStatus({
                              id: lead._id as Id<'leads'>,
                              status: event.target.value as LeadStatus,
                            })
                          }
                          className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs font-medium outline-none focus:border-accent"
                        >
                          {Object.entries(STATUS_META).map(([key, meta]) => (
                            <option key={key} value={key}>
                              {meta.label}
                            </option>
                          ))}
                        </select>
                        <Chip variant="soft" color={status.color} size="sm" className="ml-2">
                          {status.label}
                        </Chip>
                      </td>
                      <td className="px-5 py-4 text-neutral-600">{lead.owner}</td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="tertiary"
                          size="sm"
                          onPress={() => {
                            if (confirm(`"${lead.name}" leadini o‘chirasizmi?`)) {
                              removeLead({ id: lead._id as Id<'leads'> });
                            }
                          }}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-sm text-neutral-400">
                      Hali lead yo‘q. Yuqoridan lead turini tanlab qo‘shing.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>

      {selectedType ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white shadow-xl">
            <Card.Header className="flex items-start justify-between p-5 pb-2">
              <div>
                <Card.Title className="text-base font-semibold text-neutral-900">
                  Add {TYPE_META[selectedType].label}
                </Card.Title>
                <Card.Description className="mt-0.5 text-sm text-neutral-500">
                  {TYPE_META[selectedType].hint}
                </Card.Description>
              </div>
              <button
                onClick={() => setSelectedType(null)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100"
              >
                ×
              </button>
            </Card.Header>
            <Card.Content>
              <form onSubmit={submit} className="grid gap-3 p-5 pt-2 sm:grid-cols-2">
                <LeadInput label="Lead name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
                <LeadInput label="Contact name" value={form.contactName} onChange={(value) => setForm({ ...form, contactName: value })} />
                <LeadInput label="Phone / Telegram" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
                <LeadInput label="Region" value={form.region} onChange={(value) => setForm({ ...form, region: value })} />
                <LeadInput label="Category" value={form.category} onChange={(value) => setForm({ ...form, category: value })} placeholder="Qoramol, qo‘y, yem..." />
                <LeadInput label="Source" value={form.source} onChange={(value) => setForm({ ...form, source: value })} placeholder="Telegram, market, referral..." />
                <LeadInput label="Pipeline value" value={form.estimatedValue} onChange={(value) => setForm({ ...form, estimatedValue: value })} type="number" />
                <LeadInput label="Owner" value={form.owner} onChange={(value) => setForm({ ...form, owner: value })} />
                <label className="sm:col-span-2">
                  <span className="text-xs font-medium text-neutral-500">Notes</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-neutral-200 p-3 text-sm outline-none focus:border-accent"
                    placeholder="What makes this lead important?"
                  />
                </label>
                <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                  <Button variant="tertiary" type="button" onPress={() => setSelectedType(null)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" className="gap-1">
                    <UserPlus size={16} />
                    Add lead
                  </Button>
                </div>
              </form>
            </Card.Content>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function LeadDropdown({ onPick }: { onPick: (type: LeadType) => void }) {
  return (
    <Dropdown>
      <Button
        aria-label="Add lead"
        variant="secondary"
        className="h-11 gap-2 rounded-full border-0 bg-neutral-100 px-5 text-sm font-semibold text-blue-600 shadow-none hover:bg-neutral-200"
      >
        <Download size={18} />
        Add player
        <ChevronDown size={16} className="text-neutral-400" />
      </Button>
      <Dropdown.Popover placement="bottom right" className="min-w-[280px]">
        <Dropdown.Menu onAction={(key) => onPick(key as LeadType)}>
          {Object.entries(TYPE_META).map(([key, meta]) => (
            <Dropdown.Item key={key} id={key} textValue={meta.label}>
              <span className="shrink-0" style={{ color: meta.color }}>
                {meta.icon}
              </span>
              <div className="flex flex-col">
                <Label>{meta.label}</Label>
                <span className="text-xs text-neutral-400">{meta.hint}</span>
              </div>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function LeadInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-xs font-medium text-neutral-500">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}
