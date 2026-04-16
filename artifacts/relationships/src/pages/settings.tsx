import { useState } from "react";
import { useGetWorkspace, useUpdateWorkspace, useListStages, useCreateStage, useUpdateStage, useDeleteStage, useReorderStages, useListContacts } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, GripVertical, X, Download } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableStage({ stage, onUpdate, onDelete }: { stage: any, onUpdate: (id: string, name: string) => void, onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: stage.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const [name, setName] = useState(stage.name);

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-card border border-border/50 p-2 rounded-md mb-2 group">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground p-1">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.color || 'var(--primary)' }} />
      <Input 
        value={name} 
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name !== stage.name && name.trim()) {
            onUpdate(stage.id, name.trim());
          } else {
            setName(stage.name);
          }
        }}
        className="h-8 flex-1 bg-transparent border-transparent hover:border-border focus-visible:ring-0 px-2"
      />
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onDelete(stage.id)}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function Settings() {
  const { data: workspace, isLoading: isLoadingWorkspace } = useGetWorkspace();
  const { data: stages = [], isLoading: isLoadingStages } = useListStages();
  const { data: allContacts = [] } = useListContacts();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateWorkspace = useUpdateWorkspace();
  const createStage = useCreateStage();
  const updateStage = useUpdateStage();
  const deleteStage = useDeleteStage();
  const reorderStages = useReorderStages();

  const [entityLabel, setEntityLabel] = useState(workspace?.entityLabel || "");
  const [entityLabelPlural, setEntityLabelPlural] = useState(workspace?.entityLabelPlural || "");
  const [affiliationLabel, setAffiliationLabel] = useState(workspace?.affiliationLabel || "");

  // Update local state when workspace loads
  if (workspace && !entityLabel && !updateWorkspace.isPending) {
    setEntityLabel(workspace.entityLabel);
    setEntityLabelPlural(workspace.entityLabelPlural);
    setAffiliationLabel(workspace.affiliationLabel);
  }

  const handleSaveWorkspace = async () => {
    try {
      await updateWorkspace.mutateAsync({
        data: {
          entityLabel,
          entityLabelPlural,
          affiliationLabel,
        }
      });
      toast({ title: "Settings saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/workspace"] });
    } catch (e) {
      toast({ title: "Failed to save settings", variant: "destructive" });
    }
  };

  const [newStageName, setNewStageName] = useState("");
  const handleAddStage = async () => {
    if (!newStageName.trim()) return;
    try {
      await createStage.mutateAsync({ data: { name: newStageName.trim() } });
      setNewStageName("");
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
    } catch (e) {
      toast({ title: "Failed to create stage", variant: "destructive" });
    }
  };

  const handleUpdateStage = async (id: string, name: string) => {
    try {
      await updateStage.mutateAsync({ id, data: { name } });
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
    } catch (e) {
      toast({ title: "Failed to update stage", variant: "destructive" });
    }
  };

  const handleDeleteStage = async (id: string) => {
    try {
      await deleteStage.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
    } catch (e) {
      toast({ title: "Failed to delete stage", variant: "destructive" });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);
    const newOrder = arrayMove(stages, oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData(["/api/stages"], newOrder);

    try {
      await reorderStages.mutateAsync({
        data: { ids: newOrder.map(s => s.id) }
      });
    } catch (e) {
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
      toast({ title: "Failed to reorder stages", variant: "destructive" });
    }
  };

  const handleExportCSV = () => {
    if (!allContacts.length) {
      toast({ title: "No data to export" });
      return;
    }

    const headers = ["Name", workspace?.affiliationLabel || "Affiliation", "Email", "Phone", "Stage", "Tags", "Notes", "Created At", "Updated At"];
    const rows = allContacts.map(c => {
      const stage = stages.find(s => s.id === c.stageId)?.name || "Unassigned";
      return [
        `"${c.name.replace(/"/g, '""')}"`,
        `"${(c.affiliation || "").replace(/"/g, '""')}"`,
        `"${(c.email || "").replace(/"/g, '""')}"`,
        `"${(c.phone || "").replace(/"/g, '""')}"`,
        `"${stage}"`,
        `"${c.tags.join("; ")}"`,
        `"${(c.notes || "").replace(/"/g, '""')}"`,
        `"${c.createdAt}"`,
        `"${c.updatedAt}"`
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relations_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoadingWorkspace || isLoadingStages) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Terminology</CardTitle>
            <CardDescription>Customize what you call records in your workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Record Label (Singular)</Label>
              <Input value={entityLabel} onChange={e => setEntityLabel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Record Label (Plural)</Label>
              <Input value={entityLabelPlural} onChange={e => setEntityLabelPlural(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Affiliation Label</Label>
              <Input value={affiliationLabel} onChange={e => setAffiliationLabel(e.target.value)} />
            </div>
            <Button onClick={handleSaveWorkspace} disabled={updateWorkspace.isPending || !entityLabel || !entityLabelPlural}>
              Save Terminology
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Pipeline Stages</CardTitle>
            <CardDescription>Manage and reorder your pipeline stages.</CardDescription>
          </CardHeader>
          <CardContent>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1 mb-4">
                  {stages.map((stage) => (
                    <SortableStage key={stage.id} stage={stage} onUpdate={handleUpdateStage} onDelete={handleDeleteStage} />
                  ))}
                  {stages.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                      No stages defined.
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
            
            <div className="flex gap-2 mt-4">
              <Input 
                placeholder="New stage name..." 
                value={newStageName} 
                onChange={(e) => setNewStageName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
              />
              <Button onClick={handleAddStage} variant="secondary" className="shrink-0">
                <Plus className="w-4 h-4 mr-2" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Export your workspace data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" /> Export to CSV
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Exports all {workspace?.entityLabelPlural.toLowerCase()} including notes and tags.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
