import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGetWorkspace, useInitializeWorkspace, getGetWorkspaceQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Plus, X, GripVertical } from "lucide-react";

const PRESETS: Record<string, { entityLabel: string, entityLabelPlural: string, affiliationLabel: string, stages: string[] }> = {
  sales: { entityLabel: "Lead", entityLabelPlural: "Leads", affiliationLabel: "Company", stages: ["Lead", "Contacted", "Meeting Scheduled", "Proposal Sent", "Closed Won", "Closed Lost"] },
  clients: { entityLabel: "Client", entityLabelPlural: "Clients", affiliationLabel: "Company", stages: ["Onboarding", "Active", "At Risk", "Churned"] },
  investors: { entityLabel: "Investor", entityLabelPlural: "Investors", affiliationLabel: "Firm", stages: ["Target", "First Meeting", "Due Diligence", "Term Sheet", "Committed", "Passed"] },
  candidates: { entityLabel: "Candidate", entityLabelPlural: "Candidates", affiliationLabel: "Current Company", stages: ["Sourced", "Screening", "Interview", "Offer", "Hired", "Rejected"] },
  personal: { entityLabel: "Person", entityLabelPlural: "People", affiliationLabel: "Context", stages: ["Met", "Catching Up", "Close"] },
  custom: { entityLabel: "Contact", entityLabelPlural: "Contacts", affiliationLabel: "Organization", stages: ["New", "Active", "Inactive"] },
};

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: workspace, isLoading } = useGetWorkspace();
  const initializeWorkspace = useInitializeWorkspace();

  const [type, setType] = useState<string>("sales");
  const [entityLabel, setEntityLabel] = useState(PRESETS.sales.entityLabel);
  const [entityLabelPlural, setEntityLabelPlural] = useState(PRESETS.sales.entityLabelPlural);
  const [affiliationLabel, setAffiliationLabel] = useState(PRESETS.sales.affiliationLabel);
  const [stages, setStages] = useState<string[]>(PRESETS.sales.stages);
  const [newStage, setNewStage] = useState("");

  useEffect(() => {
    if (workspace?.initialized) {
      setLocation("/");
    }
  }, [workspace, setLocation]);

  const handleTypeChange = (val: string) => {
    setType(val);
    if (PRESETS[val]) {
      setEntityLabel(PRESETS[val].entityLabel);
      setEntityLabelPlural(PRESETS[val].entityLabelPlural);
      setAffiliationLabel(PRESETS[val].affiliationLabel);
      setStages(PRESETS[val].stages);
    }
  };

  const addStage = () => {
    if (newStage.trim()) {
      setStages([...stages, newStage.trim()]);
      setNewStage("");
    }
  };

  const removeStage = (idx: number) => {
    setStages(stages.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!entityLabel || !entityLabelPlural || stages.length === 0) {
      toast.error("Please fill out all required fields and add at least one stage.");
      return;
    }
    try {
      await initializeWorkspace.mutateAsync({
        data: {
          relationshipType: type,
          entityLabel,
          entityLabelPlural,
          affiliationLabel,
          stageNames: stages,
        }
      });
      queryClient.invalidateQueries({ queryKey: getGetWorkspaceQueryKey() });
      toast.success("Workspace initialized!");
      setLocation("/");
    } catch (e) {
      toast.error("Failed to initialize workspace.");
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  if (workspace?.initialized) return null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4 py-12">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Relations</h1>
          <p className="text-muted-foreground mt-2">Let's set up your workspace to match how you work.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>What are you tracking?</CardTitle>
            <CardDescription>Choose a preset to get started quickly. You can customize everything.</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={type} onValueChange={handleTypeChange} className="grid grid-cols-2 gap-4">
              {Object.keys(PRESETS).map((k) => (
                <div key={k}>
                  <RadioGroupItem value={k} id={`type-${k}`} className="peer sr-only" />
                  <Label
                    htmlFor={`type-${k}`}
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                  >
                    <span className="font-medium capitalize">{k === "custom" ? "Custom / Other" : k}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terminology</CardTitle>
            <CardDescription>How do you refer to the people and organizations you interact with?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Record Label (Singular)</Label>
                <Input value={entityLabel} onChange={e => setEntityLabel(e.target.value)} placeholder="e.g. Lead" />
              </div>
              <div className="space-y-2">
                <Label>Record Label (Plural)</Label>
                <Input value={entityLabelPlural} onChange={e => setEntityLabelPlural(e.target.value)} placeholder="e.g. Leads" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Organization / Group Label</Label>
              <Input value={affiliationLabel} onChange={e => setAffiliationLabel(e.target.value)} placeholder="e.g. Company, Firm, Family" />
              <p className="text-xs text-muted-foreground">Used for the secondary grouping field.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline Stages</CardTitle>
            <CardDescription>Define the steps in your process. You can drag to reorder these later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {stages.map((stage, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-muted/50 p-2 rounded-md border border-border/50">
                  <div className="flex-1 text-sm font-medium px-2">{stage}</div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeStage(idx)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {stages.length === 0 && (
                <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">No stages added.</div>
              )}
            </div>
            <div className="flex gap-2">
              <Input value={newStage} onChange={e => setNewStage(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStage()} placeholder="New stage name..." />
              <Button type="button" variant="secondary" onClick={addStage}>Add</Button>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t flex justify-end p-6">
            <Button size="lg" onClick={handleSave} disabled={initializeWorkspace.isPending}>
              {initializeWorkspace.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Complete Setup
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
