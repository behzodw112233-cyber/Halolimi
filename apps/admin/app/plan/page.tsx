'use client';

import { api } from '@halolmia/backend/convex/_generated/api';
import { Button, Card, Chip } from '@heroui/react';
import { useMutation, useQuery } from 'convex/react';
import {
  CheckCircle2,
  Columns3,
  Edit3,
  ImagePlus,
  LayoutPanelTop,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { ExcalidrawBoard } from '@/components/plan/excalidraw-board';

type PlanMode = 'whiteboard' | 'kanban';
type SaveState = 'idle' | 'saving' | 'saved' | 'dirty' | 'error';

type KanbanCard = {
  id: string;
  title: string;
  body: string;
  owner: string;
  priority: 'low' | 'medium' | 'high';
  imageDataUrl?: string;
  imageName?: string;
  createdAt: number;
};

type KanbanColumn = {
  id: string;
  title: string;
  color: string;
  cards: KanbanCard[];
};

type KanbanData = {
  columns: KanbanColumn[];
};

const DEFAULT_KANBAN: KanbanData = {
  columns: [
    {
      id: 'ideas',
      title: 'Ideas',
      color: '#64748B',
      cards: [
        {
          id: 'seed-idea',
          title: 'Admin roadmap',
          body: 'Capture the next product moves here.',
          owner: 'Behzod',
          priority: 'medium',
          createdAt: Date.now(),
        },
      ],
    },
    { id: 'doing', title: 'Doing', color: '#0A6CFF', cards: [] },
    { id: 'review', title: 'Review', color: '#F59E0B', cards: [] },
    { id: 'done', title: 'Done', color: '#16A34A', cards: [] },
  ],
};

const PRIORITY_META = {
  low: { label: 'Low', className: 'bg-neutral-100 text-neutral-600' },
  medium: { label: 'Med', className: 'bg-blue-50 text-blue-600' },
  high: { label: 'High', className: 'bg-red-50 text-red-600' },
} satisfies Record<KanbanCard['priority'], { label: string; className: string }>;

const emptyCard = (): KanbanCard => ({
  id: crypto.randomUUID(),
  title: '',
  body: '',
  owner: '',
  priority: 'medium',
  createdAt: Date.now(),
});

const MAX_CARD_IMAGE_BYTES = 900_000;

function isKanbanData(value: unknown): value is KanbanData {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as KanbanData).columns)
  );
}

