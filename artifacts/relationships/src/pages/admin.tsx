import { useRef, useState } from "react";
import { Link } from "wouter";
import {
  useGetCurrentAdmin,
  useAdminLogin,
  useAdminLogout,
  useListAdminAppointments,
  useUpdateAppointmentStatus,
  useDeleteAppointment,
  useGetAdminStats,
  useListPatients,
  useListAdminFiles,
  useRegisterUploadedFile,
  useDeleteAdminFile,
  useRequestUploadUrl,
  getListAdminAppointmentsQueryKey,
  getGetAdminStatsQueryKey,
  getGetCurrentAdminQueryKey,
  getListAdminFilesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import {
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileUp,
  FolderOpen,
  Loader2,
  LogOut,
  Mail,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  X,
  XCircle,
} from "lucide-react";
import { LangToggle, useI18n } from "@/lib/i18n";

type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

export default function AdminPage() {
  const { data: session, isLoading } = useGetCurrentAdmin();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user) {
    return <LoginScreen />;
  }

  return <Dashboard displayName={session.user.displayName} />;
}

function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const login = useAdminLogin();
  const { t, lang } = useI18n();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    login.mutate(
      { data: { username, password } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetCurrentAdminQueryKey(),
          });
        },
        onError: () => {
          setError(
            lang === "am"
              ? "የተሳሳተ የተጠቃሚ ስም ወይም የይለፍ ቃል"
              : "Invalid username or password",
          );
        },
      },
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-100 text-slate-100 dark:text-slate-900 grid place-items-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex justify-center mt-1">
            <LangToggle />
          </div>
          <CardTitle className="text-center">{t("managerSignIn")}</CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            {t("accessDashboard")}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="username">{t("username")}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
                data-testid="input-username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" data-testid="login-error">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={login.isPending}
              data-testid="button-login"
            >
              {login.isPending ? t("signingIn") : t("signIn")}
            </Button>
            <div className="text-center pt-2">
              <Link href="/" className="text-sm text-indigo-600 hover:underline">
                {t("backToChatbot")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Dashboard({ displayName }: { displayName: string }) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"appointments" | "patients" | "files">("appointments");
  const [staffFilter, setStaffFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const stats = useGetAdminStats();
  const list = useListAdminAppointments({
    staff: staffFilter || undefined,
    date: dateFilter || undefined,
    status: (statusFilter as AppointmentStatus) || undefined,
  });
  const updateStatus = useUpdateAppointmentStatus();
  const deleteAppt = useDeleteAppointment();
  const logout = useAdminLogout();

  function refetchAll() {
    queryClient.invalidateQueries({
      queryKey: getListAdminAppointmentsQueryKey(),
    });
    queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
  }

  function handleStatusChange(id: string, status: AppointmentStatus) {
    updateStatus.mutate(
      { id, data: { status } },
      { onSuccess: refetchAll },
    );
  }

  function handleDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete;
    setPendingDelete(null);
    deleteAppt.mutate({ id }, { onSuccess: refetchAll });
  }

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetCurrentAdminQueryKey(),
        });
      },
    });
  }

  const allAppointments = (list.data ?? []) as Array<{
    id: string;
    fullName: string;
    address: string;
    phoneNumber: string;
    email?: string | null;
    reason: string;
    requestedStaff: string;
    appointmentDate: string;
    status: AppointmentStatus;
    createdAt: string;
  }>;

  const q = searchQuery.trim().toLowerCase();
  const appointments = q
    ? allAppointments.filter(
        (a) =>
          a.fullName.toLowerCase().includes(q) ||
          a.phoneNumber.toLowerCase().includes(q) ||
          a.address.toLowerCase().includes(q) ||
          a.reason.toLowerCase().includes(q),
      )
    : allAppointments;

  const staffOptions = Array.from(
    new Set(allAppointments.map((a) => a.requestedStaff)),
  ).sort();

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(searchInput);
  }

  function clearSearch() {
    setSearchInput("");
    setSearchQuery("");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-100 text-slate-100 dark:text-slate-900 grid place-items-center">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold leading-tight">
                {t("appointmentsTitle")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t("signedInAs")} {displayName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <Link href="/">
              <Button variant="ghost" size="sm">
                {t("openChatbot")}
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
              className="gap-1"
            >
              <LogOut className="w-4 h-4" />
              {t("signOut")}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label={t("total")} value={stats.data?.total ?? 0} />
          <StatCard
            label={t("upcoming")}
            value={stats.data?.upcoming ?? 0}
            tone="indigo"
          />
          <StatCard
            label={t("pending")}
            value={stats.data?.pending ?? 0}
            tone="amber"
          />
          <StatCard
            label={t("confirmed")}
            value={stats.data?.confirmed ?? 0}
            tone="emerald"
          />
          <StatCard
            label={t("completed")}
            value={stats.data?.completed ?? 0}
            tone="slate"
          />
        </section>

        {/* Tab switcher */}
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setActiveTab("appointments")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "appointments"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <CalendarCheck2 className="w-4 h-4" />
              {t("appointmentsTab")}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("patients")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "patients"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {t("patientsTab")}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "files"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4" />
              {t("filesTab")}
            </span>
          </button>
        </div>

        {activeTab === "patients" && <PatientsPanel />}
        {activeTab === "files" && <FilesPanel />}

        {activeTab === "appointments" && <Card>
          <CardHeader className="pb-3 space-y-3">
            <div className="flex flex-wrap gap-3 items-end justify-between">
              <div>
                <CardTitle className="text-base">{t("allAppointments")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("searchAndFilter")}
                </p>
              </div>
              <form
                onSubmit={runSearch}
                className="flex items-center gap-2 w-full sm:w-96"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="pl-8 pr-8"
                    data-testid="input-search"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={t("clearSearch")}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Button type="submit" size="sm" data-testid="button-search">
                  <Search className="w-4 h-4" />
                  {t("search")}
                </Button>
              </form>
            </div>
            {searchQuery && (
              <div className="text-xs text-muted-foreground">
                {t("showing")} {appointments.length}{" "}
                {appointments.length === 1 ? t("result") : t("results")}{" "}
                {t("forLabel")}{" "}
                <span className="font-medium text-foreground">
                  "{searchQuery}"
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <Label className="text-xs">{t("staff")}</Label>
                  <Select
                    value={staffFilter || "__all"}
                    onValueChange={(v) =>
                      setStaffFilter(v === "__all" ? "" : v)
                    }
                  >
                    <SelectTrigger
                      className="w-44"
                      data-testid="filter-staff"
                    >
                      <SelectValue placeholder={t("allStaff")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all">{t("allStaff")}</SelectItem>
                      {staffOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t("date")}</Label>
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-44"
                    data-testid="filter-date"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("status")}</Label>
                  <Select
                    value={statusFilter || "__all"}
                    onValueChange={(v) =>
                      setStatusFilter(v === "__all" ? "" : v)
                    }
                  >
                    <SelectTrigger
                      className="w-40"
                      data-testid="filter-status"
                    >
                      <SelectValue placeholder={t("allStatuses")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all">{t("allStatuses")}</SelectItem>
                      <SelectItem value="pending">{t("pending")}</SelectItem>
                      <SelectItem value="confirmed">{t("confirmed")}</SelectItem>
                      <SelectItem value="completed">{t("completed")}</SelectItem>
                      <SelectItem value="cancelled">{t("cancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              {(staffFilter || dateFilter || statusFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-end"
                  onClick={() => {
                    setStaffFilter("");
                    setDateFilter("");
                    setStatusFilter("");
                  }}
                >
                  {t("clearFilters")}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {list.isLoading ? (
              <div className="p-10 grid place-items-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                {t("noAppointments")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("when")}</TableHead>
                      <TableHead>{t("customer")}</TableHead>
                      <TableHead>{t("staff")}</TableHead>
                      <TableHead>{t("reason")}</TableHead>
                      <TableHead>{t("contact")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead className="text-right">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((a) => (
                      <TableRow key={a.id} data-testid={`row-${a.id}`}>
                        <TableCell className="whitespace-nowrap">
                          <div className="font-medium">
                            {formatDate(a.appointmentDate)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTime(a.appointmentDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{a.fullName}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {a.address}
                          </div>
                        </TableCell>
                        <TableCell>{a.requestedStaff}</TableCell>
                        <TableCell className="max-w-xs">
                          <span className="line-clamp-2 text-sm">
                            {a.reason}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-mono">{a.phoneNumber}</div>
                          {a.email && (
                            <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" />
                              {a.email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={a.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <RowActions
                            status={a.status}
                            onConfirm={() =>
                              handleStatusChange(a.id, "confirmed")
                            }
                            onComplete={() =>
                              handleStatusChange(a.id, "completed")
                            }
                            onCancel={() =>
                              handleStatusChange(a.id, "cancelled")
                            }
                            onDelete={() => setPendingDelete(a.id)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>}
      </main>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              data-testid="confirm-delete"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PatientsPanel() {
  const { t } = useI18n();
  const { data: patients, isLoading } = useListPatients();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="p-10 grid place-items-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!patients || patients.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        {t("noPatients")}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("patients")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("patientsDesc")}</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {patients.map((p) => (
            <div key={p.phoneNumber}>
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 grid place-items-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{p.fullName}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <span className="font-mono">{p.phoneNumber}</span>
                      {p.email ? (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />{p.email}
                        </span>
                      ) : (
                        <span className="italic">{t("noEmail")}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-muted-foreground">{t("totalVisits")}</div>
                    <div className="font-semibold text-sm">{p.appointmentCount}</div>
                  </div>
                  {p.lastAppointment && (
                    <div className="text-right hidden md:block">
                      <div className="text-xs text-muted-foreground">{t("lastVisit")}</div>
                      <div className="text-sm">{formatDate(p.lastAppointment)}</div>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(expanded === p.phoneNumber ? null : p.phoneNumber)}
                    className="gap-1"
                  >
                    {expanded === p.phoneNumber ? (
                      <><ChevronUp className="w-4 h-4" />{t("hideHistory")}</>
                    ) : (
                      <><ChevronDown className="w-4 h-4" />{t("viewHistory")}</>
                    )}
                  </Button>
                </div>
              </div>
              {expanded === p.phoneNumber && (
                <div className="bg-muted/40 border-t px-4 py-3 space-y-2">
                  {p.appointments.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 text-sm p-2 rounded-lg bg-background border">
                      <div className="text-muted-foreground whitespace-nowrap text-xs mt-0.5">
                        <div>{formatDate(a.appointmentDate)}</div>
                        <div>{formatTime(a.appointmentDate)}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs">{a.requestedStaff}</div>
                        <div className="text-muted-foreground text-xs line-clamp-1">{a.reason}</div>
                      </div>
                      <StatusBadge status={a.status as AppointmentStatus} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FilesPanel() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: files, isLoading } = useListAdminFiles();
  const requestUrl = useRequestUploadUrl();
  const registerFile = useRegisterUploadedFile();
  const deleteFile = useDeleteAdminFile();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function refetchFiles() {
    queryClient.invalidateQueries({ queryKey: getListAdminFilesQueryKey() });
  }

  async function handleUpload(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const urlData = await requestUrl.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type },
      });

      await fetch(urlData.uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      await registerFile.mutateAsync({
        data: {
          fileName: file.name,
          objectPath: urlData.objectPath,
          fileSize: file.size,
          mimeType: file.type,
        },
      });

      refetchFiles();
    } catch {
      setUploadError(t("uploadError"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  function handleDeleteConfirm() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    deleteFile.mutate({ id }, { onSuccess: refetchFiles });
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getDownloadPath(objectPath: string): string {
    const stripped = objectPath.replace(/^\/objects\//, "");
    return `/storage/objects/${stripped}`;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">{t("filesTab")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("filesDesc")}</p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{t("uploading")}</>
                ) : (
                  <><Upload className="w-4 h-4" />{t("uploadFile")}</>
                )}
              </Button>
            </div>
          </div>
          {uploadError && (
            <p className="text-sm text-destructive mt-1">{uploadError}</p>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`mx-4 mb-4 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                : "border-muted-foreground/25 hover:border-muted-foreground/40"
            }`}
          >
            <FileUp className="w-7 h-7 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-indigo-600 hover:underline font-medium"
              >
                {t("chooseFile")}
              </button>{" "}
              {t("orDragDrop")}
            </p>
          </div>

          {isLoading ? (
            <div className="p-10 grid place-items-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !files || files.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {t("noFiles")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("fileName")}</TableHead>
                    <TableHead>{t("type")}</TableHead>
                    <TableHead>{t("fileSize")}</TableHead>
                    <TableHead>{t("uploadedAt")}</TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium max-w-xs">
                        <span className="truncate block">{f.fileName}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {f.mimeType}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatBytes(f.fileSize)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(f.uploadedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            asChild
                          >
                            <a
                              href={getDownloadPath(f.objectPath)}
                              download={f.fileName}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {t("download")}
                            </a>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setPendingDeleteId(f.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteFileConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteFileDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "indigo" | "amber" | "emerald" | "slate";
}) {
  const toneClass: Record<string, string> = {
    indigo: "text-indigo-600 dark:text-indigo-400",
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    slate: "text-slate-600 dark:text-slate-400",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p
          className={`text-2xl font-semibold mt-1 ${
            tone ? toneClass[tone] : ""
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const map: Record<
    AppointmentStatus,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    pending: {
      label: "Pending",
      className:
        "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300",
      icon: <Clock className="w-3 h-3" />,
    },
    confirmed: {
      label: "Confirmed",
      className:
        "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    completed: {
      label: "Completed",
      className:
        "bg-slate-200 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    cancelled: {
      label: "Cancelled",
      className:
        "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-950 dark:text-red-300",
      icon: <XCircle className="w-3 h-3" />,
    },
  };
  const cfg = map[status];
  return (
    <Badge variant="secondary" className={`gap-1 ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function RowActions({
  status,
  onConfirm,
  onComplete,
  onCancel,
  onDelete,
}: {
  status: AppointmentStatus;
  onConfirm: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-end gap-1">
      {status === "pending" && (
        <Button
          size="sm"
          variant="outline"
          onClick={onConfirm}
          data-testid="button-confirm"
        >
          {t("confirm")}
        </Button>
      )}
      {(status === "pending" || status === "confirmed") && (
        <Button
          size="sm"
          variant="outline"
          onClick={onComplete}
          data-testid="button-complete"
        >
          {t("complete")}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" data-testid="row-menu">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status !== "cancelled" && (
            <DropdownMenuItem onClick={onCancel}>
              <XCircle className="w-4 h-4" />
              {t("cancel")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="w-4 h-4" />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
