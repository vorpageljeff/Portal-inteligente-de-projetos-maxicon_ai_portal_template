"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Section =
  | "overview"
  | "projects"
  | "milestones"
  | "risks"
  | "actions"
  | "requests"
  | "tasks"
  | "deliverables"
  | "impediments"
  | "hours"
  | "reports";
type ModalMode =
  | "project"
  | "milestone"
  | "risk"
  | "action"
  | "task"
  | "deliverable"
  | "impediment"
  | "timeEntry"
  | "serviceRequests"
  | null;
type AuthMode = "login" | "bootstrap";

type Project = {
  id: string;
  name: string;
  client_name: string;
  description?: string | null;
  manager_name?: string | null;
  start_date: string;
  target_end_date: string;
  contracted_hours: number;
  progress_percent: number;
  planned_hours: number;
  actual_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  status: string;
  created_at: string;
};

type Milestone = {
  id: string;
  project_id: string;
  title: string;
  due_date: string;
  status: "pending" | "done" | "late";
};

type Risk = {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  severity: "medium" | "high" | "critical";
  status: "open" | "mitigating" | "closed";
};

type ActionItem = {
  id: string;
  project_id: string;
  title: string;
  priority: "low" | "medium" | "high";
  due_date: string;
  status: "todo" | "in_progress" | "done";
};
type ActionStatus = ActionItem["status"];

type User = {
  email: string;
  full_name: string;
  role: string;
};

type StatusReport = {
  id: string;
  project_id: string;
  period_start: string;
  period_end: string;
  status: "collecting" | "draft" | "in_review" | "approved" | "presented" | "archived";
  approved_by?: string | null;
  approved_at?: string | null;
  latest_content?: string | null;
  created_at: string;
};

type Task = {
  id: string;
  project_id: string;
  title: string;
  owner_name: string;
  start_date: string;
  due_date: string;
  estimated_hours: number;
  progress_percent: number;
  status: "todo" | "in_progress" | "blocked" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  responsible_org: "maxicon" | "client" | "sap" | "third_party";
};

type Deliverable = {
  id: string;
  project_id: string;
  title: string;
  acceptance_criteria: string;
  owner_name: string;
  due_date: string;
  actual_date?: string | null;
  status: "todo" | "in_progress" | "blocked" | "done" | "cancelled";
};

type Impediment = {
  id: string;
  project_id: string;
  description: string;
  affected_activity: string;
  owner_name: string;
  responsible_org: "maxicon" | "client" | "sap" | "third_party";
  impact: string;
  opened_at: string;
  due_date: string;
  status: "todo" | "in_progress" | "blocked" | "done" | "cancelled";
  resolution?: string | null;
};

type TimeEntry = {
  id: string;
  project_id: string;
  task_id?: string | null;
  user_name: string;
  entry_date: string;
  hours: number;
  description: string;
  entry_type:
    | "billable"
    | "non_billable"
    | "internal"
    | "support"
    | "rework"
    | "meeting"
    | "training"
    | "travel"
    | "implementation"
    | "development";
  approval_status: "draft" | "submitted" | "approved" | "rejected" | "corrected";
};

type ServiceRequestSummary = {
  id: string;
  project_id: string;
  period_start: string;
  period_end: string;
  project_requests: number;
  gap_requests: number;
  adjustment_requests: number;
  open_requests: number;
  completed_requests: number;
  late_requests: number;
  critical_requests: number;
  waiting_maxicon: number;
  waiting_client: number;
  waiting_sap: number;
  highlight_number?: string | null;
  highlight_subject?: string | null;
  highlight_owner?: string | null;
  highlight_due_date?: string | null;
  highlight_status?: string | null;
  highlight_impact?: string | null;
  total_requests: number;
  created_at: string;
};

type WeeklyStatusItem = {
  title: string;
  status: string;
  owner?: string | null;
  due_date?: string | null;
  progress_percent?: number | null;
};

type WeeklyStatus = {
  project_id: string;
  project_name: string;
  client_name: string;
  manager_name?: string | null;
  period_start: string;
  period_end: string;
  go_live_date: string;
  days_to_go_live: number;
  progress_real: number;
  progress_expected: number;
  progress_gap: number;
  health_label: string;
  health_percent: number;
  hours: {
    negotiated: number;
    executed: number;
    balance: number;
    billable_rate: number;
  };
  monitoring: Array<{ label: string; value: string; tone: string }>;
  deliverables_in_progress: WeeklyStatusItem[];
  next_steps: WeeklyStatusItem[];
  milestones: WeeklyStatusItem[];
  attention_points: string[];
};

type Dashboard = {
  health_label: string;
  health_percent: number;
  metrics: Array<{ label: string; value: string; delta: string; tone: string }>;
  portfolio_trend: Array<{ label: string; progress_percent: number }>;
  initiatives: Array<{
    project_id: string;
    name: string;
    client_name: string;
    progress_percent: number;
    variation: number;
    status_label: string;
    milestones_done: number;
    milestones_total: number;
    critical_risks: number;
  }>;
  executive_summary: string[];
  milestones: Milestone[];
  risks: Risk[];
  actions: ActionItem[];
};

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
const apiBaseUrl =
  configuredApiUrl && !configuredApiUrl.includes("SUA-API-DO-RENDER")
    ? configuredApiUrl
    : "";

const navGroups: Array<{
  title: string;
  description: string;
  items: Array<{ id: Section; label: string; icon: string }>;
}> = [
  {
    title: "Status semanal",
    description: "Resumo executivo e comunicacao aprovada",
    items: [
      { id: "overview", label: "Dashboard executivo", icon: "D" },
      { id: "requests", label: "Solicitacoes semanais", icon: "S" },
      { id: "reports", label: "Reports semanais", icon: "R" },
      { id: "actions", label: "Plano executivo", icon: "A" },
    ],
  },
  {
    title: "Gestao do projeto",
    description: "Fonte da verdade operacional",
    items: [
      { id: "projects", label: "Projetos", icon: "P" },
      { id: "tasks", label: "Tarefas", icon: "T" },
      { id: "deliverables", label: "Entregas", icon: "E" },
      { id: "milestones", label: "Marcos", icon: "M" },
      { id: "risks", label: "Riscos", icon: "!" },
      { id: "impediments", label: "Impedimentos", icon: "I" },
      { id: "hours", label: "Horas", icon: "H" },
    ],
  },
];

const sectionTitles: Record<Section, string> = {
  overview: "Status Semanal",
  reports: "Status Semanal",
  actions: "Status Semanal",
  requests: "Status Semanal",
  projects: "Gestao do Projeto",
  tasks: "Gestao do Projeto",
  deliverables: "Gestao do Projeto",
  milestones: "Gestao do Projeto",
  risks: "Gestao do Projeto",
  impediments: "Gestao do Projeto",
  hours: "Gestao do Projeto",
};
const today = new Date().toISOString().slice(0, 10);
const nextMonth = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);

const labels: Record<string, string> = {
  active: "Ativo",
  planning: "Planejamento",
  at_risk: "Em atencao",
  completed: "Concluido",
  cancelled: "Cancelado",
  pending: "Pendente",
  late: "Atrasado",
  done: "Concluido",
  open: "Aberto",
  mitigating: "Em mitigacao",
  closed: "Fechado",
  medium: "Media",
  high: "Alta",
  low: "Baixa",
  critical: "Critica",
  todo: "A fazer",
  in_progress: "Em andamento",
  blocked: "Bloqueado",
  draft: "Rascunho",
  submitted: "Enviado",
  approved: "Aprovado",
  rejected: "Rejeitado",
  corrected: "Corrigido",
  collecting: "Em coleta",
  in_review: "Em revisao",
  presented: "Apresentado",
  archived: "Arquivado",
  maxicon: "Maxicon",
  client: "Cliente",
  sap: "SAP",
  third_party: "Terceiro",
  billable: "Rentavel",
  non_billable: "Nao rentavel",
  internal: "Interna",
  support: "Suporte",
  rework: "Retrabalho",
  meeting: "Reuniao",
  training: "Treinamento",
  travel: "Deslocamento",
  implementation: "Implantacao",
  development: "Desenvolvimento",
};

