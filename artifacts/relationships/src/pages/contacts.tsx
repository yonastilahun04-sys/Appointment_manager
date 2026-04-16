import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { 
  useGetWorkspace, 
  useListContacts, 
  useListStages, 
  useListTags,
  useCreateContact,
  getListContactsQueryKey,
  useUpdateContact
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Search, 
  Plus, 
  Filter, 
  ChevronDown, 
  ArrowUpDown,
  MoreHorizontal
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Contacts() {
  const [, setLocation] = useLocation();
  const { data: workspace } = useGetWorkspace();
  const { data: stages = [] } = useListStages();
  const { data: tagsData = [] } = useListTags();
  
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  
  const [selectedStage, setSelectedStage] = useState<string | undefined>();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const { data: contacts = [], isLoading } = useListContacts({
    search: debouncedSearch || undefined,
    stageId: selectedStage,
    // Tag filtering not supported natively by the spec with multiple tags, but we'll filter client side for multiple, or pass one.
    tag: selectedTags.length === 1 ? selectedTags[0] : undefined,
  });

  const queryClient = useQueryClient();
  const createContact = useCreateContact();
  const { toast } = useToast();

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'updatedAt', direction: 'desc' });

  // Client side tag filtering if multiple selected
  const filteredContacts = useMemo(() => {
    let result = [...contacts];
    if (selectedTags.length > 1) {
      result = result.filter(c => selectedTags.every(t => c.tags.includes(t)));
    }
    
    if (sortConfig) {
      result.sort((a: any, b: any) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (sortConfig.key === 'stage') {
          const stageA = stages.find(s => s.id === a.stageId)?.position ?? 999;
          const stageB = stages.find(s => s.id === b.stageId)?.position ?? 999;
          aVal = stageA;
          bVal = stageB;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [contacts, selectedTags, sortConfig, stages]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAffiliation, setNewAffiliation] = useState("");
  const [newStageId, setNewStageId] = useState<string>("unassigned");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      const contact = await createContact.mutateAsync({
        data: {
          name: newName,
          affiliation: newAffiliation || undefined,
          stageId: newStageId === "unassigned" ? undefined : newStageId,
          tags: []
        }
      });
      queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
      setIsAddOpen(false);
      setNewName("");
      setNewAffiliation("");
      setNewStageId("unassigned");
      setLocation(`/contacts/${contact.id}`);
    } catch (e) {
      toast({ title: "Error creating contact", variant: "destructive" });
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  if (!workspace) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-border/50 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{workspace.entityLabelPlural}</h1>
        
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 bg-background"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Stage {selectedStage ? `(1)` : ''}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by Stage</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedStage(undefined)}>
                All Stages
              </DropdownMenuItem>
              {stages.map(stage => (
                <DropdownMenuCheckboxItem
                  key={stage.id}
                  checked={selectedStage === stage.id}
                  onCheckedChange={(c) => setSelectedStage(c ? stage.id : undefined)}
                >
                  {stage.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Tags {selectedTags.length > 0 ? `(${selectedTags.length})` : ''}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by Tags</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tagsData.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No tags found</div>
              ) : (
                tagsData.map(t => (
                  <DropdownMenuCheckboxItem
                    key={t.tag}
                    checked={selectedTags.includes(t.tag)}
                    onCheckedChange={() => toggleTag(t.tag)}
                  >
                    {t.tag} ({t.count})
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add {workspace.entityLabel}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New {workspace.entityLabel}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jane Doe" />
                </div>
                <div className="grid gap-2">
                  <Label>{workspace.affiliationLabel}</Label>
                  <Input value={newAffiliation} onChange={e => setNewAffiliation(e.target.value)} placeholder="Acme Corp" />
                </div>
                <div className="grid gap-2">
                  <Label>Stage</Label>
                  <Select value={newStageId} onValueChange={setNewStageId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {stages.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={!newName.trim() || createContact.isPending}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-md border border-border/50 bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[250px] cursor-pointer" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Name {sortConfig?.key === 'name' && <ArrowUpDown className="h-3 w-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('affiliation')}>
                  <div className="flex items-center gap-1">{workspace.affiliationLabel} {sortConfig?.key === 'affiliation' && <ArrowUpDown className="h-3 w-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('stage')}>
                  <div className="flex items-center gap-1">Stage {sortConfig?.key === 'stage' && <ArrowUpDown className="h-3 w-3" />}</div>
                </TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => handleSort('updatedAt')}>
                  <div className="flex items-center justify-end gap-1">Updated {sortConfig?.key === 'updatedAt' && <ArrowUpDown className="h-3 w-3" />}</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No contacts found.</TableCell>
                </TableRow>
              ) : (
                filteredContacts.map((contact) => {
                  const stage = stages.find(s => s.id === contact.stageId);
                  return (
                    <TableRow 
                      key={contact.id} 
                      className="cursor-pointer h-10 hover:bg-muted/50 transition-colors"
                      onClick={() => setLocation(`/contacts/${contact.id}`)}
                    >
                      <TableCell className="font-medium py-2">{contact.name}</TableCell>
                      <TableCell className="text-muted-foreground py-2">{contact.affiliation || '—'}</TableCell>
                      <TableCell className="py-2">
                        {stage ? (
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color || 'var(--primary)' }} />
                            <span className="text-sm">{stage.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal bg-secondary/50">
                              {tag}
                            </Badge>
                          ))}
                          {contact.tags.length > 3 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal bg-secondary/50">
                              +{contact.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm py-2">
                        {format(new Date(contact.updatedAt), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
