'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { Button, Card, Chip } from '@heroui/react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { MapPin, Trash2, Upload, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/page-header';

export default function DilerlarPage() {
  const dealers = useQuery(api.dealers.listAll) ?? [];
  // Only users marked as dealers (Foydalanuvchilar → "Diler qilish") can have a
  // showcase video attached.
  const dealerUsers = (useQuery(api.users.list) ?? []).filter((u) => u.isDealer);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createCloudflareUpload = useAction(api.cloudflareStream.createDirectUpload);
  const createDealer = useMutation(api.dealers.create);
  const updateDealerProfile = useMutation(api.users.updateDealerProfile);
  const removeDealer = useMutation(api.dealers.remove);
  const setActive = useMutation(api.dealers.setActive);

  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [dealer, setDealer] = useState('');
  const [address, setAddress] = useState('');
  const [hours, setHours] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [video, setVideo] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const videoInput = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);
  const selectedDealer = dealerUsers.find((u) => u._id === userId);

  useEffect(() => {
    if (!selectedDealer) {
      setAddress('');
      setHours('');
      setMapUrl('');
      return;
    }
    setDealer(selectedDealer.name);
    setAddress(selectedDealer.dealerAddress ?? '');
    setHours(selectedDealer.dealerHours ?? '');
    setMapUrl(selectedDealer.dealerMapUrl ?? '');
  }, [selectedDealer]);

  const upload = async (file: File): Promise<Id<'_storage'>> => {
    const url = await generateUploadUrl();
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
    const { storageId } = await res.json();
    return storageId as Id<'_storage'>;
  };

  const uploadVideoToCloudflare = async (file: File) => {
    const direct = await createCloudflareUpload({ maxDurationSeconds: 600, userId: 'admin' });
    const body = new FormData();
    body.append('file', file, file.name || 'halolmia-dealer.mp4');
    const res = await fetch(direct.uploadUrl, { method: 'POST', body });
    if (!res.ok) throw new Error(`Cloudflare upload failed (${res.status})`);
    return direct;
  };

  const submit = async () => {
    if (!userId || !title.trim() || !video || busy) return;
    setBusy(true);
    try {
      const direct = await uploadVideoToCloudflare(video);
      const thumbId = thumb ? await upload(thumb) : undefined;
      await updateDealerProfile({
        id: userId as Id<'users'>,
        dealerAddress: address.trim(),
        dealerHours: hours.trim(),
        dealerMapUrl: mapUrl.trim(),
      });
      await createDealer({
        title: title.trim(),
        dealer: dealer.trim() || undefined,
        userId: userId as Id<'users'>,
        thumbId,
        hlsUrl: direct.hlsUrl,
        thumbnailUrl: direct.thumbnailUrl,
        videoProvider: 'cloudflare',
        providerVideoId: direct.uid,
      });
      setUserId('');
      setTitle('');
      setDealer('');
      setAddress('');
      setHours('');
      setMapUrl('');
      setVideo(null);
      setThumb(null);
      if (videoInput.current) videoInput.current.value = '';
      if (thumbInput.current) thumbInput.current.value = '';
    } catch {
      alert('Yuklashda xatolik. Qayta urinib koʻring.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Rasmiy dilerlar" subtitle="Foydalanuvchini rasmiy dilerga aylantiring — video feʼdda reklama sifatida chiqadi" />

      {/* Create form */}
      <Card className="mb-6 rounded-2xl border border-neutral-200 bg-white shadow-none">
        <Card.Content className="p-5">
          <p className="mb-4 font-semibold text-neutral-900">Foydalanuvchini rasmiy dilerga aylantirish</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-neutral-500">Foydalanuvchi *</label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400"
              >
                <option value="">Dilerni tanlang…</option>
                {dealerUsers.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} · {u.phone}
                  </option>
                ))}
              </select>
              {dealerUsers.length === 0 && (
                <p className="mt-1 text-xs text-neutral-400">
                  Avval «Foydalanuvchilar» sahifasida kimnidir «Diler qilish» tugmasi bilan dilerga aylantiring.
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-500">Sarlavha *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: Naslli qoramollar sotuvi"
                className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-500">Diler nomi (ixtiyoriy — boʻsh boʻlsa foydalanuvchi ismi)</label>
              <input
                value={dealer}
                onChange={(e) => setDealer(e.target.value)}
                placeholder="Masalan: Halol Chorva Fermasi"
                className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-500">Manzil</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Masalan: Toshkent, Chilonzor 12-mavze"
                className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-500">Ish vaqti</label>
              <input
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Masalan: Dush-Shan, 09:00-19:00"
                className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-500">Xarita havolasi</label>
              <input
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
                placeholder="Google Maps yoki Yandex Maps link"
                className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-500">Video fayl * (Cloudflare Stream)</label>
              <input
                ref={videoInput}
                type="file"
                accept="video/*"
                onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-500">Muqova rasmi (ixtiyoriy)</label>
              <input
                ref={thumbInput}
                type="file"
                accept="image/*"
                onChange={(e) => setThumb(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm"
              />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-700">
              <MapPin size={16} />
              Bu maÊ¼lumotlar mobil ilovada diler profilining maxsus blokida koÊ»rinadi.
            </div>
            <Button variant="primary" className="gap-2" isDisabled={!userId || !title.trim() || !video || busy} onPress={submit}>
              <Upload size={16} />
              {busy ? 'Yuklanmoqda…' : 'Qoʻshish'}
            </Button>
          </div>
        </Card.Content>
      </Card>

      {/* Existing dealers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dealers.length === 0 && (
          <div className="col-span-full flex flex-col items-center rounded-2xl border border-dashed border-neutral-200 py-12 text-neutral-400">
            <Video size={32} />
            <p className="mt-2 text-sm">Hali diler videosi yoʻq</p>
          </div>
        )}
        {dealers.map((d) => (
          <Card key={d._id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-none">
            {d.videoProvider === 'cloudflare' && d.providerVideoId ? (
              <CloudflareFrame uid={d.providerVideoId} aspectClass="aspect-video" />
            ) : d.videoUrl ? (
              <video
                src={d.videoUrl}
                poster={d.thumbUrl ?? undefined}
                controls
                className="aspect-video w-full bg-black object-cover"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-neutral-100 text-neutral-400">
                <Video size={28} />
              </div>
            )}
            <Card.Content className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-neutral-900">{d.title}</p>
                  {d.dealer && <p className="truncate text-sm text-neutral-400">{d.dealer}</p>}
                </div>
                <Chip variant="soft" color={d.active ? 'success' : 'default'} size="sm">
                  {d.active ? 'Faol' : 'Yopiq'}
                </Chip>
              </div>
              <div className="mt-3 flex gap-2 border-t border-neutral-100 pt-3">
                <Button
                  variant={d.active ? 'tertiary' : 'primary'}
                  size="sm"
                  className="flex-1"
                  onPress={() => setActive({ id: d._id, active: !d.active })}
                >
                  {d.active ? 'Yopish' : 'Faollashtirish'}
                </Button>
                <Button
                  variant="danger-soft"
                  size="sm"
                  onPress={() => {
                    if (confirm(`"${d.title}" videosini oʻchirasizmi?`)) removeDealer({ id: d._id });
                  }}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CloudflareFrame({ uid, aspectClass }: { uid: string; aspectClass: string }) {
  return (
    <iframe
      src={`https://iframe.videodelivery.net/${uid}?controls=true`}
      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
      allowFullScreen
      className={`${aspectClass} w-full border-0 bg-black`}
    />
  );
}
