import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useGetWorkspace, useListStages, useListContacts, useUpdateContact, getListContactsQueryKey, getGetSummaryQueryKey, getRecentActivityQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function SortableContactCard({ contact }: { contact: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: contact.id, data: { type: "Contact", contact } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`mb-3 cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
    >
      <Card className="border-border/50 hover:border-border shadow-sm transition-colors bg-card hover:bg-muted/10">
        <CardContent className="p-3">
          <div className="font-medium text-sm">{contact.name}</div>
          {contact.affiliation && (
            <div className="text-xs text-muted-foreground mt-0.5">{contact.affiliation}</div>
          )}
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {contact.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0 h-4 font-normal bg-secondary/50">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Column({ stage, contacts }: { stage: any, contacts: any[] }) {
  const { setNodeRef } = useDroppable({
    id: stage.id,
    data: { type: "Column", stage }
  });

  return (
    <div className="flex flex-col flex-shrink-0 w-80 bg-muted/30 rounded-lg border border-border/50 max-h-full">
      <div className="p-3 flex items-center justify-between border-b border-border/50 bg-muted/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color || 'var(--primary)' }} />
          <h3 className="font-medium text-sm">{stage.name}</h3>
        </div>
        <Badge variant="secondary" className="text-xs font-medium bg-background">{contacts.length}</Badge>
      </div>
      <div ref={setNodeRef} className="p-3 flex-1 overflow-y-auto">
        <SortableContext items={contacts.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {contacts.map(contact => (
            <SortableContactCard key={contact.id} contact={contact} />
          ))}
          {contacts.length === 0 && (
            <div className="text-center p-4 text-xs text-muted-foreground border border-dashed rounded-lg bg-background/50">
              No contacts
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export default function Pipeline() {
  const { data: workspace } = useGetWorkspace();
  const { data: stages = [] } = useListStages();
  const { data: contacts = [] } = useListContacts();
  const updateContact = useUpdateContact();
  const queryClient = useQueryClient();

  const [activeContact, setActiveContact] = useState<any | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const contactsByStage = useMemo(() => {
    const map: Record<string, any[]> = {};
    stages.forEach(s => { map[s.id] = []; });
    map["unassigned"] = [];
    
    contacts.forEach(c => {
      if (c.stageId && map[c.stageId]) {
        map[c.stageId].push(c);
      } else {
        map["unassigned"].push(c);
      }
    });
    return map;
  }, [contacts, stages]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "Contact") {
      setActiveContact(active.data.current.contact);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveContact(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const contact = contacts.find(c => c.id === activeId);
    if (!contact) return;

    let targetStageId: string | null = null;

    const isOverColumn = over.data.current?.type === "Column";
    if (isOverColumn) {
      targetStageId = overId;
    } else {
      const overContact = contacts.find(c => c.id === overId);
      if (overContact) {
        targetStageId = overContact.stageId || null;
      }
    }

    if (targetStageId === "unassigned") targetStageId = null;

    if (contact.stageId !== targetStageId) {
      // Optimistic update
      queryClient.setQueryData(getListContactsQueryKey(), (old: any) => {
        if (!old) return old;
        return old.map((c: any) => c.id === contact.id ? { ...c, stageId: targetStageId } : c);
      });

      try {
        await updateContact.mutateAsync({
          id: contact.id,
          data: { stageId: targetStageId }
        });
        queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getRecentActivityQueryKey() });
      } catch (e) {
        queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
      }
    }
  };

  if (!workspace || !stages) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-border/50 shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
      </div>
      
      <div className="flex-1 overflow-x-auto p-6">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 h-full items-start">
            {stages.map(stage => (
              <Column key={stage.id} stage={stage} contacts={contactsByStage[stage.id] || []} />
            ))}
            
            {contactsByStage["unassigned"].length > 0 && (
              <Column key="unassigned" stage={{ id: "unassigned", name: "Unassigned", color: "#6b7280" }} contacts={contactsByStage["unassigned"]} />
            )}
          </div>

          <DragOverlay>
            {activeContact ? (
              <div className="w-80 opacity-90 rotate-2 shadow-xl">
                <SortableContactCard contact={activeContact} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
