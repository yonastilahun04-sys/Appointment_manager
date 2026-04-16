import { useState, useEffect, useRef } from "react";
import { useLocation, useParams, Link } from "wouter";
import { 
  useGetWorkspace, 
  useGetContact, 
  getGetContactQueryKey,
  useUpdateContact, 
  useDeleteContact,
  useListStages,
  useListInteractions,
  getListInteractionsQueryKey,
  useCreateInteraction,
  useDeleteInteraction,
  getListContactsQueryKey,
  getGetSummaryQueryKey,
  getRecentActivityQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Trash2, 
  MessageSquare, 
  Phone, 
  Video, 
  Mail,
  MoreVertical,
  Loader2,
  Calendar,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function ContactDetail() {
  const params = useParams();
  const id = params.id as string;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workspace } = useGetWorkspace();
  const { data: stages = [] } = useListStages();
  const { data: contact, isLoading: isLoadingContact } = useGetContact(id, { 
    query: { enabled: !!id, queryKey: getGetContactQueryKey(id) } 
  });
  const { data: interactions = [], isLoading: isLoadingInteractions } = useListInteractions(id, {
    query: { enabled: !!id, queryKey: getListInteractionsQueryKey(id) }
  });

  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const createInteraction = useCreateInteraction();
  const deleteInteraction = useDeleteInteraction();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Edit fields
  const initializedForId = useRef<string | null>(null);
  const lastSaved = useRef<any>({});

  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [stageId, setStageId] = useState<string>("unassigned");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (contact && initializedForId.current !== id) {
      initializedForId.current = id;
      setName(contact.name || "");
      setAffiliation(contact.affiliation || "");
      setEmail(contact.email || "");
      setPhone(contact.phone || "");
      setStageId(contact.stageId || "unassigned");
      setNotes(contact.notes || "");
      setTags(contact.tags || []);
      
      lastSaved.current = {
        name: contact.name || "",
        affiliation: contact.affiliation || "",
        email: contact.email || "",
        phone: contact.phone || "",
        stageId: contact.stageId || "unassigned",
        notes: contact.notes || "",
        tags: contact.tags || []
      };
    }
  }, [contact, id]);

  const debouncedName = useDebounce(name, 500);
  const debouncedAffiliation = useDebounce(affiliation, 500);
  const debouncedEmail = useDebounce(email, 500);
  const debouncedPhone = useDebounce(phone, 500);
  const debouncedNotes = useDebounce(notes, 500);

  const mutateFnRef = useRef(updateContact.mutate);
  mutateFnRef.current = updateContact.mutate;

  useEffect(() => {
    if (initializedForId.current !== id) return;
    
    const currentData = {
      name: debouncedName,
      affiliation: debouncedAffiliation,
      email: debouncedEmail,
      phone: debouncedPhone,
      stageId,
      notes: debouncedNotes,
      tags
    };

    const hasChanged = JSON.stringify(currentData) !== JSON.stringify(lastSaved.current);
    
    if (hasChanged && currentData.name.trim() !== "") {
      mutateFnRef.current({
        id,
        data: {
          name: currentData.name,
          affiliation: currentData.affiliation || null,
          email: currentData.email || null,
          phone: currentData.phone || null,
          stageId: currentData.stageId === "unassigned" ? null : currentData.stageId,
          notes: currentData.notes || null,
          tags: currentData.tags
        }
      }, {
        onSuccess: (data) => {
          lastSaved.current = currentData;
          queryClient.setQueryData(getGetContactQueryKey(id), data);
          queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
        }
      });
    }
  }, [debouncedName, debouncedAffiliation, debouncedEmail, debouncedPhone, stageId, debouncedNotes, tags, id, queryClient]);

  const handleDelete = async () => {
    try {
      await deleteContact.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
      toast({ title: `${workspace?.entityLabel || 'Contact'} deleted` });
      setLocation("/contacts");
    } catch (e) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newTag.trim()) {
      e.preventDefault();
      if (!tags.includes(newTag.trim())) {
        setTags([...tags, newTag.trim()]);
      }
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Interaction composing
  const [interactionKind, setInteractionKind] = useState("note");
  const [interactionBody, setInteractionBody] = useState("");
  const [interactionDate, setInteractionDate] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  const handleCreateInteraction = async () => {
    if (!interactionBody.trim() || !id) return;
    try {
      await createInteraction.mutateAsync({
        id,
        data: {
          kind: interactionKind,
          body: interactionBody,
          occurredAt: new Date(interactionDate).toISOString(),
        },
      });
      setInteractionBody("");
      queryClient.invalidateQueries({ queryKey: getListInteractionsQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getRecentActivityQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
    } catch (e) {
      // swallow
    }
  };

  
  if (isLoadingContact || !workspace) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!contact) {
    return <div className="p-8 text-center text-muted-foreground">Contact not found.</div>;
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Content (Interactions) */}
      <div className="flex-1 overflow-auto border-r border-border/50">
        <div className="p-6 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/contacts")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{name || 'Unnamed Contact'}</h1>
              {affiliation && <p className="text-sm text-muted-foreground">{affiliation}</p>}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => setIsDeleteDialogOpen(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {workspace.entityLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="p-6 max-w-3xl mx-auto space-y-8">
          {/* Compose Interaction */}
          <div className="bg-card border border-border/50 rounded-lg shadow-sm overflow-hidden">
            <Tabs value={interactionKind} onValueChange={setInteractionKind}>
              <div className="border-b border-border/50 bg-muted/20 px-4 pt-2">
                <TabsList className="bg-transparent h-auto p-0 space-x-4">
                  <TabsTrigger value="note" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 pb-2 pt-2">
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Note
                  </TabsTrigger>
                  <TabsTrigger value="call" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 pb-2 pt-2">
                    <Phone className="w-3.5 h-3.5 mr-1.5" /> Call
                  </TabsTrigger>
                  <TabsTrigger value="meeting" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 pb-2 pt-2">
                    <Video className="w-3.5 h-3.5 mr-1.5" /> Meeting
                  </TabsTrigger>
                  <TabsTrigger value="email" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 pb-2 pt-2">
                    <Mail className="w-3.5 h-3.5 mr-1.5" /> Email
                  </TabsTrigger>
                </TabsList>
              </div>
              <div className="p-4 space-y-4">
                <Textarea 
                  placeholder="Log an interaction..." 
                  className="min-h-[100px] border-0 focus-visible:ring-0 px-0 resize-none"
                  value={interactionBody}
                  onChange={(e) => setInteractionBody(e.target.value)}
                />
                <div className="flex items-center justify-between border-t border-border/50 pt-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="datetime-local" 
                      className="w-auto h-8 text-sm bg-transparent border-0 focus-visible:ring-0 p-0"
                      value={interactionDate}
                      onChange={(e) => setInteractionDate(e.target.value)}
                    />
                  </div>
                  <Button 
                    size="sm" 
                    onClick={async () => {
                      if (!interactionBody.trim()) return;
                      try {
                        await fetch(`/api/contacts/${id}/interactions`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            kind: interactionKind,
                            body: interactionBody,
                            occurredAt: new Date(interactionDate).toISOString()
                          })
                        });
                        queryClient.invalidateQueries({ queryKey: getListInteractionsQueryKey(id) });
                        queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
                        setInteractionBody("");
                      } catch (e) {
                        toast({ title: "Failed to create interaction", variant: "destructive" });
                      }
                    }} 
                    disabled={!interactionBody.trim()}
                  >
                    Log Interaction
                  </Button>
                </div>
              </div>
            </Tabs>
          </div>

          {/* Interaction Feed */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Activity Timeline</h3>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:translate-x-0 before:h-full before:w-0.5 before:bg-border/50">
              {isLoadingInteractions ? (
                <div className="pl-12 text-sm text-muted-foreground">Loading activity...</div>
              ) : interactions.length === 0 ? (
                <div className="pl-12 text-sm text-muted-foreground py-4">No interactions logged yet.</div>
              ) : (
                interactions.map((interaction) => (
                  <div key={interaction.id} className="relative flex items-start gap-4 group">
                    <div className="absolute left-4 w-2 h-2 rounded-full bg-primary/20 border-2 border-primary -translate-x-[3px] mt-2 bg-background ring-4 ring-background" />
                    <div className="pl-12 w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-secondary px-1.5 rounded">
                          {interaction.kind}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(interaction.occurredAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            try {
                              await deleteInteraction.mutateAsync({ id: interaction.id });
                              queryClient.invalidateQueries({ queryKey: getListInteractionsQueryKey(id) });
                              queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
                            } catch (e) {
                              toast({ title: "Failed to delete interaction", variant: "destructive" });
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="text-sm text-foreground whitespace-pre-wrap">
                        {interaction.body}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar (Details Edit) */}
      <div className="w-80 overflow-auto bg-muted/10 shrink-0">
        <div className="p-6 border-b border-border/50 sticky top-0 bg-muted/10 backdrop-blur z-10">
          <h2 className="font-semibold text-sm">Details</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Stage</Label>
            <Select value={stageId} onValueChange={setStageId}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {stages.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="bg-background" />
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{workspace.affiliationLabel}</Label>
            <Input value={affiliation} onChange={e => setAffiliation(e.target.value)} className="bg-background" />
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-background" />
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Phone</Label>
            <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="bg-background" />
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Tags</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1 font-normal bg-background border-border/50 text-xs py-0.5">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-destructive text-muted-foreground transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input 
              placeholder="Add tag and press Enter" 
              value={newTag} 
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={handleAddTag}
              className="bg-background text-sm h-8"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Notes</Label>
            <Textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              className="min-h-[150px] bg-background resize-y" 
              placeholder="Background info, context, etc..."
            />
          </div>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {workspace.entityLabel.toLowerCase()} and all of their interactions.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