function labelFor(value?: string | null) {
  if (!value) return "Nao informado";
  return labels[value] ?? value;
}

function formatDateBR(value?: string | null) {
  if (!value) return "Nao informado";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatPeriodBR(start?: string | null, end?: string | null) {
  return `${formatDateBR(start)} a ${formatDateBR(end)}`;
}

const emptyDashboard: Dashboard = {
  health_label: "Sem dados",
  health_percent: 0,
  metrics: [
    { label: "Projetos ativos", value: "0", delta: "cadastre o primeiro projeto", tone: "positive" },
    { label: "Progresso medio", value: "0%", delta: "sem base historica", tone: "positive" },
    { label: "Horas apontadas", value: "0h", delta: "0% rentaveis", tone: "positive" },
    { label: "Riscos criticos", value: "0", delta: "monitoramento executivo", tone: "positive" },
  ],
  portfolio_trend: [
    { label: "S24", progress_percent: 0 },
    { label: "S25", progress_percent: 0 },
    { label: "S26", progress_percent: 0 },
    { label: "S27", progress_percent: 0 },
    { label: "S28", progress_percent: 0 },
    { label: "S29", progress_percent: 0 },
  ],
  initiatives: [],
  executive_summary: [
    "Cadastre projetos, marcos, riscos e acoes para alimentar o dashboard.",
  ],
  milestones: [],
  risks: [],
  actions: [],
};

const emptyWeeklyStatus: WeeklyStatus | null = null;

export default function Home() {
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [dashboard, setDashboard] = useState<Dashboard>(emptyDashboard);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [reports, setReports] = useState<StatusReport[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [impediments, setImpediments] = useState<Impediment[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [serviceRequestSummaries, setServiceRequestSummaries] = useState<ServiceRequestSummary[]>([]);
  const [weeklyStatus, setWeeklyStatus] = useState<WeeklyStatus | null>(emptyWeeklyStatus);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [draggingActionId, setDraggingActionId] = useState<string | null>(null);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const totalHours = useMemo(
    () => projects.reduce((total, project) => total + project.actual_hours, 0),
    [projects],
  );
  const billableHours = useMemo(
    () => projects.reduce((total, project) => total + project.billable_hours, 0),
    [projects],
  );
  const nonBillableHours = useMemo(
    () => projects.reduce((total, project) => total + project.non_billable_hours, 0),
    [projects],
  );
  const billablePercent = totalHours ? Math.round((billableHours / totalHours) * 100) : 0;
  const otherHours = Math.max(totalHours - billableHours - nonBillableHours, 0);

  async function apiRequest<T>(path: string, init?: RequestInit, authToken = token): Promise<T> {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      const rawBody = await response.text().catch(() => "");
      let message = rawBody || response.statusText || "Nao foi possivel completar a operacao.";
      try {
        const payload = JSON.parse(rawBody);
        if (Array.isArray(payload?.detail)) {
          message = payload.detail
            .map((item: { msg?: string }) => item.msg)
            .filter(Boolean)
            .join("; ");
        } else if (payload?.detail) {
          message = String(payload.detail);
        }
      } catch {
        // Keep the raw response body when the proxy/backend returns non-JSON.
      }
      throw new Error(`Erro ${response.status}: ${message}`);
    }
    return response.json() as Promise<T>;
  }

  async function loadData() {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [dashboardData, projectData] = await Promise.all([
        apiRequest<Dashboard>("/api/v1/dashboard/executive"),
        apiRequest<Project[]>("/api/v1/projects"),
      ]);
      setDashboard(dashboardData);
      setProjects(projectData);
      if (!selectedProjectId && projectData.length) {
        setSelectedProjectId(projectData[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const storedToken = window.localStorage.getItem("maxicon_portal_token") ?? "";
    if (!storedToken) {
      setLoading(false);
      return;
    }
    setToken(storedToken);
    apiRequest<User>("/api/v1/auth/me", undefined, storedToken)
      .then((me) => {
        setUser(me);
        return Promise.all([
          apiRequest<Dashboard>("/api/v1/dashboard/executive", undefined, storedToken),
          apiRequest<Project[]>("/api/v1/projects", undefined, storedToken),
        ]);
      })
      .then(([dashboardData, projectData]) => {
        setDashboard(dashboardData);
        setProjects(projectData);
        if (projectData.length) {
          setSelectedProjectId(projectData[0].id);
        }
      })
      .catch(() => {
        window.localStorage.removeItem("maxicon_portal_token");
        setToken("");
        setUser(null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (token && selectedProjectId) {
      loadProjectDetails(selectedProjectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, token]);

  async function loadProjectDetails(projectId: string) {
    try {
      const [
        taskData,
        deliverableData,
        impedimentData,
        timeEntryData,
        reportData,
        weeklyData,
        requestSummaryData,
      ] =
        await Promise.all([
          apiRequest<Task[]>(`/api/v1/operations/projects/${projectId}/tasks`),
          apiRequest<Deliverable[]>(`/api/v1/operations/projects/${projectId}/deliverables`),
          apiRequest<Impediment[]>(`/api/v1/operations/projects/${projectId}/impediments`),
          apiRequest<TimeEntry[]>(`/api/v1/operations/projects/${projectId}/time-entries`),
          apiRequest<StatusReport[]>(`/api/v1/status-reports/project/${projectId}`),
          apiRequest<WeeklyStatus>(`/api/v1/dashboard/weekly-status/${projectId}`),
          apiRequest<ServiceRequestSummary[]>(
            `/api/v1/operations/projects/${projectId}/service-request-summaries`,
          ),
        ]);
      setTasks(taskData);
      setDeliverables(deliverableData);
      setImpediments(impedimentData);
      setTimeEntries(timeEntryData);
      setReports(reportData);
      setWeeklyStatus(weeklyData);
      setServiceRequestSummaries(requestSummaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados do projeto.");
    }
  }

  function openSection(section: Section) {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleProjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await submitAndReload(
      "/api/v1/projects",
      {
        name: String(form.get("name")),
        client_name: String(form.get("client_name")),
        description: String(form.get("description") || ""),
        manager_name: String(form.get("manager_name") || ""),
        start_date: String(form.get("start_date")),
        target_end_date: String(form.get("target_end_date")),
        contracted_hours: Number(form.get("contracted_hours") || 0),
        progress_percent: Number(form.get("progress_percent") || 0),
        planned_hours: Number(form.get("planned_hours") || 0),
        actual_hours: Number(form.get("actual_hours") || 0),
        billable_hours: Number(form.get("billable_hours") || 0),
        non_billable_hours: Number(form.get("non_billable_hours") || 0),
        status: String(form.get("status")),
      },
      "Projeto salvo e dashboard atualizado.",
    );
  }

  async function handleMilestoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    const form = new FormData(event.currentTarget);
    await submitAndReload(
      `/api/v1/dashboard/projects/${selectedProject.id}/milestones`,
      {
        title: String(form.get("title")),
        due_date: String(form.get("due_date")),
        status: String(form.get("status")),
      },
      "Marco salvo e indicadores recalculados.",
    );
  }

  async function handleRiskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    const form = new FormData(event.currentTarget);
    await submitAndReload(
      `/api/v1/dashboard/projects/${selectedProject.id}/risks`,
      {
        title: String(form.get("title")),
        description: String(form.get("description") || ""),
        severity: String(form.get("severity")),
        status: String(form.get("status")),
      },
      "Risco salvo e saude do portfolio recalculada.",
    );
  }

  async function handleActionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    const form = new FormData(event.currentTarget);
    await submitAndReload(
      `/api/v1/dashboard/projects/${selectedProject.id}/actions`,
      {
        title: String(form.get("title")),
        priority: String(form.get("priority")),
        due_date: String(form.get("due_date")),
        status: String(form.get("status")),
      },
      "Acao salva e plano atualizado.",
    );
  }

  async function moveAction(actionId: string, nextStatus: ActionStatus) {
    if (!selectedProject) return;
    const action = dashboard.actions.find((item) => item.id === actionId);
    if (!action || action.status === nextStatus) {
      setDraggingActionId(null);
      return;
    }
    setError("");
    setMessage("");
    try {
      await apiRequest(
        `/api/v1/dashboard/projects/${selectedProject.id}/actions/${actionId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      setMessage("Acao movimentada e dashboard atualizado.");
      await loadData();
      await loadProjectDetails(selectedProject.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao movimentar acao.");
    } finally {
      setDraggingActionId(null);
    }
  }

  async function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    const form = new FormData(event.currentTarget);
    await submitAndReload(
      `/api/v1/operations/projects/${selectedProject.id}/tasks`,
      {
        title: String(form.get("title")),
        owner_name: String(form.get("owner_name")),
        start_date: String(form.get("start_date")),
        due_date: String(form.get("due_date")),
        estimated_hours: Number(form.get("estimated_hours") || 0),
        progress_percent: Number(form.get("progress_percent") || 0),
        status: String(form.get("status")),
        priority: String(form.get("priority")),
        responsible_org: String(form.get("responsible_org")),
      },
      "Tarefa salva com regras validadas no backend.",
    );
  }

  async function handleDeliverableSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    const form = new FormData(event.currentTarget);
    await submitAndReload(
      `/api/v1/operations/projects/${selectedProject.id}/deliverables`,
      {
        title: String(form.get("title")),
        acceptance_criteria: String(form.get("acceptance_criteria")),
        owner_name: String(form.get("owner_name")),
        due_date: String(form.get("due_date")),
        actual_date: String(form.get("actual_date") || "") || null,
        status: String(form.get("status")),
      },
      "Entrega salva com criterios de aceite.",
    );
  }

  async function handleImpedimentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    const form = new FormData(event.currentTarget);
    await submitAndReload(
      `/api/v1/operations/projects/${selectedProject.id}/impediments`,
      {
        description: String(form.get("description")),
        affected_activity: String(form.get("affected_activity")),
        owner_name: String(form.get("owner_name")),
        responsible_org: String(form.get("responsible_org")),
        impact: String(form.get("impact")),
        opened_at: String(form.get("opened_at")),
        due_date: String(form.get("due_date")),
        status: String(form.get("status")),
        resolution: String(form.get("resolution") || "") || null,
      },
      "Impedimento salvo e rastreado.",
    );
  }

  async function handleTimeEntrySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    const form = new FormData(event.currentTarget);
    await submitAndReload(
      `/api/v1/operations/projects/${selectedProject.id}/time-entries`,
      {
        task_id: String(form.get("task_id") || "") || null,
        user_name: String(form.get("user_name")),
        entry_date: String(form.get("entry_date")),
        hours: Number(form.get("hours") || 0),
        description: String(form.get("description")),
        entry_type: String(form.get("entry_type")),
        approval_status: String(form.get("approval_status")),
      },
      "Hora apontada e recalculada pelo backend quando aprovada.",
    );
  }

  async function handleServiceRequestSummarySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    const form = new FormData(event.currentTarget);
    await submitAndReload(
      `/api/v1/operations/projects/${selectedProject.id}/service-request-summaries`,
      {
        period_start: String(form.get("period_start")),
        period_end: String(form.get("period_end")),
        project_requests: Number(form.get("project_requests") || 0),
        gap_requests: Number(form.get("gap_requests") || 0),
        adjustment_requests: Number(form.get("adjustment_requests") || 0),
        open_requests: Number(form.get("open_requests") || 0),
        completed_requests: Number(form.get("completed_requests") || 0),
        late_requests: Number(form.get("late_requests") || 0),
        critical_requests: Number(form.get("critical_requests") || 0),
        waiting_maxicon: Number(form.get("waiting_maxicon") || 0),
        waiting_client: Number(form.get("waiting_client") || 0),
        waiting_sap: Number(form.get("waiting_sap") || 0),
        highlight_number: String(form.get("highlight_number") || "") || null,
        highlight_subject: String(form.get("highlight_subject") || "") || null,
        highlight_owner: String(form.get("highlight_owner") || "") || null,
        highlight_due_date: String(form.get("highlight_due_date") || "") || null,
        highlight_status: String(form.get("highlight_status") || "") || null,
        highlight_impact: String(form.get("highlight_impact") || "") || null,
      },
      "Resumo semanal de solicitacoes salvo e conectado ao dashboard.",
    );
  }

  async function submitAndReload(path: string, body: unknown, successMessage: string) {
    setError("");
    setMessage("");
    try {
      await apiRequest(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setModalMode(null);
      setMessage(successMessage);
      await loadData();
      if (selectedProjectId) {
        await loadProjectDetails(selectedProjectId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar dados.");
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const path = authMode === "bootstrap" ? "/api/v1/auth/bootstrap-admin" : "/api/v1/auth/login";
    const body =
      authMode === "bootstrap"
        ? {
            email: String(form.get("email")),
            full_name: String(form.get("full_name")),
            password: String(form.get("password")),
          }
        : {
            email: String(form.get("email")),
            password: String(form.get("password")),
          };
    setError("");
    setMessage("");
    try {
      if (authMode === "bootstrap") {
        await apiRequest(path, { method: "POST", body: JSON.stringify(body) }, "");
        setAuthMode("login");
        setMessage("Administrador criado. Agora faca login.");
        return;
      }
      const response = await apiRequest<{ access_token: string; user: User }>(
        path,
        { method: "POST", body: JSON.stringify(body) },
        "",
      );
      window.localStorage.setItem("maxicon_portal_token", response.access_token);
      setToken(response.access_token);
      setUser(response.user);
      const [dashboardData, projectData] = await Promise.all([
        apiRequest<Dashboard>("/api/v1/dashboard/executive", undefined, response.access_token),
        apiRequest<Project[]>("/api/v1/projects", undefined, response.access_token),
      ]);
      setDashboard(dashboardData);
      setProjects(projectData);
      if (projectData.length) {
        setSelectedProjectId(projectData[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel autenticar.");
    }
  }

  function logout() {
    window.localStorage.removeItem("maxicon_portal_token");
    setToken("");
    setUser(null);
    setProjects([]);
    setReports([]);
  }

  async function generateReport() {
    if (!selectedProject) return;
    await submitAndReload(
      "/api/v1/status-reports",
      {
        project_id: selectedProject.id,
        period_start: today,
        period_end: today,
      },
      "Status report gerado com dados reais do periodo.",
    );
    setActiveSection("reports");
  }

  async function approveReport(reportId: string) {
    setError("");
    setMessage("");
    try {
      await apiRequest(`/api/v1/status-reports/${reportId}/approve`, { method: "POST" });
      setMessage("Status report aprovado e preservado no historico.");
      if (selectedProjectId) {
        await loadProjectDetails(selectedProjectId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao aprovar report.");
    }
  }

  if (!token) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <img alt="Maxicon Sistemas" src="/logo-maxicon.png" />
          <span className="eyebrow">Portal Inteligente de Projetos</span>
          <h1>{authMode === "bootstrap" ? "Criar primeiro administrador" : "Entrar no portal"}</h1>
          {error && <div className="notice error">{error}</div>}
          {message && <div className="notice success">{message}</div>}
          <form className="form-grid" onSubmit={handleAuthSubmit}>
            {authMode === "bootstrap" && (
              <label className="full">
                Nome
                <input name="full_name" required placeholder="Administrador Maxicon" />
              </label>
            )}
            <label className="full">
              E-mail
              <input name="email" required type="email" placeholder="admin@maxicon.com.br" />
            </label>
            <label className="full">
              Senha
              <input name="password" required minLength={8} type="password" />
            </label>
            <button className="primary-btn full" type="submit">
              {authMode === "bootstrap" ? "Criar administrador" : "Entrar"}
            </button>
          </form>
          <button
            className="text-link"
            onClick={() => setAuthMode(authMode === "login" ? "bootstrap" : "login")}
            type="button"
          >
            {authMode === "login" ? "Primeiro acesso" : "Voltar para login"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <img alt="Maxicon Sistemas" src="/logo-maxicon.png" />
          </div>
        </div>

        <nav className="nav" aria-label="Navegacao principal">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              <div className="nav-group-title">
                <strong>{group.title}</strong>
                <span>{group.description}</span>
              </div>
              {group.items.map((item) => (
                <button
                  className={activeSection === item.id ? "nav-item active" : "nav-item"}
                  key={item.id}
                  onClick={() => openSection(item.id)}
                  type="button"
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="anniversary">
            <span className="anniversary-number">25</span>
            <span>
              anos conectando
              <br />
              negocios e tecnologia
            </span>
          </div>
          <button className="collapse-btn" type="button">
            ‹ Recolher menu
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-btn" onClick={loadData} type="button" aria-label="Sincronizar">
              ☰
            </button>
            <h1>{sectionTitles[activeSection]}</h1>
          </div>

          <div className="topbar-actions">
            <label className="period-select">
              <span>Periodo</span>
              <select defaultValue="current">
                <option value="current">12 a 18 de maio de 2025</option>
                <option value="previous">05 a 11 de maio de 2025</option>
                <option value="month">Maio de 2025</option>
              </select>
            </label>
            <button className="icon-btn" onClick={loadData} type="button" aria-label="Atualizar">
              ♧<b>{dashboard.actions.filter((action) => action.status !== "done").length}</b>
            </button>
            <div className="admin-mini">
              <div className="avatar">AD</div>
              <div>
                <strong>{user?.full_name ?? "Usuario"}</strong>
                <span>{user?.role ?? "autenticado"}</span>
              </div>
            </div>
            <button className="text-link" onClick={logout} type="button">
              Sair
            </button>
          </div>
        </header>

        {error && <div className="notice error">{error}</div>}
        {message && <div className="notice success">{message}</div>}
        {loading && <div className="notice info">Sincronizando dados da API...</div>}

        {activeSection === "overview" && (
          <section className="content-section active">
            <section className="hero-panel">
              <div className="hero-orb">
                <div className="shield">✓</div>
              </div>
              <div className="hero-content">
                <h2>Visao consolidada da semana</h2>
                <p>
                  Sintese executiva gerada a partir da gestao operacional do projeto. Aqui entram
                  apenas os pontos que precisam virar comunicacao semanal.
                </p>
              </div>
              <div className="hero-status">
                <span>Saude geral:</span>
                <strong>{dashboard.health_label}</strong>
                <div className="pulse-line" />
              </div>
              <div className="hero-brand">
                <span>{dashboard.health_percent}%</span>
                <strong>maxicon</strong>
                <small>sistemas</small>
              </div>
            </section>

            {weeklyStatus && <WeeklyStatusDashboard status={weeklyStatus} />}

            <section className="kpi-grid">
              {dashboard.metrics.map((metric, index) => (
                <article className={metric.tone === "negative" ? "kpi-card alert" : "kpi-card"} key={metric.label}>
                  <div className={index === 1 ? "kpi-icon ring-icon" : "kpi-icon"}>
                    {index === 0 ? "▣" : index === 1 ? "" : index === 2 ? "◷" : "!"}
                  </div>
                  <div>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                    <small className={metric.tone === "negative" ? "negative" : "positive"}>
                      {metric.delta}
                    </small>
                  </div>
                </article>
              ))}
            </section>

            <section className="dashboard-grid">
              <article className="panel progress-panel">
                <div className="panel-header">
                  <h3>Evolucao do portfolio</h3>
                </div>
                <div className="chart-legend">
                  <span className="solid">Progresso medio (%)</span>
                  <span className="dashed">Meta</span>
                </div>
                <PortfolioChart points={dashboard.portfolio_trend} />
              </article>

              <article className="panel allocation-panel">
                <div className="panel-header">
                  <h3>Alocacao de horas</h3>
                </div>
                <div className="donut-row">
                  <div className="donut" style={{ background: `conic-gradient(var(--blue-600) ${billablePercent}%, #75d3ff ${billablePercent}% 95%, #b6d1e8 95%)` }}>
                    <div className="donut-center">
                      <strong>{billablePercent}%</strong>
                      <span>Rentaveis</span>
                    </div>
                  </div>
                  <div className="legend">
                    <div>
                      <span className="legend-dot rentavel" />
                      <p>
                        Rentaveis <b>{Math.round(billableHours)}h</b>
                      </p>
                    </div>
                    <div>
                      <span className="legend-dot nao-rentavel" />
                      <p>
                        Nao rentaveis <b>{Math.round(nonBillableHours)}h</b>
                      </p>
                    </div>
                    <div>
                      <span className="legend-dot outros" />
                      <p>
                        Outros <b>{Math.round(otherHours)}h</b>
                      </p>
                    </div>
                  </div>
                </div>
                <p className="total-hours">Total de horas: {Math.round(totalHours)}h</p>
              </article>

              <article className="panel summary-panel">
                <div className="panel-header">
                  <h3>Resumo executivo</h3>
                  <span className="doc-icon">▤</span>
                </div>
                <div className="summary-box">
                  {dashboard.executive_summary.map((summary, index) => (
                    <div className={index === 2 ? "summary-item warning" : "summary-item success"} key={summary}>
                      <span>{index === 2 ? "△" : index === 3 ? "↗" : "✓"}</span>
                      <p>{summary}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="lower-grid">
              <StatusTable dashboard={dashboard} openProjects={() => openSection("projects")} />
              <ActionPanel actions={dashboard.actions} openActions={() => openSection("actions")} />
            </section>
          </section>
        )}

        {activeSection === "requests" && (
          <section className="content-section active">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Solicitacoes externas</span>
                <h2>Resumo semanal das solicitacoes</h2>
              </div>
              <button className="primary-btn" onClick={() => setModalMode("serviceRequests")} type="button">
                + Lancar numeros
              </button>
            </div>
            <ServiceRequestSummaryPanel summaries={serviceRequestSummaries} />
          </section>
        )}

        {activeSection === "projects" && (
          <section className="content-section active">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Portfolio</span>
                <h2>Cadastro e acompanhamento dos projetos</h2>
              </div>
              <button className="primary-btn" onClick={() => setModalMode("project")} type="button">
                + Adicionar projeto
              </button>
            </div>
            <ProjectTable projects={projects} selectProject={setSelectedProjectId} />
          </section>
        )}

        {activeSection === "milestones" && (
          <section className="content-section active">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Planejamento</span>
                <h2>Marcos da semana</h2>
              </div>
              <button className="primary-btn" onClick={() => setModalMode("milestone")} type="button">
                + Novo marco
              </button>
            </div>
            <div className="milestone-grid">
              {dashboard.milestones.map((milestone) => (
                <article className="panel milestone-card" key={milestone.id}>
                  <span>{formatDateBR(milestone.due_date)}</span>
                  <h3>{milestone.title}</h3>
                  <p>Status: {labelFor(milestone.status)}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeSection === "risks" && (
          <section className="content-section active">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Governanca</span>
                <h2>Riscos criticos</h2>
              </div>
              <button className="primary-btn" onClick={() => setModalMode("risk")} type="button">
                + Novo risco
              </button>
            </div>
            <div className="risk-grid">
              {dashboard.risks.map((risk) => (
                <article className={`panel risk-card ${risk.severity}`} key={risk.id}>
                  <span>{labelFor(risk.severity)}</span>
                  <h3>{risk.title}</h3>
                  <p>{risk.description || "Sem descricao complementar."}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeSection === "actions" && (
          <section className="content-section active">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Execucao</span>
                <h2>Plano executivo da semana</h2>
              </div>
              <button className="primary-btn" onClick={() => setModalMode("action")} type="button">
                + Nova acao
              </button>
            </div>
            <div className="kanban">
              {(["todo", "in_progress", "done"] as const).map((status) => (
                <article
                  className={draggingActionId ? "panel kanban-column drop-ready" : "panel kanban-column"}
                  key={status}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const actionId = event.dataTransfer.getData("text/plain") || draggingActionId;
                    if (actionId) {
                      void moveAction(actionId, status);
                    }
                  }}
                >
                  <div className="kanban-column-header">
                    <h3>{status === "todo" ? "A fazer" : status === "in_progress" ? "Em andamento" : "Concluido"}</h3>
                    <span>{dashboard.actions.filter((action) => action.status === status).length}</span>
                  </div>
                  {dashboard.actions
                    .filter((action) => action.status === status)
                    .map((action) => (
                      <div
                        className="task-card draggable"
                        draggable
                        key={action.id}
                        onDragEnd={() => setDraggingActionId(null)}
                        onDragStart={(event) => {
                          setDraggingActionId(action.id);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", action.id);
                        }}
                      >
                        <strong>{action.title}</strong>
                        <span>
                          {labelFor(action.priority)} · prazo {formatDateBR(action.due_date)}
                        </span>
                      </div>
                    ))}
                  {!dashboard.actions.some((action) => action.status === status) && (
                    <p className="empty-text">Arraste uma acao para esta coluna.</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {activeSection === "tasks" && (
          <section className="content-section active">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Execucao</span>
                <h2>Tarefas operacionais do projeto</h2>
              </div>
              <button className="primary-btn" onClick={() => setModalMode("task")} type="button">
                + Nova tarefa
              </button>
            </div>
            <div className="record-grid">
              {tasks.map((task) => (
                <article className="panel record-card" key={task.id}>
                  <span>{labelFor(task.priority)} · {labelFor(task.responsible_org)}</span>
                  <h3>{task.title}</h3>
                  <p>{task.owner_name} · {formatPeriodBR(task.start_date, task.due_date)}</p>
                  <div className="progress-track"><span style={{ width: `${task.progress_percent}%` }} /></div>
                  <small>{task.progress_percent}% · {labelFor(task.status)}</small>
                </article>
              ))}
              {!tasks.length && <EmptyPanel text="Nenhuma tarefa cadastrada para o projeto selecionado." />}
            </div>
          </section>
        )}

        {activeSection === "deliverables" && (
          <section className="content-section active">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Aceite</span>
                <h2>Entregas</h2>
              </div>
              <button className="primary-btn" onClick={() => setModalMode("deliverable")} type="button">
                + Nova entrega
              </button>
            </div>
            <div className="record-grid">
              {deliverables.map((deliverable) => (
                <article className="panel record-card" key={deliverable.id}>
                  <span>{labelFor(deliverable.status)}</span>
                  <h3>{deliverable.title}</h3>
                  <p>{deliverable.acceptance_criteria}</p>
                  <small>{deliverable.owner_name} · prazo {formatDateBR(deliverable.due_date)}</small>
                </article>
              ))}
              {!deliverables.length && <EmptyPanel text="Nenhuma entrega cadastrada para o projeto selecionado." />}
            </div>
          </section>
        )}

        {activeSection === "impediments" && (
          <section className="content-section active">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Bloqueios</span>
                <h2>Impedimentos</h2>
              </div>
              <button className="primary-btn" onClick={() => setModalMode("impediment")} type="button">
                + Novo impedimento
              </button>
            </div>
            <div className="record-grid">
              {impediments.map((impediment) => (
                <article className="panel record-card alert-card" key={impediment.id}>
                  <span>{labelFor(impediment.responsible_org)} · {labelFor(impediment.status)}</span>
                  <h3>{impediment.affected_activity}</h3>
                  <p>{impediment.description}</p>
                  <small>{impediment.owner_name} · prazo {formatDateBR(impediment.due_date)}</small>
                </article>
              ))}
              {!impediments.length && <EmptyPanel text="Nenhum impedimento cadastrado para o projeto selecionado." />}
            </div>
          </section>
        )}

        {activeSection === "hours" && (
          <section className="content-section active">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Apontamentos</span>
                <h2>Horas do projeto</h2>
              </div>
              <button className="primary-btn" onClick={() => setModalMode("timeEntry")} type="button">
                + Apontar horas
              </button>
            </div>
            <article className="panel table-panel wide">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Usuario</th>
                    <th>Horas</th>
                    <th>Tipo</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDateBR(entry.entry_date)}</td>
                      <td>{entry.user_name}</td>
                      <td>{entry.hours}</td>
                      <td>{labelFor(entry.entry_type)}</td>
                      <td>{labelFor(entry.approval_status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!timeEntries.length && <p className="empty-text">Nenhum apontamento cadastrado.</p>}
            </article>
          </section>
        )}

        {activeSection === "reports" && (
          <section className="content-section active">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Governanca</span>
                <h2>Status reports semanais</h2>
              </div>
              <button className="primary-btn" onClick={generateReport} type="button">
                + Gerar rascunho
              </button>
            </div>
            <div className="report-list">
              {reports.map((report) => (
                <article className="panel report-card" key={report.id}>
                  <div className="panel-header">
                    <h3>{formatPeriodBR(report.period_start, report.period_end)}</h3>
                    <span className={report.status === "approved" ? "status-pill green" : "status-pill yellow"}>
                      {labelFor(report.status)}
                    </span>
                  </div>
                  <pre>{report.latest_content ?? "Sem conteudo gerado."}</pre>
                  {report.status !== "approved" && (
                    <button className="primary-btn" onClick={() => approveReport(report.id)} type="button">
                      Aprovar report
                    </button>
                  )}
                </article>
              ))}
              {!reports.length && <EmptyPanel text="Nenhum status report gerado para o projeto selecionado." />}
            </div>
          </section>
        )}
      </main>

      {modalMode && (
        <DataModal
          mode={modalMode}
          projects={projects}
          selectedProjectId={selectedProject?.id ?? ""}
          setSelectedProjectId={setSelectedProjectId}
          close={() => setModalMode(null)}
          onProjectSubmit={handleProjectSubmit}
          onMilestoneSubmit={handleMilestoneSubmit}
          onRiskSubmit={handleRiskSubmit}
          onActionSubmit={handleActionSubmit}
          onTaskSubmit={handleTaskSubmit}
          onDeliverableSubmit={handleDeliverableSubmit}
          onImpedimentSubmit={handleImpedimentSubmit}
          onTimeEntrySubmit={handleTimeEntrySubmit}
          onServiceRequestSummarySubmit={handleServiceRequestSummarySubmit}
          tasks={tasks}
        />
      )}
    </div>
  );
}

function PortfolioChart({ points }: { points: Dashboard["portfolio_trend"] }) {
  const safePoints = points.length ? points : emptyDashboard.portfolio_trend;
  const coordinates = safePoints
    .map((point, index) => {
      const x = (index / Math.max(safePoints.length - 1, 1)) * 700;
      const y = 230 - (Math.min(point.progress_percent, 100) / 100) * 190;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `M${coordinates.replaceAll(" ", " L")} L700 230 L0 230 Z`;

  return (
    <div className="line-chart-wrap">
      <div className="chart-y">
        <span>100%</span>
        <span>75%</span>
        <span>50%</span>
        <span>25%</span>
        <span>0%</span>
      </div>
      <div className="line-chart">
        <div className="goal-line" />
        <svg viewBox="0 0 700 230" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d8cff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0d8cff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="area" d={area} />
          <polyline className="line" points={coordinates} />
        </svg>
        <div className="chart-values">
          {safePoints.map((point) => (
            <span key={point.label}>{Math.round(point.progress_percent)}%</span>
          ))}
        </div>
        <div className="chart-labels">
          {safePoints.map((point) => (
            <span key={point.label}>{point.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeeklyStatusDashboard({ status }: { status: WeeklyStatus }) {
  const progressGapTone = status.progress_gap < 0 ? "negative" : "positive";
  return (
    <section className="weekly-status-grid">
      <article className="panel weekly-overview">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Status semanal</span>
            <h3>{status.project_name}</h3>
          </div>
          <span className={status.health_label === "Critico" ? "status-pill red" : status.health_label === "Atencao" ? "status-pill yellow" : "status-pill green"}>
            {status.health_label}
          </span>
        </div>
        <div className="weekly-kpis">
          <div>
            <span>Periodo</span>
            <strong>{formatPeriodBR(status.period_start, status.period_end)}</strong>
          </div>
          <div>
            <span>Go-live</span>
            <strong>{formatDateBR(status.go_live_date)}</strong>
            <small>{status.days_to_go_live} dias</small>
          </div>
          <div>
            <span>Completude real</span>
            <strong>{Math.round(status.progress_real)}%</strong>
          </div>
          <div>
            <span>Esperado</span>
            <strong>{Math.round(status.progress_expected)}%</strong>
            <small className={progressGapTone}>{status.progress_gap} p.p.</small>
          </div>
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <h3>Monitoramento</h3>
        </div>
        <div className="monitoring-grid">
          {status.monitoring.map((item) => (
            <div className={`monitoring-item ${item.tone}`} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <h3>Horas do projeto</h3>
        </div>
        <div className="hours-summary">
          <div><span>Negociadas</span><strong>{Math.round(status.hours.negotiated)}h</strong></div>
          <div><span>Executadas</span><strong>{Math.round(status.hours.executed)}h</strong></div>
          <div><span>Saldo</span><strong>{Math.round(status.hours.balance)}h</strong></div>
          <div><span>Rentaveis</span><strong>{status.hours.billable_rate}%</strong></div>
        </div>
      </article>

      <article className="panel weekly-list">
        <div className="panel-header">
          <h3>Entregaveis em andamento</h3>
        </div>
        <WeeklyItems items={status.deliverables_in_progress} empty="Sem entregaveis em andamento." />
      </article>

      <article className="panel weekly-list">
        <div className="panel-header">
          <h3>Proximos passos</h3>
        </div>
        <WeeklyItems items={status.next_steps} empty="Sem proximos passos cadastrados." />
      </article>

      <article className="panel weekly-list">
        <div className="panel-header">
          <h3>Marcos do projeto</h3>
        </div>
        <WeeklyItems items={status.milestones} empty="Sem marcos cadastrados." />
      </article>

      <article className="panel weekly-attention">
        <div className="panel-header">
          <h3>Pontos de atencao</h3>
        </div>
        {status.attention_points.map((point) => (
          <p key={point}>{point}</p>
        ))}
      </article>
    </section>
  );
}

function WeeklyItems({ items, empty }: { items: WeeklyStatusItem[]; empty: string }) {
  if (!items.length) {
    return <p className="empty-text">{empty}</p>;
  }
  return (
    <div className="weekly-items">
      {items.map((item) => (
        <div key={`${item.title}-${item.due_date ?? ""}`}>
          <strong>{item.title}</strong>
          <span>
            {labelFor(item.status)}
            {item.owner ? ` · ${item.owner}` : ""}
            {item.due_date ? ` · ${formatDateBR(item.due_date)}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusTable({ dashboard, openProjects }: { dashboard: Dashboard; openProjects: () => void }) {
  return (
    <article className="panel table-panel">
      <div className="panel-header">
        <h3>Status por iniciativa</h3>
      </div>
      <table>
        <thead>
          <tr>
            <th>Iniciativa</th>
            <th>Progresso</th>
            <th>Variacao</th>
            <th>Status</th>
            <th>Marcos</th>
            <th>Riscos</th>
          </tr>
        </thead>
        <tbody>
          {dashboard.initiatives.map((initiative) => (
            <tr key={initiative.project_id}>
              <td>{initiative.client_name}</td>
              <td>
                <div className="progress-cell">
                  <b>{Math.round(initiative.progress_percent)}%</b>
                  <div className="progress-track">
                    <span style={{ width: `${initiative.progress_percent}%` }} />
                  </div>
                </div>
              </td>
              <td className={initiative.variation >= 0 ? "positive" : "negative"}>
                {initiative.variation >= 0 ? "↑" : "↓"} {Math.abs(initiative.variation)} p.p.
              </td>
              <td>
                <span className={initiative.status_label === "at_risk" ? "status-pill yellow" : "status-pill green"}>
                  {initiative.status_label === "at_risk" ? "Atencao" : "No caminho"}
                </span>
              </td>
              <td>
                {initiative.milestones_done}/{initiative.milestones_total}
              </td>
              <td>
                <span className={initiative.critical_risks ? "risk-count" : "risk-count muted"}>
                  {initiative.critical_risks}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="text-link" onClick={openProjects} type="button">
        Ver todas as iniciativas →
      </button>
    </article>
  );
}

function ActionPanel({ actions, openActions }: { actions: ActionItem[]; openActions: () => void }) {
  return (
    <article className="panel action-panel">
      <div className="panel-header">
        <h3>Plano de acao - proximos passos</h3>
        <span className="doc-icon">▦</span>
      </div>
      <div className="action-list">
        {actions.map((action) => (
          <label key={action.id}>
            <input checked={action.status === "done"} readOnly type="checkbox" />
            <span>{action.title}</span>
            <b className={`priority ${action.priority}`}>{labelFor(action.priority)}</b>
            <em>{formatDateBR(action.due_date).slice(0, 5)}</em>
          </label>
        ))}
      </div>
      <button className="text-link" onClick={openActions} type="button">
        Ver plano completo →
      </button>
    </article>
  );
}

function ProjectTable({
  projects,
  selectProject,
}: {
  projects: Project[];
  selectProject: (projectId: string) => void;
}) {
  return (
    <article className="panel table-panel wide">
      <table>
        <thead>
          <tr>
            <th>Projeto</th>
            <th>Responsavel</th>
            <th>Progresso</th>
            <th>Prazo</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id} onClick={() => selectProject(project.id)}>
              <td>{project.name}</td>
              <td>{project.manager_name || "Nao informado"}</td>
              <td>{project.progress_percent}%</td>
              <td>{formatDateBR(project.target_end_date)}</td>
              <td>
                <span className={project.status === "at_risk" ? "status-pill yellow" : "status-pill green"}>
                  {labelFor(project.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <article className="panel record-card">
      <h3>{text}</h3>
      <p>Use o botao de cadastro para alimentar o projeto e recalcular os indicadores.</p>
    </article>
  );
}

function ServiceRequestSummaryPanel({ summaries }: { summaries: ServiceRequestSummary[] }) {
  const latest = summaries[0];
  if (!latest) {
    return (
      <div className="record-grid">
        <EmptyPanel text="Nenhum resumo semanal de solicitacoes lancado para o projeto selecionado." />
      </div>
    );
  }

  const cards = [
    ["Total", latest.total_requests],
    ["Projeto", latest.project_requests],
    ["GAP", latest.gap_requests],
    ["Ajustes", latest.adjustment_requests],
    ["Abertas", latest.open_requests],
    ["Concluidas", latest.completed_requests],
    ["Atrasadas", latest.late_requests],
    ["Criticas", latest.critical_requests],
  ];

  return (
    <div className="request-summary-layout">
      <article className="panel request-summary-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Ultimo lancamento</span>
            <h3>{formatPeriodBR(latest.period_start, latest.period_end)}</h3>
          </div>
          <span className={latest.critical_requests ? "status-pill red" : "status-pill green"}>
            {latest.critical_requests ? "Atencao" : "Controlado"}
          </span>
        </div>
        <div className="request-number-grid">
          {cards.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="waiting-row">
          <span>Aguardando Maxicon: <b>{latest.waiting_maxicon}</b></span>
          <span>Cliente: <b>{latest.waiting_client}</b></span>
          <span>SAP/Terceiro: <b>{latest.waiting_sap}</b></span>
        </div>
      </article>

      <article className="panel request-highlight">
        <div className="panel-header">
          <h3>Destaque da semana</h3>
        </div>
        {latest.highlight_number ? (
          <>
            <span className="eyebrow">Solicitacao #{latest.highlight_number}</span>
            <h3>{latest.highlight_subject || "Assunto nao informado"}</h3>
            <p>{latest.highlight_impact || "Sem impacto detalhado."}</p>
            <small>
              {latest.highlight_owner || "Responsavel nao informado"}
              {latest.highlight_status ? ` · ${latest.highlight_status}` : ""}
              {latest.highlight_due_date ? ` · prazo ${formatDateBR(latest.highlight_due_date)}` : ""}
            </small>
          </>
        ) : (
          <p className="empty-text">Nenhuma solicitacao destacada nesse lancamento.</p>
        )}
      </article>

      <article className="panel table-panel wide">
        <div className="panel-header">
          <h3>Historico lancado</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Periodo</th>
              <th>Total</th>
              <th>Abertas</th>
              <th>Concluidas</th>
              <th>Atrasadas</th>
              <th>Criticas</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((summary) => (
              <tr key={summary.id}>
                <td>{formatPeriodBR(summary.period_start, summary.period_end)}</td>
                <td>{summary.total_requests}</td>
                <td>{summary.open_requests}</td>
                <td>{summary.completed_requests}</td>
                <td>{summary.late_requests}</td>
                <td>{summary.critical_requests}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </div>
  );
}

function DataModal({
  mode,
  projects,
  tasks,
  selectedProjectId,
  setSelectedProjectId,
  close,
  onProjectSubmit,
  onMilestoneSubmit,
  onRiskSubmit,
  onActionSubmit,
  onTaskSubmit,
  onDeliverableSubmit,
  onImpedimentSubmit,
  onTimeEntrySubmit,
  onServiceRequestSummarySubmit,
}: {
  mode: ModalMode;
  projects: Project[];
  tasks: Task[];
  selectedProjectId: string;
  setSelectedProjectId: (projectId: string) => void;
  close: () => void;
  onProjectSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMilestoneSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRiskSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onActionSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTaskSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDeliverableSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onImpedimentSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTimeEntrySubmit: (event: FormEvent<HTMLFormElement>) => void;
  onServiceRequestSummarySubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const title =
    mode === "project"
      ? "Novo projeto"
      : mode === "milestone"
        ? "Novo marco"
        : mode === "risk"
          ? "Novo risco"
          : mode === "action"
            ? "Nova acao"
            : mode === "task"
              ? "Nova tarefa"
              : mode === "deliverable"
                ? "Nova entrega"
                : mode === "impediment"
                  ? "Novo impedimento"
                  : mode === "timeEntry"
                    ? "Apontar horas"
                    : "Solicitacoes da semana";
  const submitHandler =
    mode === "project"
      ? onProjectSubmit
      : mode === "milestone"
        ? onMilestoneSubmit
        : mode === "risk"
          ? onRiskSubmit
          : mode === "action"
            ? onActionSubmit
            : mode === "task"
              ? onTaskSubmit
              : mode === "deliverable"
                ? onDeliverableSubmit
            : mode === "impediment"
              ? onImpedimentSubmit
              : mode === "timeEntry"
                ? onTimeEntrySubmit
                : onServiceRequestSummarySubmit;

  return (
    <div className="modal">
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={close} type="button">
          ×
        </button>
        <span className="eyebrow">Preencher dados do dashboard</span>
        <h2>{title}</h2>
        <form className="form-grid" onSubmit={submitHandler}>
          {mode !== "project" && (
            <label className="full">
              Projeto
              <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {mode === "project" && <ProjectFields />}
          {mode === "milestone" && <MilestoneFields />}
          {mode === "risk" && <RiskFields />}
          {mode === "action" && <ActionFields />}
          {mode === "task" && <TaskFields />}
          {mode === "deliverable" && <DeliverableFields />}
          {mode === "impediment" && <ImpedimentFields />}
          {mode === "timeEntry" && <TimeEntryFields tasks={tasks} />}
          {mode === "serviceRequests" && <ServiceRequestSummaryFields />}
          <div className="modal-actions full">
            <button className="secondary-btn" onClick={close} type="button">
              Cancelar
            </button>
            <button className="primary-btn" type="submit">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectFields() {
  return (
    <>
      <label>
        Nome
        <input name="name" required placeholder="Implantacao Cotrijal" />
      </label>
      <label>
        Cliente
        <input name="client_name" required placeholder="Cotrijal" />
      </label>
      <label>
        Responsavel
        <input name="manager_name" placeholder="Jefferson" />
      </label>
      <label>
        Status
        <select name="status" defaultValue="active">
          <option value="planning">Planejamento</option>
          <option value="active">Ativo</option>
          <option value="at_risk">Atencao</option>
          <option value="completed">Concluido</option>
        </select>
      </label>
      <label>
        Inicio
        <input name="start_date" required type="date" defaultValue={today} />
      </label>
      <label>
        Prazo
        <input name="target_end_date" required type="date" defaultValue={nextMonth} />
      </label>
      <label>
        Progresso (%)
        <input name="progress_percent" min="0" max="100" type="number" defaultValue="63" />
      </label>
      <label>
        Horas contratadas
        <input name="contracted_hours" min="0" type="number" defaultValue="240" />
      </label>
      <label>
        Horas planejadas
        <input name="planned_hours" min="0" type="number" defaultValue="120" />
      </label>
      <label>
        Horas apontadas
        <input name="actual_hours" min="0" type="number" defaultValue="80" />
      </label>
      <label>
        Horas rentaveis
        <input name="billable_hours" min="0" type="number" defaultValue="64" />
      </label>
      <label>
        Horas nao rentaveis
        <input name="non_billable_hours" min="0" type="number" defaultValue="16" />
      </label>
      <label className="full">
        Descricao
        <textarea name="description" rows={3} placeholder="Resumo executivo do projeto" />
      </label>
    </>
  );
}

function MilestoneFields() {
  return (
    <>
      <label>
        Marco
        <input name="title" required placeholder="Go/No-Go executivo" />
      </label>
      <label>
        Prazo
        <input name="due_date" required type="date" defaultValue={nextMonth} />
      </label>
      <label className="full">
        Status
        <select name="status" defaultValue="pending">
          <option value="pending">Pendente</option>
          <option value="done">Concluido</option>
          <option value="late">Atrasado</option>
        </select>
      </label>
    </>
  );
}

function RiskFields() {
  return (
    <>
      <label>
        Risco
        <input name="title" required placeholder="Dependencia de retorno SAP" />
      </label>
      <label>
        Severidade
        <select name="severity" defaultValue="high">
          <option value="medium">Medio</option>
          <option value="high">Alto</option>
          <option value="critical">Critico</option>
        </select>
      </label>
      <label>
        Status
        <select name="status" defaultValue="open">
          <option value="open">Aberto</option>
          <option value="mitigating">Mitigando</option>
          <option value="closed">Fechado</option>
        </select>
      </label>
      <label className="full">
        Descricao
        <textarea name="description" rows={3} placeholder="Impacto, probabilidade e mitigacao" />
      </label>
    </>
  );
}

function ActionFields() {
  return (
    <>
      <label>
        Acao
        <input name="title" required placeholder="Finalizar integracoes - Cotrijal" />
      </label>
      <label>
        Prioridade
        <select name="priority" defaultValue="high">
          <option value="low">Baixa</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
        </select>
      </label>
      <label>
        Prazo
        <input name="due_date" required type="date" defaultValue={nextMonth} />
      </label>
      <label>
        Status
        <select name="status" defaultValue="todo">
          <option value="todo">A fazer</option>
          <option value="in_progress">Em andamento</option>
          <option value="done">Concluido</option>
        </select>
      </label>
    </>
  );
}

function OrganizationSelect() {
  return (
    <select name="responsible_org" defaultValue="maxicon">
      <option value="maxicon">Maxicon</option>
      <option value="client">Cliente</option>
      <option value="sap">SAP</option>
      <option value="third_party">Terceiro</option>
    </select>
  );
}

function WorkStatusSelect({ defaultValue = "todo" }: { defaultValue?: string }) {
  return (
    <select name="status" defaultValue={defaultValue}>
      <option value="todo">A fazer</option>
      <option value="in_progress">Em andamento</option>
      <option value="blocked">Bloqueado</option>
      <option value="done">Concluido</option>
      <option value="cancelled">Cancelado</option>
    </select>
  );
}

function TaskFields() {
  return (
    <>
      <label>
        Titulo
        <input name="title" required placeholder="Configurar integracao fiscal" />
      </label>
      <label>
        Responsavel
        <input name="owner_name" required placeholder="Consultor Maxicon" />
      </label>
      <label>
        Inicio
        <input name="start_date" required type="date" defaultValue={today} />
      </label>
      <label>
        Prazo
        <input name="due_date" required type="date" defaultValue={nextMonth} />
      </label>
      <label>
        Estimativa (h)
        <input name="estimated_hours" min="0" type="number" defaultValue="8" />
      </label>
      <label>
        Progresso (%)
        <input name="progress_percent" min="0" max="100" type="number" defaultValue="0" />
      </label>
      <label>
        Prioridade
        <select name="priority" defaultValue="medium">
          <option value="low">Baixa</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
          <option value="critical">Critica</option>
        </select>
      </label>
      <label>
        Organizacao
        <OrganizationSelect />
      </label>
      <label className="full">
        Status
        <WorkStatusSelect />
      </label>
    </>
  );
}

function DeliverableFields() {
  return (
    <>
      <label>
        Entrega
        <input name="title" required placeholder="Homologacao fiscal assinada" />
      </label>
      <label>
        Responsavel
        <input name="owner_name" required placeholder="Gerente do projeto" />
      </label>
      <label>
        Prazo
        <input name="due_date" required type="date" defaultValue={nextMonth} />
      </label>
      <label>
        Data real
        <input name="actual_date" type="date" />
      </label>
      <label className="full">
        Status
        <WorkStatusSelect />
      </label>
      <label className="full">
        Criterio de aceite
        <textarea name="acceptance_criteria" required rows={3} placeholder="Evidencia, aprovador e criterio objetivo de aceite." />
      </label>
    </>
  );
}

function ImpedimentFields() {
  return (
    <>
      <label>
        Atividade afetada
        <input name="affected_activity" required placeholder="Validacao SAP" />
      </label>
      <label>
        Responsavel
        <input name="owner_name" required placeholder="Responsavel pelo desbloqueio" />
      </label>
      <label>
        Organizacao
        <OrganizationSelect />
      </label>
      <label>
        Aberto em
        <input name="opened_at" required type="date" defaultValue={today} />
      </label>
      <label>
        Prazo
        <input name="due_date" required type="date" defaultValue={nextMonth} />
      </label>
      <label>
        Status
        <WorkStatusSelect defaultValue="blocked" />
      </label>
      <label className="full">
        Descricao
        <textarea name="description" required rows={3} placeholder="O que impede o andamento." />
      </label>
      <label className="full">
        Impacto
        <textarea name="impact" required rows={3} placeholder="Impacto em prazo, custo ou qualidade." />
      </label>
      <label className="full">
        Solucao
        <textarea name="resolution" rows={2} placeholder="Obrigatoria se o impedimento estiver concluido." />
      </label>
    </>
  );
}

function TimeEntryFields({ tasks }: { tasks: Task[] }) {
  return (
    <>
      <label className="full">
        Tarefa
        <select name="task_id" defaultValue="">
          <option value="">Sem tarefa vinculada</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Usuario
        <input name="user_name" required placeholder="Consultor Maxicon" />
      </label>
      <label>
        Data
        <input name="entry_date" required type="date" defaultValue={today} />
      </label>
      <label>
        Horas
        <input name="hours" required min="0.25" max="24" step="0.25" type="number" defaultValue="1" />
      </label>
      <label>
        Tipo
        <select name="entry_type" defaultValue="billable">
          <option value="billable">Rentavel</option>
          <option value="non_billable">Nao rentavel</option>
          <option value="internal">Interna</option>
          <option value="support">Suporte</option>
          <option value="rework">Retrabalho</option>
          <option value="meeting">Reuniao</option>
          <option value="training">Treinamento</option>
          <option value="travel">Deslocamento</option>
          <option value="implementation">Implantacao</option>
          <option value="development">Desenvolvimento</option>
        </select>
      </label>
      <label className="full">
        Status de aprovacao
        <select name="approval_status" defaultValue="submitted">
          <option value="draft">Rascunho</option>
          <option value="submitted">Enviado</option>
          <option value="approved">Aprovado</option>
          <option value="rejected">Rejeitado</option>
          <option value="corrected">Corrigido</option>
        </select>
      </label>
      <label className="full">
        Descricao
        <textarea name="description" required rows={3} placeholder="Atividade executada e evidencia." />
      </label>
    </>
  );
}

function ServiceRequestSummaryFields() {
  return (
    <>
      <label>
        Inicio do periodo
        <input name="period_start" required type="date" defaultValue={today} />
      </label>
      <label>
        Fim do periodo
        <input name="period_end" required type="date" defaultValue={today} />
      </label>
      <label>
        Projeto
        <input name="project_requests" min="0" type="number" defaultValue="0" />
      </label>
      <label>
        GAP
        <input name="gap_requests" min="0" type="number" defaultValue="0" />
      </label>
      <label>
        Ajustes
        <input name="adjustment_requests" min="0" type="number" defaultValue="0" />
      </label>
      <label>
        Abertas
        <input name="open_requests" min="0" type="number" defaultValue="0" />
      </label>
      <label>
        Concluidas
        <input name="completed_requests" min="0" type="number" defaultValue="0" />
      </label>
      <label>
        Atrasadas
        <input name="late_requests" min="0" type="number" defaultValue="0" />
      </label>
      <label>
        Criticas
        <input name="critical_requests" min="0" type="number" defaultValue="0" />
      </label>
      <label>
        Aguardando Maxicon
        <input name="waiting_maxicon" min="0" type="number" defaultValue="0" />
      </label>
      <label>
        Aguardando cliente
        <input name="waiting_client" min="0" type="number" defaultValue="0" />
      </label>
      <label>
        Aguardando SAP/Terceiro
        <input name="waiting_sap" min="0" type="number" defaultValue="0" />
      </label>
      <label>
        Numero em destaque
        <input name="highlight_number" placeholder="225135" />
      </label>
      <label>
        Prazo do destaque
        <input name="highlight_due_date" type="date" />
      </label>
      <label>
        Responsavel
        <input name="highlight_owner" placeholder="Maxicon, cliente ou SAP" />
      </label>
      <label>
        Status do destaque
        <input name="highlight_status" placeholder="Em tratativa" />
      </label>
      <label className="full">
        Assunto do destaque
        <input name="highlight_subject" placeholder="Ajustes de contrato e ordem de venda" />
      </label>
      <label className="full">
        Impacto
        <textarea name="highlight_impact" rows={3} placeholder="Impacto em prazo, aceite ou dependencia do projeto." />
      </label>
    </>
  );
}

