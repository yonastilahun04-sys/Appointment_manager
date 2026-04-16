import { useGetWorkspace, useGetSummary, useRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, BarChart3, ArrowRight, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: workspace } = useGetWorkspace();
  const { data: summary } = useGetSummary();
  const { data: recentActivity = [] } = useRecentActivity();

  if (!workspace || !summary) return null;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total {workspace.entityLabelPlural}
            </CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.totalContacts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{summary.contactsThisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Interactions
            </CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.interactionsThisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">
              this week
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-primary/5 hover:bg-primary/10 transition-colors border-primary/20">
          <Link href="/pipeline">
            <span className="block h-full cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-primary">
                  View Pipeline
                </CardTitle>
                <ArrowRight className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mt-2">
                  Track {summary.totalContacts} {workspace.entityLabelPlural.toLowerCase()} across {summary.byStage.length} stages
                </div>
              </CardContent>
            </span>
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Pipeline Breakdown
          </h2>
          <div className="space-y-3">
            {summary.byStage.map((stage) => (
              <div key={stage.stageId} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card">
                <span className="font-medium text-sm">{stage.stageName}</span>
                <span className="bg-secondary px-2.5 py-0.5 rounded-full text-xs font-medium">
                  {stage.count}
                </span>
              </div>
            ))}
            {summary.byStage.length === 0 && (
              <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg border-dashed">
                No stages configured yet.
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Recent Activity
          </h2>
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="relative flex items-start gap-4">
                <div className="absolute left-0 md:left-1/2 w-3 h-3 rounded-full bg-primary/20 border-2 border-primary -translate-x-[5px] md:-translate-x-1.5 mt-1.5 bg-background ring-4 ring-background" />
                <div className="ml-8 md:ml-0 md:w-1/2 md:pr-8 md:text-right">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(activity.occurredAt), "MMM d, h:mm a")}
                  </p>
                </div>
                <div className="ml-8 md:ml-0 md:w-1/2 md:pl-8">
                  <div className="bg-card border border-border/50 p-3 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <Link href={`/contacts/${activity.contactId}`}>
                        <span className="text-sm font-medium hover:underline cursor-pointer">
                          {activity.contactName}
                        </span>
                      </Link>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-secondary px-1.5 rounded">
                        {activity.kind}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {activity.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg border-dashed ml-8 md:ml-0">
                No recent activity. Log interactions to see them here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