function useAutosave(saveFn: () => Promise<void>, deps: unknown[], enabled: boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveFn();
    }, 900);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default function PlanPage() {
  const [mode, setMode] = useState<PlanMode>('whiteboard');
  const [whiteboardStatus, setWhiteboardStatus] = useState<SaveState>('idle');
  const [kanbanStatus, setKanbanStatus] = useState<SaveState>('idle');
  const [kanban, setKanban] = useState<KanbanData>(DEFAULT_KANBAN);
  const [draftColumn, setDraftColumn] = useState('ideas');
  const [draft, setDraft] = useState<KanbanCard>(() => emptyCard());
  const [editing, setEditing] = useState<{ columnId: string; card: KanbanCard } | null>(null);
  const whiteboardPlan = useQuery(api.plans.get, { kind: 'whiteboard' });
  const kanbanPlan = useQuery(api.plans.get, { kind: 'kanban' });
  const savePlan = useMutation(api.plans.save);
  const [kanbanLoaded, setKanbanLoaded] = useState(false);

  useEffect(() => {
    if (!kanbanPlan || kanbanLoaded) return;
    if (isKanbanData(kanbanPlan.data)) setKanban(kanbanPlan.data);
    setKanbanLoaded(true);
    setKanbanStatus('saved');
  }, [kanbanLoaded, kanbanPlan]);

  const initialExcalidrawData = useMemo(() => {
    if (!whiteboardPlan?.data || typeof whiteboardPlan.data !== 'object') {
      return {
        elements: [],
        appState: { viewBackgroundColor: '#ffffff' },
        files: {},
      };
    }
    return whiteboardPlan.data as {
      elements?: readonly unknown[];
      appState?: Record<string, unknown>;
      files?: Record<string, unknown>;
    };
  }, [whiteboardPlan]);

  const saveWhiteboard = async (scene: { elements: readonly unknown[]; appState: unknown; files: unknown }) => {
    setWhiteboardStatus('saving');
    try {
      await savePlan({
        kind: 'whiteboard',
        title: 'Admin whiteboard',
        data: scene,
      });
      setWhiteboardStatus('saved');
    } catch {
      setWhiteboardStatus('dirty');
    }
  };

  const saveKanban = async (next = kanban) => {
    setKanbanStatus('saving');
    try {
      await savePlan({ kind: 'kanban', title: 'Admin kanban', data: next });
      setKanbanStatus('saved');
    } catch {
      setKanbanStatus('dirty');
    }
  };

  useAutosave(() => saveKanban(kanban), [JSON.stringify(kanban)], kanbanLoaded);

  const totalCards = kanban.columns.reduce((sum, column) => sum + column.cards.length, 0);

  const addCard = async () => {
    const title = draft.title.trim();
    if (!title) return;
    const card = {
      ...draft,
      title,
      body: draft.body.trim(),
      owner: draft.owner.trim(),
    };
    const next = {
      columns: kanban.columns.map((column) =>
        column.id === draftColumn ? { ...column, cards: [card, ...column.cards] } : column
      ),
    };
    setKanban(next);
    setDraft(emptyCard());
    setKanbanStatus('dirty');
  };

  const setDraftImage = async (file: File | null) => {
    if (!file) return;
    const image = await fileToCardImage(file);
    setDraft((card) => ({ ...card, ...image }));
  };

  const clearDraftImage = () => {
    setDraft((card) => ({ ...card, imageDataUrl: undefined, imageName: undefined }));
  };

  const removeCard = (columnId: string, cardId: string) => {
    setKanban((current) => ({
      columns: current.columns.map((column) =>
        column.id === columnId
          ? { ...column, cards: column.cards.filter((card) => card.id !== cardId) }
          : column
      ),
    }));
    setKanbanStatus('dirty');
  };

  const updateCard = () => {
    if (!editing) return;
    const title = editing.card.title.trim();
    if (!title) return;
    setKanban((current) => ({
      columns: current.columns.map((column) =>
        column.id === editing.columnId
          ? {
              ...column,
              cards: column.cards.map((card) =>
                card.id === editing.card.id
                  ? {
                      ...editing.card,
                      title,
                      body: editing.card.body.trim(),
                      owner: editing.card.owner.trim(),
                    }
                  : card
              ),
            }
          : column
      ),
    }));
    setEditing(null);
    setKanbanStatus('dirty');
  };

  const moveCard = (cardId: string, fromColumnId: string, toColumnId: string) => {
    if (fromColumnId === toColumnId) return;
    setKanban((current) => {
      const from = current.columns.find((column) => column.id === fromColumnId);
      const card = from?.cards.find((item) => item.id === cardId);
      if (!card) return current;
      return {
        columns: current.columns.map((column) => {
          if (column.id === fromColumnId) {
            return { ...column, cards: column.cards.filter((item) => item.id !== cardId) };
          }
          if (column.id === toColumnId) return { ...column, cards: [card, ...column.cards] };
          return column;
        }),
      };
    });
    setKanbanStatus('dirty');
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Plan"
        subtitle="Admin roadmap, whiteboard va ishlar taxtasi"
        action={
          <div className="flex items-center gap-2">
            <SegmentedButton
              active={mode === 'whiteboard'}
              icon={<LayoutPanelTop size={16} />}
              label="Whiteboard"
              onClick={() => setMode('whiteboard')}
            />
            <SegmentedButton
              active={mode === 'kanban'}
              icon={<Columns3 size={16} />}
              label="Kanban"
              onClick={() => setMode('kanban')}
            />
          </div>
        }
      />

      {mode === 'whiteboard' ? (
        <ExcalidrawBoard
          key={whiteboardPlan?._id ?? 'new-whiteboard'}
          initialData={initialExcalidrawData}
          status={whiteboardStatus}
          onStatusChange={setWhiteboardStatus}
          onSave={saveWhiteboard}
        />
      ) : (
        <div className="space-y-5">
          <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
            <Card.Content className="grid gap-3 p-4 lg:grid-cols-[1.1fr_1.5fr_1fr_auto_auto]">
              <input
                value={draft.title}
                onChange={(e) => setDraft((card) => ({ ...card, title: e.target.value }))}
                placeholder="Task title"
                className="h-10 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-accent"
              />
              <input
                value={draft.body}
                onChange={(e) => setDraft((card) => ({ ...card, body: e.target.value }))}
                placeholder="Notes"
                className="h-10 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-accent"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={draftColumn}
                  onChange={(e) => setDraftColumn(e.target.value)}
                  className="h-10 rounded-lg border border-neutral-200 bg-white px-2 text-sm outline-none focus:border-accent"
                >
                  {kanban.columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.title}
                    </option>
                  ))}
                </select>
                <select
                  value={draft.priority}
                  onChange={(e) =>
                    setDraft((card) => ({
                      ...card,
                      priority: e.target.value as KanbanCard['priority'],
                    }))
                  }
                  className="h-10 rounded-lg border border-neutral-200 bg-white px-2 text-sm outline-none focus:border-accent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <ImagePicker
                imageDataUrl={draft.imageDataUrl}
                imageName={draft.imageName}
                onPick={setDraftImage}
                onClear={clearDraftImage}
              />
              <Button variant="primary" className="gap-1" onPress={addCard} isDisabled={!draft.title.trim()}>
                <Plus size={16} />
                Add
              </Button>
            </Card.Content>
          </Card>

          <div className="flex items-center justify-between">
            <Chip variant="soft" color="accent">
              {totalCards} cards
            </Chip>
            <div className="flex items-center gap-2">
              <SaveChip status={kanbanStatus} />
              <Button variant="secondary" size="sm" className="gap-1" onPress={() => saveKanban()}>
                <Save size={15} />
                Save now
              </Button>
            </div>
          </div>

          <div className="grid min-h-[560px] grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {kanban.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                onMove={moveCard}
                onEdit={(card) => setEditing({ columnId: column.id, card })}
                onRemove={(cardId) => removeCard(column.id, cardId)}
              />
            ))}
          </div>
        </div>
      )}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-xl">
            <Card.Header className="p-5 pb-2">
              <Card.Title className="text-base font-semibold text-neutral-900">Edit card</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-3 p-5 pt-2">
              <input
                value={editing.card.title}
                onChange={(e) =>
                  setEditing((current) =>
                    current ? { ...current, card: { ...current.card, title: e.target.value } } : current
                  )
                }
                className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-accent"
              />
              <textarea
                value={editing.card.body}
                onChange={(e) =>
                  setEditing((current) =>
                    current ? { ...current, card: { ...current.card, body: e.target.value } } : current
                  )
                }
                rows={4}
                className="w-full rounded-lg border border-neutral-200 p-3 text-sm outline-none focus:border-accent"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={editing.card.owner}
                  onChange={(e) =>
                    setEditing((current) =>
                      current ? { ...current, card: { ...current.card, owner: e.target.value } } : current
                    )
                  }
                  placeholder="Owner"
                  className="h-10 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-accent"
                />
                <select
                  value={editing.card.priority}
                  onChange={(e) =>
                    setEditing((current) =>
                      current
                        ? {
                            ...current,
                            card: {
                              ...current.card,
                              priority: e.target.value as KanbanCard['priority'],
                            },
                          }
                        : current
                    )
                  }
                  className="h-10 rounded-lg border border-neutral-200 bg-white px-2 text-sm outline-none focus:border-accent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <ImagePicker
                imageDataUrl={editing.card.imageDataUrl}
                imageName={editing.card.imageName}
                onPick={async (file) => {
                  if (!file) return;
                  const image = await fileToCardImage(file);
                  setEditing((current) =>
                    current ? { ...current, card: { ...current.card, ...image } } : current
                  );
                }}
                onClear={() =>
                  setEditing((current) =>
                    current
                      ? {
                          ...current,
                          card: {
                            ...current.card,
                            imageDataUrl: undefined,
                            imageName: undefined,
                          },
                        }
                      : current
                  )
                }
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="tertiary" onPress={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button variant="primary" onPress={updateCard}>
                  Save card
                </Button>
              </div>
            </Card.Content>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function ImagePicker({
  imageDataUrl,
  imageName,
  onPick,
  onClear,
}: {
  imageDataUrl?: string;
  imageName?: string;
  onPick: (file: File | null) => void | Promise<void>;
  onClear: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <label className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100">
        <ImagePlus size={16} />
        Image
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onPick(e.target.files?.[0] ?? null);
            e.currentTarget.value = '';
          }}
        />
      </label>
      {imageDataUrl ? (
        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageDataUrl} alt={imageName ?? 'Card image'} className="h-8 w-10 rounded-md object-cover" />
          <span className="max-w-28 truncate text-xs text-neutral-500">{imageName ?? 'image'}</span>
          <button
            type="button"
            onClick={onClear}
            className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-white hover:text-red-500"
            title="Remove image"
          >
            <X size={13} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SegmentedButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
        active ? 'bg-accent text-white' : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SaveChip({ status }: { status: SaveState }) {
  const label =
    status === 'saving' ? 'Saving...' : status === 'dirty' ? 'Unsaved' : status === 'saved' ? 'Saved' : 'Ready';
  const color = status === 'dirty' ? 'warning' : status === 'saving' ? 'default' : 'success';
  return (
    <Chip variant="soft" color={color} size="sm" className="gap-1">
      {status === 'saved' ? <CheckCircle2 size={13} /> : null}
      {label}
    </Chip>
  );
}

async function fileToCardImage(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Only image files are supported');

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image failed to load'));
      img.src = objectUrl;
    });

    const scale = Math.min(1, 900 / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable');
    ctx.drawImage(image, 0, 0, width, height);

    let quality = 0.78;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > MAX_CARD_IMAGE_BYTES && quality > 0.42) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    if (dataUrl.length > MAX_CARD_IMAGE_BYTES) {
      throw new Error('Image is too large after compression');
    }

    return { imageDataUrl: dataUrl, imageName: file.name };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function KanbanColumn({
  column,
  onMove,
  onEdit,
  onRemove,
}: {
  column: KanbanColumn;
  onMove: (cardId: string, fromColumnId: string, toColumnId: string) => void;
  onEdit: (card: KanbanCard) => void;
  onRemove: (cardId: string) => void;
}) {
  return (
    <section
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const cardId = e.dataTransfer.getData('cardId');
        const fromColumnId = e.dataTransfer.getData('columnId');
        if (cardId && fromColumnId) onMove(cardId, fromColumnId, column.id);
      }}
      className="flex min-h-[560px] flex-col rounded-2xl border border-neutral-200 bg-white"
    >
      <div className="flex items-center justify-between border-b border-neutral-100 p-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
          <h2 className="text-sm font-bold text-neutral-900">{column.title}</h2>
        </div>
        <Chip variant="soft" color="default" size="sm">
          {column.cards.length}
        </Chip>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3">
        {column.cards.map((card) => (
          <article
            key={card.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('cardId', card.id);
              e.dataTransfer.setData('columnId', column.id);
            }}
            className="cursor-grab rounded-xl border border-neutral-200 bg-neutral-50 p-3 shadow-sm active:cursor-grabbing"
          >
            {card.imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.imageDataUrl}
                alt={card.imageName ?? card.title}
                className="mb-3 aspect-video w-full rounded-lg object-cover"
              />
            ) : null}
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-neutral-900">{card.title}</h3>
              <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${PRIORITY_META[card.priority].className}`}>
                {PRIORITY_META[card.priority].label}
              </span>
            </div>
            {card.body ? <p className="mt-2 text-xs leading-5 text-neutral-500">{card.body}</p> : null}
            <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3">
              <span className="truncate text-xs text-neutral-400">{card.owner || 'No owner'}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(card)}
                  className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-white hover:text-neutral-900"
                  title="Edit"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => onRemove(card.id)}
                  className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-white hover:text-red-500"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </article>
        ))}
        {column.cards.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-neutral-200 text-sm text-neutral-400">
            Drop cards here
          </div>
        ) : null}
      </div>
    </section>
  );
}
