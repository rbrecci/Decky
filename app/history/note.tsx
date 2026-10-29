import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { createNote, deleteNote, getNote, updateNote, validateNoteTitle } from '../../src/history/api';
import { errorMessage } from '../../src/lib/errors';
import { Dialog } from '../../src/ui/Dialog';
import { Button } from '../../src/ui/Button';
import { Notice } from '../../src/ui/Notice';
import { Screen } from '../../src/ui/Screen';
import { Skeleton, SkeletonBlock } from '../../src/ui/Skeleton';
import { TextField } from '../../src/ui/TextField';

/** Cria (?matchId=) ou edita (?id=) uma nota. */
export default function NoteForm() {
  const { id, matchId } = useLocalSearchParams<{ id?: string; matchId?: string }>();
  const editing = !!id;
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deletePending = useRef(false);

  useEffect(() => {
    if (!id) return;
    getNote(id)
      .then((note) => {
        if (!note) setError('Nota não encontrada.');
        else {
          setTitle(note.title);
          setNotes(note.notes);
        }
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    const problem = validateNoteTitle(title);
    setTitleError(problem);
    if (problem) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) await updateNote(id!, title, notes);
      else if (matchId) await createNote(matchId, title, notes);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  function confirmDelete() { setError(null); setDeleteOpen(true); }
  async function removeNote() {
    if (!id || deletePending.current) return;
    deletePending.current = true; setSaving(true); setError(null);
    try { await deleteNote(id); setDeleteOpen(false); router.back(); }
    catch (e) { setError(errorMessage(e)); }
    finally { deletePending.current = false; setSaving(false); }
  }

  if (loading) {
    return (
      <Screen title="Editar nota" onBack={() => router.back()}>
        <Skeleton label="Carregando nota">
          <SkeletonBlock width={70} height={20} />
          <SkeletonBlock height={54} />
          <SkeletonBlock width={95} height={20} />
          <SkeletonBlock height={140} />
          <SkeletonBlock height={52} />
        </Skeleton>
      </Screen>
    );
  }

  return (
    <Screen title={editing ? 'Editar nota' : 'Nova nota'} onBack={() => router.back()}>
      <TextField label="Título" value={title} onChangeText={setTitle} error={titleError} maxLength={80} placeholder="Ex.: Revanche sábado" />
      <TextField
        label="Anotação"
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={2000}
        inputStyle={{ minHeight: 140, textAlignVertical: 'top', paddingTop: 12 }}
        placeholder="O que aconteceu nesta partida?"
      />
      <Dialog open={deleteOpen} title="Excluir nota?" message="Não dá para desfazer."
        confirmLabel="Excluir" busy={saving} error={error} onCancel={() => setDeleteOpen(false)} onConfirm={removeNote} />
      <Notice kind="error" message={error} />
      <Button label="Salvar" onPress={save} loading={saving} disabled={!editing && !matchId} />
      {editing ? <Button label="Excluir nota" variant="secondary" onPress={confirmDelete} /> : null}
    </Screen>
  );
}
