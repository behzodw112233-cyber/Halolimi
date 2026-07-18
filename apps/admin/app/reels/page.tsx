'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { Button, Card, Chip } from '@heroui/react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { Pin, PinOff, Play, Trash2, Upload, Video } from 'lucide-react';
import { useRef, useState } from 'react';
import { PageHeader } from '@/components/page-header';

export default function ReelsPage() {
  const reels = useQuery(api.reels.listAll) ?? [];
  const users = useQuery(api.users.list) ?? [];
  const listings = useQuery(api.listings.list, {}) ?? [];
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createCloudflareUpload = useAction(api.cloudflareStream.createDirectUpload);
  const createReel = useMutation(api.reels.create);
  const setActive = useMutation(api.reels.setActive);
  const setStatus = useMutation(api.reels.setStatus);
  const setPinned = useMutation(api.reels.setPinned);
  const removeReel = useMutation(api.reels.remove);

  const [sellerId, setSellerId] = useState('');
  const [listingId, setListingId] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [hlsUrl, setHlsUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [video, setVideo] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const videoInput = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);

  const upload = async (file: File): Promise<Id<'_storage'>> => {
    const url = await generateUploadUrl();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    const { storageId } = await res.json();
    return storageId as Id<'_storage'>;
  };

  const uploadVideoToCloudflare = async (file: File) => {
    const direct = await createCloudflareUpload({ maxDurationSeconds: 600, userId: 'admin' });
    const body = new FormData();
    body.append('file', file, file.name || 'halolmia-reel.mp4');
    const res = await fetch(direct.uploadUrl, { method: 'POST', body });
    if (!res.ok) throw new Error(`Cloudflare upload failed (${res.status})`);
    return direct;
  };

  const fillFromListing = (id: string) => {
    setListingId(id);
    const listing = listings.find((l) => l._id === id);
    if (!listing) return;
    setTitle((current) => current || listing.title);
    setPrice((current) => current || listing.price);
    setCity((current) => current || listing.city);
    setCategory((current) => current || listing.category);
    setSellerId((current) => current || listing.ownerId || '');
  };

  const submit = async () => {
    if (!title.trim() || busy || (!video && !hlsUrl.trim())) return;
    setBusy(true);
    try {
      const thumbId = thumb ? await upload(thumb) : undefined;
      const direct = video ? await uploadVideoToCloudflare(video) : null;
      const nextHlsUrl = direct?.hlsUrl ?? (hlsUrl.trim() || undefined);
      const nextThumbnailUrl =
        thumbnailUrl.trim() || direct?.thumbnailUrl || undefined;
      await createReel({
        title: title.trim(),
        caption: caption.trim() || undefined,
        sellerId: sellerId ? (sellerId as Id<'users'>) : undefined,
        listingId: listingId ? (listingId as Id<'listings'>) : undefined,
        category: category.trim() || undefined,
        city: city.trim() || undefined,
        price: price.trim() || undefined,
        thumbId,
        hlsUrl: nextHlsUrl,
        thumbnailUrl: nextThumbnailUrl,
        videoProvider: nextHlsUrl ? 'cloudflare' : 'convex',
        providerVideoId: direct?.uid,
      });
      setSellerId('');
      setListingId('');
      setTitle('');
      setCaption('');
      setPrice('');
      setCity('');
      setCategory('');
      setHlsUrl('');
      setThumbnailUrl('');
      setVideo(null);
      setThumb(null);
      if (videoInput.current) videoInput.current.value = '';
      if (thumbInput.current) thumbInput.current.value = '';
    } catch {
      alert('Reel yuklashda xatolik. Qayta urinib ko`ring.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Reels / Video bozor"
        subtitle="Uy sahifasidagi Video bozor va full-screen Reels tajribasini boshqaring"
      />

      <Card className="mb-6 rounded-2xl border border-neutral-200 bg-white shadow-none">
        <Card.Content className="p-5">
          <p className="mb-4 font-semibold text-neutral-900">Yangi reel qo'shish</p>
          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Sotuvchi">
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400"
              >
                <option value="">Sotuvchini tanlang...</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} · {u.phone}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bog'langan e'lon">
              <select
                value={listingId}
                onChange={(e) => fillFromListing(e.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400"
              >
                <option value="">Ixtiyoriy...</option>
                {listings.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.title} · {l.price}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sarlavha *">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Qora mol · 450 kg"
                className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
              />
            </Field>
            <Field label="Narx">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="12 000 000 so'm"
                className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
              />
            </Field>
            <Field label="Shahar">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Samarqand"
                className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
              />
            </Field>
            <Field label="Kategoriya">
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="cattle"
                className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
              />
            </Field>
            <Field label="Caption">
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Naslli, sog'lom, bozorda tayyor"
                className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
              />
            </Field>
            <Field label="Video fayl yoki HLS URL *">
              <input
                ref={videoInput}
                type="file"
                accept="video/*"
                onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm"
              />
            </Field>
            <Field label="Muqova rasmi">
              <input
                ref={thumbInput}
                type="file"
                accept="image/*"
                onChange={(e) => setThumb(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm"
              />
            </Field>
            <Field label="HLS URL (Cloudflare/Mux)">
              <input
                value={hlsUrl}
                onChange={(e) => setHlsUrl(e.target.value)}
                placeholder="https://.../manifest/video.m3u8"
                className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
              />
            </Field>
            <Field label="Thumbnail URL">
              <input
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://.../thumb.jpg"
                className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
              />
            </Field>
          </div>
          <div className="mt-4">
            <Button
              variant="primary"
              className="gap-2"
              isDisabled={!title.trim() || (!video && !hlsUrl.trim()) || busy}
              onPress={submit}
            >
              <Upload size={16} />
              {busy ? 'Yuklanmoqda...' : "Reel qo'shish"}
            </Button>
          </div>
        </Card.Content>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reels.length === 0 && (
          <div className="col-span-full flex flex-col items-center rounded-2xl border border-dashed border-neutral-200 py-12 text-neutral-400">
            <Video size={32} />
            <p className="mt-2 text-sm">Hali reel yo'q</p>
          </div>
        )}
        {reels.map((r) => (
          <Card key={r._id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-none">
            {r.videoProvider === 'cloudflare' && r.providerVideoId ? (
              <CloudflareFrame uid={r.providerVideoId} aspectClass="aspect-[9/14]" />
            ) : r.videoUrl ? (
              <video
                src={r.videoUrl}
                poster={r.thumbUrl ?? undefined}
                controls
                className="aspect-[9/14] w-full bg-black object-cover"
              />
            ) : (
              <div className="flex aspect-[9/14] w-full items-center justify-center bg-neutral-100 text-neutral-400">
                <Play size={34} />
              </div>
            )}
            <Card.Content className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-neutral-900">{r.title}</p>
                  <p className="truncate text-sm text-neutral-400">
                    {r.sellerName ?? 'Sotuvchi yoq'} {r.price ? `· ${r.price}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Chip variant="soft" color={r.status === 'ready' ? 'success' : r.status === 'rejected' ? 'danger' : 'default'} size="sm">
                    {r.status}
                  </Chip>
                  <Chip variant="soft" color={r.active ? 'accent' : 'default'} size="sm">
                    {r.active ? 'Faol' : 'Yopiq'}
                  </Chip>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-neutral-50 p-3 text-center text-xs text-neutral-500">
                <Metric label="Views" value={r.views} />
                <Metric label="Likes" value={r.likes} />
                <Metric label="Chat" value={r.chatTaps} />
                <Metric label="Call" value={r.callTaps} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
                <Button
                  variant={r.active ? 'tertiary' : 'primary'}
                  size="sm"
                  onPress={() => setActive({ id: r._id, active: !r.active })}
                >
                  {r.active ? 'Yopish' : 'Faollashtirish'}
                </Button>
                <Button
                  variant={r.pinned ? 'primary' : 'tertiary'}
                  size="sm"
                  className="gap-1"
                  onPress={() => setPinned({ id: r._id, pinned: !r.pinned })}
                >
                  {r.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  {r.pinned ? 'Unpin' : 'Pin'}
                </Button>
                {r.status !== 'ready' && (
                  <Button variant="primary" size="sm" onPress={() => setStatus({ id: r._id, status: 'ready' })}>
                    Approve
                  </Button>
                )}
                {r.status !== 'rejected' && (
                  <Button variant="danger-soft" size="sm" onPress={() => setStatus({ id: r._id, status: 'rejected' })}>
                    Reject
                  </Button>
                )}
                <Button
                  variant="danger-soft"
                  size="sm"
                  onPress={() => {
                    if (confirm(`"${r.title}" reelini o'chirasizmi?`)) removeReel({ id: r._id });
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-neutral-500">{label}</label>
      {children}
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-semibold text-neutral-900">{value.toLocaleString('ru-RU')}</p>
      <p>{label}</p>
    </div>
  );
}
