import { useState } from "react";
import { useLocation } from "wouter";
import { useGetWorkspace, useListContacts, useCreateContact, getListContactsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Users, Plus } from "lucide-react";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function CommandMenu({ open, setOpen }: { open: boolean, setOpen: (o: boolean) => void }) {
  const [, setLocation] = useLocation();
  const { data: workspace } = useGetWorkspace();
  const { data: contacts = [] } = useListContacts();
  const createContact = useCreateContact();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const handleCreate = async () => {
    if (!search.trim()) return;
    try {
      const newContact = await createContact.mutateAsync({
        data: {
          name: search,
          tags: []
        }
      });
      queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
      setOpen(false);
      setSearch("");
      setLocation(`/contacts/${newContact.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <DialogTitle className="sr-only">Command Menu</DialogTitle>
      <DialogDescription className="sr-only">Search contacts or create a new one.</DialogDescription>
      <CommandInput 
        placeholder={`Search ${workspace?.entityLabelPlural?.toLowerCase() || 'contacts'}...`} 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          <div className="py-6 text-center text-sm text-muted-foreground">
            No results found.
            {search && (
              <button 
                onClick={handleCreate}
                className="block mx-auto mt-2 text-primary hover:underline"
              >
                Create "{search}"
              </button>
            )}
          </div>
        </CommandEmpty>
        
        {search && (
          <CommandGroup heading="Actions">
            <CommandItem onSelect={handleCreate} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Create {workspace?.entityLabel || 'contact'} "{search}"
            </CommandItem>
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading={workspace?.entityLabelPlural || "Contacts"}>
          {contacts.slice(0, 10).map((contact) => (
            <CommandItem
              key={contact.id}
              value={`${contact.name} ${contact.affiliation || ''}`}
              onSelect={() => {
                setOpen(false);
                setSearch("");
                setLocation(`/contacts/${contact.id}`);
              }}
              className="cursor-pointer"
            >
              <Users className="mr-2 h-4 w-4" />
              <span>{contact.name}</span>
              {contact.affiliation && (
                <span className="ml-2 text-muted-foreground text-xs">{contact.affiliation}</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
