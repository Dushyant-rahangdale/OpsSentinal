'use client';

import NoteCard from '../NoteCard';
import { Card, CardContent, CardHeader } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { MessageSquare, Send, AlertCircle } from 'lucide-react';

type Note = {
  id: string;
  content: string;
  user: { name: string; email: string };
  createdAt: Date;
};

type IncidentNotesProps = {
  notes: Note[];
  canManage: boolean;
  onAddNote: (formData: FormData) => void;
};

export default function IncidentNotes({ notes, canManage, onAddNote }: IncidentNotesProps) {
  return (
    <Card className="shadow-xl border-border/40 overflow-hidden bg-gradient-to-br from-card to-card/95">
      <CardHeader className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white pb-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-0.5">Notes</h3>
              <div className="text-sm text-white/90">Decision trail and responder context</div>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm text-xs uppercase tracking-wider">
            Collaboration
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Notes List */}
        <div className="space-y-4 mb-6">
          {notes.map(note => (
            <NoteCard
              key={note.id}
              content={note.content}
              userName={note.user.name}
              createdAt={note.createdAt}
              isResolution={note.content.startsWith('Resolution:')}
            />
          ))}
          {notes.length === 0 && (
            <div className="py-12 px-8 text-center bg-neutral-50 border-2 border-dashed border-border rounded-lg">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-neutral-400" />
              <p className="text-sm font-semibold text-muted-foreground mb-1">No notes yet</p>
              <p className="text-xs text-muted-foreground">
                Start the conversation by adding a note.
              </p>
            </div>
          )}
        </div>

        {/* Add Note Form */}
        {canManage ? (
          <form action={onAddNote} className="space-y-3">
            <div className="space-y-2">
              <textarea
                name="content"
                placeholder="Add a note... (supports **bold**, *italic*, `code`, links)"
                required
                rows={4}
                className="w-full px-4 py-3 rounded-lg border-2 border-border bg-white text-sm font-normal resize-vertical outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" />
                Supports Markdown formatting
              </p>
            </div>
            <Button
              type="submit"
              className="w-full sm:w-auto font-semibold shadow-md hover:shadow-lg transition-all"
            >
              <Send className="mr-2 h-4 w-4" />
              Post Note
            </Button>
          </form>
        ) : (
          <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-amber-800">
                You don't have access to add notes. Responder role or above required.
              </p>
            </div>
            <div className="space-y-2 opacity-50 pointer-events-none">
              <textarea
                name="content"
                placeholder="Add a note..."
                disabled
                rows={4}
                className="w-full px-4 py-3 rounded-lg border-2 border-neutral-200 bg-neutral-100 text-sm"
              />
              <Button disabled className="w-full sm:w-auto">
                <Send className="mr-2 h-4 w-4" />
                Post Note
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
