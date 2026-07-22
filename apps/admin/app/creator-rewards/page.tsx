'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { Button, Card, Chip } from '@heroui/react';
import { useMutation, useQuery } from 'convex/react';
import { Check, ExternalLink, HandCoins, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

type SubmissionStatus = 'draft' | 'checking' | 'approved' | 'rejected' | 'paid';

const STATUS_META: Record<SubmissionStatus, { label: string; color: 'default' | 'warning' | 'success' | 'danger' | 'accent' }> = {
  draft: { label: 'Draft', color: 'default' },
  checking: { label: 'Checking', color: 'warning' },
  approved: { label: 'Approved', color: 'success' },
  rejected: { label: 'Rejected', color: 'danger' },
  paid: { label: 'Paid', color: 'accent' },
};

const money = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
const compact = (value: number) =>
  Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

export default function CreatorRewardsPage() {
  const submissions = useQuery(api.bounty.listSubmissions) ?? [];
  const setStatus = useMutation(api.bounty.setSubmissionStatus);

  const totals = submissions.reduce(
    (acc, item) => {
      acc.rewards += item.rewardCents;
      acc.views += item.viewCount;
      if (item.status === 'checking') acc.checking += 1;
      if (item.status === 'approved') acc.approved += item.rewardCents;
      if (item.status === 'paid') acc.paid += item.rewardCents;
      return acc;
    },
    { approved: 0, checking: 0, paid: 0, rewards: 0, views: 0 }
  );

  const update = (id: Id<'bountySubmissions'>, status: SubmissionStatus) =>
    setStatus({ id, status });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Creator rewards"
        subtitle="Review social content, approve rewards, and track payout state."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: 'Checking', value: totals.checking },
          { label: 'Total views', value: compact(totals.views) },
          { label: 'Estimated rewards', value: money(totals.rewards) },
          { label: 'Paid', value: money(totals.paid) },
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
                  <th className="px-5 py-3 font-medium">Creator</th>
                  <th className="px-5 py-3 font-medium">Campaign</th>
                  <th className="px-5 py-3 font-medium">Platform</th>
                  <th className="px-5 py-3 font-medium">Views</th>
                  <th className="px-5 py-3 font-medium">Reward</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((item) => {
                  const status = STATUS_META[item.status as SubmissionStatus];
                  return (
                    <tr key={item._id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-neutral-900">{item.creatorName}</p>
                        <p className="mt-0.5 text-xs text-neutral-400">{item.creatorPhone}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-neutral-900">{item.campaign.title}</p>
                        <p className="mt-0.5 max-w-[280px] truncate text-xs text-neutral-400">
                          {item.title || item.url}
                        </p>
                      </td>
                      <td className="px-5 py-4 capitalize text-neutral-600">{item.platform}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-neutral-900">{compact(item.viewCount)}</p>
                        <p className="text-xs text-neutral-400">{compact(item.qualifiedViewCount)} qualified</p>
                      </td>
                      <td className="px-5 py-4 font-semibold text-neutral-900">{money(item.rewardCents)}</td>
                      <td className="px-5 py-4">
                        <Chip variant="soft" color={status.color} size="sm">
                          {status.label}
                        </Chip>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            className="gap-1"
                            onPress={() => update(item._id, 'approved')}
                          >
                            <Check size={14} />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-1"
                            onPress={() => update(item._id, 'paid')}
                          >
                            <HandCoins size={14} />
                            Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="danger-soft"
                            className="gap-1"
                            onPress={() => update(item._id, 'rejected')}
                          >
                            <X size={14} />
                            Reject
                          </Button>
                          <a
                            href={item.canonicalUrl ?? item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-neutral-500 hover:bg-neutral-100"
                          >
                            <ExternalLink size={14} />
                            Open
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-neutral-400">
                      No creator submissions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
