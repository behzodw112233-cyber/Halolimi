'use client';

import { Button, Chip } from '@heroui/react';
import { CheckCircle2, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type SaveState = 'idle' | 'saving' | 'saved' | 'dirty' | 'error';
type Scene = { elements: readonly unknown[]; appState: unknown; files: unknown };

type ExcalidrawBoardProps = {
  initialData: unknown;
  status: SaveState;
  onStatusChange: (status: SaveState) => void;
  onSave: (scene: Scene) => Promise<void>;
};

type ExcalidrawComponent = React.ComponentType<{
  initialData: never;
  onChange: (elements: readonly unknown[], appState: unknown, files: unknown) => void;
}>;

type SerializeAsJSON = (
  elements: readonly unknown[],
  appState: unknown,
  files: unknown,
  type: 'local' | 'database'
) => string;

const LOCAL_BACKUP_KEY = 'halolmi_admin_whiteboard_backup';

export function ExcalidrawBoard({
  initialData,
  status,
  onStatusChange,
  onSave,
}: ExcalidrawBoardProps) {
  const [Excalidraw, setExcalidraw] = useState<ExcalidrawComponent | null>(null);
  const [loadData, setLoadData] = useState<unknown>(initialData);
  const [error, setError] = useState('');
  const sceneRef = useRef<Scene>({
    elements: [],
    appState: {},
    files: {},
  });
  const serializeRef = useRef<SerializeAsJSON | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    let live = true;
    import('@excalidraw/excalidraw').then((mod) => {
      if (!live) return;
      serializeRef.current = mod.serializeAsJSON as SerializeAsJSON;
      const backup = readLocalBackup();
      setLoadData(hasSceneContent(initialData) ? initialData : (backup ?? initialData));
      setExcalidraw(() => mod.Excalidraw as ExcalidrawComponent);
    });
    return () => {
      live = false;
    };
  }, [initialData]);

  const makeSerializableScene = () => {
    const serialize = serializeRef.current;
    if (!serialize) return sceneRef.current;
    const json = serialize(
      sceneRef.current.elements,
      sceneRef.current.appState,
      sceneRef.current.files,
      'database'
    );
    return JSON.parse(json) as Scene;
  };

  const save = async () => {
    onStatusChange('saving');
    setError('');
    try {
      const scene = makeSerializableScene();
      writeLocalBackup(scene);
      await onSave(scene);
      onStatusChange('saved');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      onStatusChange('error');
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-none">
      <div className="flex items-center justify-between border-b border-neutral-100 p-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Excalidraw whiteboard</h2>
          <p className="text-sm text-neutral-500">Sketch the holy grail, save it inside Halolmi.</p>
        </div>
        <div className="flex items-center gap-2">
          <SaveChip status={status} />
          <Button variant="primary" size="sm" className="gap-1" onPress={save}>
            <Save size={15} />
            Save
          </Button>
        </div>
      </div>
      {error ? (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">
          Save failed: {error}
        </div>
      ) : null}
      <div className="h-[calc(100vh-270px)] min-h-[640px] w-full p-0">
        {Excalidraw ? (
          <Excalidraw
            initialData={loadData as never}
            onChange={(elements, appState, files) => {
              sceneRef.current = { elements, appState, files };
              if (readyRef.current && status !== 'dirty') onStatusChange('dirty');
              if (readyRef.current) {
                try {
                  writeLocalBackup(makeSerializableScene());
                } catch {
                  // Local backup is best-effort; Convex save will surface real errors.
                }
              }
              readyRef.current = true;
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            Loading whiteboard...
          </div>
        )}
      </div>
    </section>
  );
}

function SaveChip({ status }: { status: SaveState }) {
  const label =
    status === 'saving'
      ? 'Saving...'
      : status === 'dirty'
        ? 'Unsaved'
        : status === 'saved'
          ? 'Saved'
          : status === 'error'
            ? 'Save error'
            : 'Ready';
  const color =
    status === 'error'
      ? 'danger'
      : status === 'dirty'
        ? 'warning'
        : status === 'saving'
          ? 'default'
          : 'success';
  return (
    <Chip variant="soft" color={color} size="sm" className="gap-1">
      {status === 'saved' ? <CheckCircle2 size={13} /> : null}
      {label}
    </Chip>
  );
}

function hasSceneContent(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  const elements = (value as { elements?: unknown }).elements;
  return Array.isArray(elements) && elements.length > 0;
}

function readLocalBackup() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_BACKUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalBackup(scene: Scene) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(scene));
}
