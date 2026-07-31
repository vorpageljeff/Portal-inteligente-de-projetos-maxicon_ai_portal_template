"use client";

import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";

import {
  DocumentCenter,
  ErrorState,
  ExecutiveSummary,
  HoursSummary,
  KpiCard,
  LoadingState,
  PendingDecisionsTable,
  ProgressComparisonChart,
  ProjectHeader,
  RisksTable,
  StatusHistory,
  WeeklyAchievements,
  WeeklyClosingWizard,
} from "./components/portal-components";
import { percentage } from "./lib/project-metrics";

type Section =
  | "overview"
  | "closing"
  | "documents"
  | "settings"
  | "ai"
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
  | "user"
  | "project"
  | "milestone"
  | "risk"
  | "action"
  | "task"
  | "deliverable"
  | "impediment"
  | "timeEntry"
  | "serviceRequests"
  | "statusCycle"
  | null;
type AuthMode = "login" | "bootstrap";
type ClosingMode = "ai" | "manual" | null;
type ManualClosingKey = "tasks" | "deliverables" | "hours" | "risks" | "actions" | "requests";

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

type StatusCycle = {
  id: string;
  project_id: string;
  title: string;
  meeting_date: string;
  period_start: string;
  period_end: string;
  status: "collecting" | "ready" | "presented" | "approved" | "archived";
  notes?: string | null;
  created_at: string;
};

type ServiceRequestSummary = {
  id: string;
  project_id: string;
  period_start: string;
  period_end: string;
  project_requests: number;
  cr_requests: number;
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

type AiIntakeDraft = {
  project_name?: string | null;
  progress_percent?: number | null;
  confidence: number;
  summary: string;
  status_cycle: {
    title: string;
    meeting_date: string;
    period_start: string;
    period_end: string;
    notes?: string | null;
  };
  service_requests: {
    project_requests: number;
    cr_requests: number;
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
  };
  tasks: Array<{
    title: string;
    owner_name: string;
    start_date: string;
    due_date: string;
    estimated_hours: number;
    progress_percent: number;
    status: "todo" | "in_progress" | "blocked" | "done" | "cancelled";
    priority: "low" | "medium" | "high" | "critical";
    responsible_org: "maxicon" | "client" | "sap" | "third_party";
  }>;
  deliverables: Array<{
    title: string;
    acceptance_criteria: string;
    owner_name: string;
    due_date: string;
    actual_date?: string | null;
    status: "todo" | "in_progress" | "blocked" | "done" | "cancelled";
  }>;
  impediments: Array<{
    description: string;
    affected_activity: string;
    owner_name: string;
    responsible_org: "maxicon" | "client" | "sap" | "third_party";
    impact: string;
    opened_at: string;
    due_date: string;
    status: "todo" | "in_progress" | "blocked" | "done" | "cancelled";
    resolution?: string | null;
  }>;
  milestones: Array<{
    title: string;
    due_date: string;
    status: "pending" | "done" | "late";
  }>;
  actions: Array<{
    title: string;
    priority: "low" | "medium" | "high";
    due_date: string;
    status: "todo" | "in_progress" | "done";
  }>;
  risks: Array<{
    title: string;
    description?: string | null;
    severity: "medium" | "high" | "critical";
    status: "open" | "mitigating" | "closed";
  }>;
  time_entries: Array<{
    user_name: string;
    entry_date: string;
    hours: number;
    description: string;
    entry_type: TimeEntry["entry_type"];
  }>;
  warnings: string[];
};

type AiIntakePreview = {
  provider: string;
  draft: AiIntakeDraft;
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
    exceeded: number;
    outside_project: number;
    travel: number;
  };
  monitoring: Array<{ label: string; value: string; tone: string }>;
  hours_by_professional: Array<{ label: string; value: number }>;
  hours_by_month: Array<{ label: string; value: number }>;
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
    title: "Acompanhamento",
    description: "Visão executiva e comunicação",
    items: [
      { id: "overview", label: "Visão Geral", icon: "VG" },
      { id: "projects", label: "Projetos", icon: "PR" },
      { id: "closing", label: "Status Semanais", icon: "ST" },
      { id: "milestones", label: "Cronograma", icon: "CR" },
      { id: "deliverables", label: "Entregas", icon: "EN" },
      { id: "risks", label: "Riscos e Pendências", icon: "RP" },
      { id: "hours", label: "Horas e Orçamento", icon: "HO" },
    ],
  },
  {
    title: "Conhecimento",
    description: "Arquivos, relatórios e administração",
    items: [
      { id: "documents", label: "Documentos", icon: "DO" },
      { id: "reports", label: "Relatórios", icon: "RE" },
      { id: "settings", label: "Configurações", icon: "CO" },
    ],
  },
];

const sectionTitles: Record<Section, string> = {
  overview: "Visão Geral",
  closing: "Fechamento Semanal",
  documents: "Documentos",
  settings: "Configurações",
  ai: "Assistente de IA",
  reports: "Relatórios",
  actions: "Plano Executivo",
  requests: "Solicitações Semanais",
  projects: "Projetos",
  tasks: "Tarefas",
  deliverables: "Entregas",
  milestones: "Cronograma",
  risks: "Riscos e Pendências",
  impediments: "Impedimentos",
  hours: "Horas e Orçamento",
};
const today = new Date().toISOString().slice(0, 10);
const nextMonth = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);
const aiPromptExample = `Ciclo de status:
- Título: Status semanal - fechamento de julho.
- Data da reunião: 31/07/2026.
- Período apurado: 27/07/2026 a 31/07/2026.
- Progresso acumulado atual do projeto: 78%.
- Resumo: configuração fiscal concluída e integração bancária em homologação.

Solicitações da semana:
- Projeto: 2; CR: 1; GAP: 1; ajustes: 0.
- Abertas: 2; concluídas: 2; atrasadas: 1; críticas: 1.
- Aguardando Maxicon: 0; cliente: 1; SAP: 1.
- Destaque: número SR-1042, assunto credenciais bancárias, responsável Ana Souza,
  prazo 04/08/2026, status aguardando cliente, impacto alto no cronograma.

Tarefas:
- Concluir testes bancários. Responsável Carlos Almeida, início 27/07/2026,
  prazo 04/08/2026, estimativa 16h, progresso 60%, em andamento,
  prioridade alta, responsabilidade Maxicon.
- Validar cadastros fiscais. Responsável Jefferson Santos, início 27/07/2026,
  prazo 31/07/2026, estimativa 8h, progresso 100%, concluída,
  prioridade média, responsabilidade Maxicon.

Entregas:
- Configuração fiscal. Critério de aceite: cenários fiscais homologados pelo cliente.
  Responsável Jefferson Santos, prazo 31/07/2026, concluída em 31/07/2026.
- Integração bancária. Critério de aceite: arquivo de retorno validado sem erros.
  Responsável Carlos Almeida, prazo 07/08/2026, em andamento.

Marcos:
- Homologação fiscal, prazo 31/07/2026, concluído.
- Homologação bancária, prazo 07/08/2026, pendente.

Riscos:
- Credenciais bancárias ainda não recebidas. Severidade crítica, risco aberto.

Impedimentos:
- Credenciais bancárias pendentes afetam os testes da integração.
  Responsável Ana Souza, organização cliente, aberto em 29/07/2026,
  prazo 04/08/2026, impacto alto no go-live, status bloqueado.

Ações:
- Ana Souza deve enviar as credenciais até 04/08/2026, prioridade alta, pendente.
- Carlos Almeida deve concluir o roteiro de testes até 07/08/2026,
  prioridade alta, em andamento.

Horas aprovadas da semana:
- Jefferson Santos, 31/07/2026, 8h em configuração fiscal, tipo rentável.
- Carlos Almeida, 31/07/2026, 6h em testes bancários, tipo rentável.
- Ana Souza, 30/07/2026, 2h em reunião de alinhamento, tipo reunião.`;
const emptyManualClosingChecks: Record<ManualClosingKey, boolean> = {
  tasks: false,
  deliverables: false,
  hours: false,
  risks: false,
  actions: false,
  requests: false,
};

function friendlyAiError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Ocorreu um erro inesperado. Tente gerar novamente.";
  }

  const detail = error.message.toLowerCase();
  if (detail.includes("timeout") || detail.includes("timed out")) {
    return "A IA demorou mais que o esperado para responder. Aguarde alguns segundos e tente novamente.";
  }
  if (detail.includes("401") || detail.includes("403") || detail.includes("api key")) {
    return "A integração com a IA não está configurada corretamente. Peça ao administrador para verificar a chave do Gemini.";
  }
  if (detail.includes("500") || detail.includes("502") || detail.includes("503") || detail.includes("gemini")) {
    return "O serviço de IA está temporariamente indisponível. Suas anotações continuam salvas nesta tela; tente novamente em instantes.";
  }
  return "Não foi possível gerar o rascunho agora. Revise o texto e tente novamente.";
}

const labels: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  consultant: "Consultor",
  executive: "Executivo",
  client: "Cliente",
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
  ready: "Pronto",
  in_review: "Em revisao",
  presented: "Apresentado",
  archived: "Arquivado",
  maxicon: "Maxicon",
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [weeklyClosingStep, setWeeklyClosingStep] = useState(1);
  const [closingMode, setClosingMode] = useState<ClosingMode>(null);
  const [manualClosingChecks, setManualClosingChecks] =
    useState<Record<ManualClosingKey, boolean>>(emptyManualClosingChecks);
  const [closingReviewed, setClosingReviewed] = useState(false);
  const [aiAppliedForClosing, setAiAppliedForClosing] = useState(false);
  const [aiReturnToClosing, setAiReturnToClosing] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [dashboard, setDashboard] = useState<Dashboard>(emptyDashboard);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [reports, setReports] = useState<StatusReport[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [impediments, setImpediments] = useState<Impediment[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [statusCycles, setStatusCycles] = useState<StatusCycle[]>([]);
  const [selectedStatusCycleId, setSelectedStatusCycleId] = useState("");
  const [cycleTrend, setCycleTrend] = useState<Dashboard["portfolio_trend"]>([]);
  const [serviceRequestSummaries, setServiceRequestSummaries] = useState<ServiceRequestSummary[]>([]);
  const [weeklyStatus, setWeeklyStatus] = useState<WeeklyStatus | null>(emptyWeeklyStatus);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [draggingActionId, setDraggingActionId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiPreview, setAiPreview] = useState<AiIntakePreview | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGenerationError, setAiGenerationError] = useState("");
  const [aiGenerationMessage, setAiGenerationMessage] = useState("");

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const selectedStatusCycle = statusCycles.find((cycle) => cycle.id === selectedStatusCycleId);
  const overviewHealthLabel = weeklyStatus?.health_label ?? dashboard.health_label;
  const overviewHealthPercent = weeklyStatus?.health_percent ?? dashboard.health_percent;
  const closingReport = selectedStatusCycle
    ? reports.find(
        (report) =>
          report.period_start === selectedStatusCycle.period_start &&
          report.period_end === selectedStatusCycle.period_end,
      )
    : undefined;
  const manualChecklistComplete = Object.values(manualClosingChecks).every(Boolean);
  const closingDataReady =
    closingMode === "ai"
      ? aiAppliedForClosing
      : closingMode === "manual"
        ? manualChecklistComplete
        : false;
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
  const billablePercent = percentage(billableHours, totalHours);
  const portfolioProgress = projects.length
    ? Math.round(projects.reduce((total, project) => total + project.progress_percent, 0) / projects.length)
    : 0;
  const isCycleView = Boolean(weeklyStatus);
  const weeklyMonitoringNumber = (label: string) => {
    const value = weeklyStatus?.monitoring.find((item) => item.label === label)?.value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const cycleCriticalRisks = weeklyMonitoringNumber("Riscos criticos");
  const cycleLateTasks = weeklyMonitoringNumber("Tarefas atrasadas");
  const overviewTotalHours = isCycleView ? weeklyStatus?.hours.executed ?? 0 : totalHours;
  const overviewBillablePercent = isCycleView ? weeklyStatus?.hours.billable_rate ?? 0 : billablePercent;
  const overviewBillableHours = isCycleView
    ? (overviewTotalHours * overviewBillablePercent) / 100
    : billableHours;
  const overviewNonBillableHours = isCycleView
    ? weeklyStatus?.hours.outside_project ?? 0
    : nonBillableHours;
  const overviewOtherHours = Math.max(
    overviewTotalHours - overviewBillableHours - overviewNonBillableHours,
    0,
  );
  const overviewDashboard = useMemo<Dashboard>(() => {
    if (!weeklyStatus) return dashboard;

    const normalizedActionStatus = (status: string): ActionStatus =>
      status === "done" || status === "in_progress" ? status : "todo";

    return {
      ...dashboard,
      health_label: weeklyStatus.health_label,
      health_percent: weeklyStatus.health_percent,
      portfolio_trend: cycleTrend.length
        ? cycleTrend
        : [
            {
              label: formatDateBR(weeklyStatus.period_end),
              progress_percent: weeklyStatus.progress_real,
            },
          ],
      initiatives: [
        {
          project_id: weeklyStatus.project_id,
          name: weeklyStatus.project_name,
          client_name: weeklyStatus.client_name,
          progress_percent: weeklyStatus.progress_real,
          variation: weeklyStatus.progress_gap,
          status_label: weeklyStatus.health_label === "Estavel" ? "active" : "at_risk",
          milestones_done: weeklyStatus.milestones.filter((item) => item.status === "done").length,
          milestones_total: weeklyStatus.milestones.length,
          critical_risks: cycleCriticalRisks,
        },
      ],
      executive_summary: weeklyStatus.attention_points,
      actions: weeklyStatus.next_steps.map((item, index) => ({
        id: `${selectedStatusCycle?.id ?? "current"}-action-${index}`,
        project_id: weeklyStatus.project_id,
        title: item.title,
        priority: "medium",
        due_date: item.due_date ?? weeklyStatus.period_end,
        status: normalizedActionStatus(item.status),
      })),
    };
  }, [cycleCriticalRisks, cycleTrend, dashboard, selectedStatusCycle, weeklyStatus]);
  const { validationIssues, validationWarnings } = useMemo(() => {
    const issues: string[] = [];
    const warnings: string[] = [];
    const now = today;
    const staleTasks = tasks.filter(
      (task) => task.status !== "done" && task.status !== "cancelled" && task.due_date < now,
    );
    const completedWithoutEvidence = deliverables.filter(
      (deliverable) => deliverable.status === "done" && !deliverable.actual_date,
    );
    const hoursWithoutTask = timeEntries.filter((entry) => !entry.task_id);
    const openCriticalRisks = dashboard.risks.filter(
      (risk) =>
        risk.project_id === selectedProjectId &&
        risk.severity === "critical" &&
        risk.status !== "closed",
    );
    const ownerlessImpediments = impediments.filter((item) => !item.owner_name.trim());

    if (staleTasks.length) warnings.push(`${staleTasks.length} tarefa(s) com prazo vencido e sem conclusão.`);
    if (completedWithoutEvidence.length) issues.push(`${completedWithoutEvidence.length} entrega(s) concluída(s) sem data real.`);
    if (hoursWithoutTask.length) warnings.push(`${hoursWithoutTask.length} apontamento(s) de horas sem tarefa vinculada.`);
    if (openCriticalRisks.length) warnings.push(`${openCriticalRisks.length} risco(s) crítico(s) devem constar no relatório.`);
    if (ownerlessImpediments.length) issues.push(`${ownerlessImpediments.length} pendência(s) sem responsável.`);
    return { validationIssues: issues, validationWarnings: warnings };
  }, [dashboard.risks, deliverables, impediments, selectedProjectId, tasks, timeEntries]);

  const closingManualItems = [
    {
      id: "tasks",
      label: "Tarefas",
      description: "Atividades, responsáveis, prazos e andamento.",
      count: tasks.length,
      checked: manualClosingChecks.tasks,
      onToggle: () =>
        setManualClosingChecks((current) => ({ ...current, tasks: !current.tasks })),
      onAdd: () => setModalMode("task"),
    },
    {
      id: "deliverables",
      label: "Entregas",
      description: "Entregáveis do período e critérios de aceite.",
      count: deliverables.length,
      checked: manualClosingChecks.deliverables,
      onToggle: () =>
        setManualClosingChecks((current) => ({ ...current, deliverables: !current.deliverables })),
      onAdd: () => setModalMode("deliverable"),
    },
    {
      id: "hours",
      label: "Horas",
      description: "Apontamentos, profissionais e classificação das horas.",
      count: timeEntries.length,
      checked: manualClosingChecks.hours,
      onToggle: () =>
        setManualClosingChecks((current) => ({ ...current, hours: !current.hours })),
      onAdd: () => setModalMode("timeEntry"),
    },
    {
      id: "risks",
      label: "Riscos e pendências",
      description: "Riscos, criticidade, situação e plano de mitigação.",
      count: dashboard.risks.filter((risk) => risk.project_id === selectedProjectId).length,
      checked: manualClosingChecks.risks,
      onToggle: () =>
        setManualClosingChecks((current) => ({ ...current, risks: !current.risks })),
      onAdd: () => setModalMode("risk"),
    },
    {
      id: "actions",
      label: "Plano de ação",
      description: "Próximos passos, responsáveis e datas.",
      count: dashboard.actions.filter((action) => action.project_id === selectedProjectId).length,
      checked: manualClosingChecks.actions,
      onToggle: () =>
        setManualClosingChecks((current) => ({ ...current, actions: !current.actions })),
      onAdd: () => setModalMode("action"),
    },
    {
      id: "requests",
      label: "Solicitações",
      description: "Volumes, pendências e destaque da semana.",
      count: serviceRequestSummaries.length,
      checked: manualClosingChecks.requests,
      onToggle: () =>
        setManualClosingChecks((current) => ({ ...current, requests: !current.requests })),
      onAdd: () => setModalMode("serviceRequests"),
    },
  ];

  useEffect(() => {
    if (window.matchMedia("(max-width: 900px)").matches) {
      setSidebarCollapsed(true);
    }
  }, []);

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
  }, [selectedProjectId, selectedStatusCycleId, token]);

  useEffect(() => {
    setWeeklyClosingStep(1);
    setClosingMode(null);
    setManualClosingChecks(emptyManualClosingChecks);
    setClosingReviewed(false);
    setAiAppliedForClosing(false);
    setAiReturnToClosing(false);
  }, [selectedProjectId, selectedStatusCycleId]);

  async function loadProjectDetails(projectId: string, statusCycleId = selectedStatusCycleId) {
    try {
      const cycleData = await apiRequest<StatusCycle[]>(
        `/api/v1/operations/projects/${projectId}/status-cycles`,
      );
      const effectiveCycleId =
        statusCycleId === "current"
          ? "current"
          : cycleData.some((cycle) => cycle.id === statusCycleId)
            ? statusCycleId
            : cycleData[0]?.id ?? "current";
      setStatusCycles(cycleData);
      if (effectiveCycleId !== selectedStatusCycleId) {
        setSelectedStatusCycleId(effectiveCycleId);
      }
      const cycleQuery =
        effectiveCycleId !== "current" ? `?status_cycle_id=${effectiveCycleId}` : "";
      const [
        taskData,
        deliverableData,
        impedimentData,
        timeEntryData,
        reportData,
        weeklyData,
        requestSummaryData,
        trendData,
      ] =
        await Promise.all([
          apiRequest<Task[]>(`/api/v1/operations/projects/${projectId}/tasks`),
          apiRequest<Deliverable[]>(`/api/v1/operations/projects/${projectId}/deliverables`),
          apiRequest<Impediment[]>(`/api/v1/operations/projects/${projectId}/impediments`),
          apiRequest<TimeEntry[]>(`/api/v1/operations/projects/${projectId}/time-entries`),
          apiRequest<StatusReport[]>(`/api/v1/status-reports/project/${projectId}`),
          apiRequest<WeeklyStatus>(`/api/v1/dashboard/weekly-status/${projectId}${cycleQuery}`),
          apiRequest<ServiceRequestSummary[]>(
            `/api/v1/operations/projects/${projectId}/service-request-summaries`,
          ),
          apiRequest<Dashboard["portfolio_trend"]>(
            `/api/v1/dashboard/cycle-history/${projectId}${cycleQuery}`,
          ),
        ]);
      setTasks(taskData);
      setDeliverables(deliverableData);
      setImpediments(impedimentData);
      setTimeEntries(timeEntryData);
      setReports(reportData);
      setWeeklyStatus(weeklyData);
      setServiceRequestSummaries(requestSummaryData);
      setCycleTrend(trendData);
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
        cr_requests: Number(form.get("cr_requests") || 0),
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

  async function handleStatusCycleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    const form = new FormData(event.currentTarget);
    await submitAndReload(
      `/api/v1/operations/projects/${selectedProject.id}/status-cycles`,
      {
        title: String(form.get("title")),
        meeting_date: String(form.get("meeting_date")),
        period_start: String(form.get("period_start")),
        period_end: String(form.get("period_end")),
        status: String(form.get("status")),
        notes: String(form.get("notes") || "") || null,
      },
      "Ciclo de status criado e periodo aplicado ao dashboard.",
    );
  }

  async function rebuildSelectedCycleSnapshot() {
    if (!selectedProject || !selectedStatusCycle) return;
    const confirmed = window.confirm(
      "Esse ciclo já foi apresentado. A atualização vai incluir os lançamentos retroativos e preservar a versão anterior na auditoria. Deseja continuar?",
    );
    if (!confirmed) return;

    setError("");
    setMessage("");
    try {
      await apiRequest(
        `/api/v1/operations/projects/${selectedProject.id}/status-cycles/${selectedStatusCycle.id}/rebuild-snapshot`,
        { method: "POST" },
      );
      await loadProjectDetails(selectedProject.id, selectedStatusCycle.id);
      setMessage("Ciclo atualizado com os lançamentos retroativos. A versão anterior foi preservada na auditoria.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar os dados históricos do ciclo.");
    }
  }

  async function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await submitAndReload(
      "/api/v1/auth/users",
      {
        full_name: String(form.get("full_name")),
        email: String(form.get("email")),
        password: String(form.get("password")),
        role: String(form.get("role")),
      },
      "Usuário criado. Ele já pode acessar o portal com o e-mail e a senha cadastrados.",
    );
  }

  async function generateAiPreview() {
    const normalizedPrompt = aiPrompt.trim();
    setAiGenerationError("");
    setAiGenerationMessage("");

    if (!selectedProject) {
      setAiGenerationError("Selecione um projeto antes de gerar o rascunho.");
      return;
    }
    if (normalizedPrompt.length < 20) {
      setAiGenerationError("Informe pelo menos 20 caracteres sobre a reunião ou o período.");
      return;
    }

    setError("");
    setMessage("");
    setAiGenerating(true);
    setAiPreview(null);
    try {
      const preview = await apiRequest<AiIntakePreview>("/api/v1/ai/intake-preview", {
        method: "POST",
        body: JSON.stringify({
          project_id: selectedProject.id,
          prompt: normalizedPrompt,
        }),
      });
      setAiPreview(preview);
      setAiGenerationMessage(
        preview.provider === "mock"
          ? "Rascunho de demonstração gerado. O provedor Gemini não está ativo neste ambiente."
          : "Rascunho gerado com sucesso. Revise as informações antes de aplicar.",
      );
    } catch (err) {
      setAiGenerationError(friendlyAiError(err));
    } finally {
      setAiGenerating(false);
    }
  }

  async function applyAiPreview() {
    if (!selectedProject || !aiPreview) return;
    setError("");
    setMessage("");
    try {
      await apiRequest("/api/v1/ai/intake-apply", {
        method: "POST",
        body: JSON.stringify({
          project_id: selectedProject.id,
          draft: aiPreview.draft,
        }),
      });
      setMessage("Rascunho aplicado ao portal e dashboard atualizado.");
      setAiPreview(null);
      setAiPrompt("");
      await loadData();
      await loadProjectDetails(selectedProject.id);
      if (aiReturnToClosing) {
        setAiAppliedForClosing(true);
        setAiReturnToClosing(false);
        setWeeklyClosingStep(4);
        openSection("closing");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao aplicar rascunho de IA.");
    }
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
      if (
        authMode === "bootstrap" &&
        err instanceof Error &&
        err.message.includes("Bootstrap ja executado")
      ) {
        setAuthMode("login");
        setError("");
        setMessage(
          "O administrador inicial já existe. Entre como administrador e use Configurações > Novo usuário.",
        );
        return;
      }
      setError(err instanceof Error ? err.message : "Nao foi possivel autenticar.");
    }
  }

  function logout() {
    window.localStorage.removeItem("maxicon_portal_token");
    setToken("");
    setUser(null);
    setProjects([]);
    setReports([]);
    setStatusCycles([]);
    setSelectedStatusCycleId("");
  }

  async function generateReport() {
    if (!selectedProject) return;
    const periodStart = selectedStatusCycle?.period_start ?? today;
    const periodEnd = selectedStatusCycle?.period_end ?? today;
    await submitAndReload(
      "/api/v1/status-reports",
      {
        project_id: selectedProject.id,
        period_start: periodStart,
        period_end: periodEnd,
      },
      "Status report gerado com dados reais do periodo.",
    );
    setActiveSection("reports");
  }

  async function generateClosingReport() {
    if (!selectedProject || !selectedStatusCycle) {
      setError("Selecione um projeto e um ciclo antes de gerar o relatório.");
      return;
    }
    if (closingReport) {
      setWeeklyClosingStep(5);
      return;
    }

    setError("");
    setMessage("");
    try {
      await apiRequest<StatusReport>("/api/v1/status-reports", {
        method: "POST",
        body: JSON.stringify({
          project_id: selectedProject.id,
          period_start: selectedStatusCycle.period_start,
          period_end: selectedStatusCycle.period_end,
        }),
      });
      await loadProjectDetails(selectedProject.id);
      setClosingReviewed(false);
      setWeeklyClosingStep(5);
      setMessage("Rascunho do fechamento gerado e pronto para revisão.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar o rascunho do fechamento.");
    }
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
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao aprovar report.");
      return false;
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
    <div className={sidebarCollapsed ? "app-shell sidebar-is-collapsed" : "app-shell"}>
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
                  aria-current={activeSection === item.id ? "page" : undefined}
                  title={sidebarCollapsed ? item.label : undefined}
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
          <button
            aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            className="collapse-btn"
            onClick={() => setSidebarCollapsed((current) => !current)}
            type="button"
          >
            {sidebarCollapsed ? "›" : "‹ Recolher menu"}
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-btn"
              onClick={() => setSidebarCollapsed((current) => !current)}
              type="button"
              aria-label="Alternar menu"
            >
              ☰
            </button>
            <h1>{sectionTitles[activeSection]}</h1>
          </div>

          <div className="topbar-actions">
            <label className="project-select">
              <span>Projeto</span>
              <select
                aria-label="Projeto selecionado"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
              >
                {!projects.length && <option value="">Nenhum projeto</option>}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="period-select">
              <span>Ciclo de status</span>
              <select
                value={selectedStatusCycleId || "current"}
                onChange={(event) => setSelectedStatusCycleId(event.target.value)}
              >
                <option value="current">Semana atual</option>
                {statusCycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.title} - {formatPeriodBR(cycle.period_start, cycle.period_end)} - {labelFor(cycle.status)}
                  </option>
                ))}
              </select>
            </label>
            <button className="secondary-btn" onClick={() => setModalMode("statusCycle")} type="button">
              + Ciclo
            </button>
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

        {error && <ErrorState message={error} retry={loadData} />}
        {message && <div className="notice success">{message}</div>}
        {loading && <LoadingState />}

        {activeSection === "overview" && (
          <section className="content-section active overview-dashboard">
            <section className="overview-hero">
              <div className="overview-hero-copy">
                <span className="eyebrow">Painel executivo</span>
                <h2>Visão clara do portfólio, logo de entrada</h2>
                <p>
                  Acompanhe desempenho, esforço e pontos de atenção sem precisar percorrer
                  relatórios extensos.
                </p>
                <div className="overview-context">
                  <span>Projeto em foco</span>
                  <strong>{selectedProject?.name ?? "Nenhum projeto selecionado"}</strong>
                  <small>
                    {selectedStatusCycle
                      ? formatPeriodBR(selectedStatusCycle.period_start, selectedStatusCycle.period_end)
                      : "Semana atual"}
                  </small>
                </div>
              </div>
              <div
                className={`overview-health ${
                  overviewHealthLabel.toLowerCase().includes("cr")
                    ? "critical"
                    : overviewHealthLabel.toLowerCase().includes("aten")
                      ? "warning"
                      : "positive"
                }`}
                style={{ "--health-value": `${Math.max(0, Math.min(overviewHealthPercent, 100))}%` } as CSSProperties}
              >
                <div className="overview-health-ring">
                  <div>
                    <strong>{overviewHealthPercent}%</strong>
                    <span>saúde geral</span>
                  </div>
                </div>
                <div>
                  <span>{selectedStatusCycle ? "Status do ciclo" : "Status do portfólio"}</span>
                  <strong>{overviewHealthLabel}</strong>
                  <small>
                    {selectedStatusCycle
                      ? `Referência: ${formatDateBR(selectedStatusCycle.period_end)}`
                      : `Atualizado em ${new Date().toLocaleDateString("pt-BR")}`}
                  </small>
                </div>
              </div>
            </section>

            {selectedStatusCycle && weeklyStatus && (
              <div className="notice cycle-history-notice">
                <span>
                  Exibindo os dados {selectedStatusCycle.status === "presented" ? "preservados " : ""}
                  do ciclo {selectedStatusCycle.title} ({labelFor(selectedStatusCycle.status)}), com reunião em{" "}
                  {formatDateBR(selectedStatusCycle.meeting_date)}.
                </span>
                {user?.role === "admin" &&
                  ["presented", "approved", "archived"].includes(selectedStatusCycle.status) && (
                    <button className="secondary-btn" onClick={() => void rebuildSelectedCycleSnapshot()} type="button">
                      Incluir lançamentos retroativos
                    </button>
                  )}
              </div>
            )}
            <section className="overview-kpi-grid" aria-label="Indicadores principais da carteira">
              <KpiCard
                label={isCycleView ? "Avanço do projeto" : "Projetos ativos"}
                value={
                  isCycleView
                    ? `${Math.round(weeklyStatus?.progress_real ?? 0)}%`
                    : String(projects.filter((project) => project.status !== "completed").length)
                }
                comparison={
                  isCycleView
                    ? `Esperado: ${Math.round(weeklyStatus?.progress_expected ?? 0)}%`
                    : `${projects.filter((project) => project.status === "at_risk").length} precisam de atenção`
                }
                help={isCycleView ? "Avanço preservado na apresentação do ciclo." : "Projetos que ainda não foram concluídos."}
                tone="info"
              />
              <KpiCard
                label={isCycleView ? "Desvio do cronograma" : "Progresso médio"}
                value={isCycleView ? `${weeklyStatus?.progress_gap ?? 0} p.p.` : `${portfolioProgress}%`}
                comparison={isCycleView ? `${cycleLateTasks} tarefa(s) atrasada(s)` : "Avanço consolidado da carteira"}
                help={isCycleView ? "Diferença entre o avanço realizado e o esperado no ciclo." : "Média do progresso informado em todos os projetos."}
                tone={(weeklyStatus?.progress_gap ?? 0) < 0 ? "critical" : "positive"}
              />
              <KpiCard
                label="Riscos críticos"
                value={String(
                  isCycleView
                    ? cycleCriticalRisks
                    : dashboard.risks.filter((risk) => risk.severity === "critical" && risk.status !== "closed").length,
                )}
                comparison={isCycleView ? "Registrados naquela semana" : "Ainda exigem tratamento"}
                help={isCycleView ? "Total consolidado no snapshot do ciclo." : "Riscos críticos que permanecem abertos."}
                tone="critical"
              />
              <KpiCard
                label="Horas rentáveis"
                value={`${overviewBillablePercent}%`}
                comparison={`${Math.round(overviewBillableHours)}h de ${Math.round(overviewTotalHours)}h apontadas`}
                help={isCycleView ? "Horas preservadas no ciclo selecionado." : "Percentual das horas apontadas classificadas como rentáveis."}
                tone="info"
              />
            </section>

            <section className="overview-chart-grid">
              <article className="panel overview-chart-card">
                <div className="panel-header">
                  <div>
                    <span className="eyebrow">Desempenho</span>
                    <h3>{isCycleView ? "Evolução do projeto" : "Evolução do portfólio"}</h3>
                  </div>
                  <span className="chart-meta">
                    {isCycleView ? formatPeriodBR(weeklyStatus?.period_start, weeklyStatus?.period_end) : `Últimos ${overviewDashboard.portfolio_trend.length || 6} períodos`}
                  </span>
                </div>
                <PortfolioChart points={overviewDashboard.portfolio_trend} />
              </article>

              <article className="panel overview-allocation-card">
                <div className="panel-header">
                  <div>
                    <span className="eyebrow">Eficiência</span>
                    <h3>Distribuição de horas</h3>
                  </div>
                  <span className="chart-meta">{Math.round(overviewTotalHours)}h no total</span>
                </div>
                <div className="overview-donut-layout">
                  <div
                    className="overview-donut"
                    style={{
                      background: `conic-gradient(var(--blue-700) 0 ${overviewBillablePercent}%, #4bb4df ${overviewBillablePercent}% ${Math.min(overviewBillablePercent + percentage(overviewNonBillableHours, overviewTotalHours), 100)}%, #dce4ec ${Math.min(overviewBillablePercent + percentage(overviewNonBillableHours, overviewTotalHours), 100)}% 100%)`,
                    }}
                  >
                    <div><strong>{overviewBillablePercent}%</strong><span>rentáveis</span></div>
                  </div>
                  <div className="overview-legend">
                    <div><span className="legend-swatch billable" /><p>Rentáveis <strong>{Math.round(overviewBillableHours)}h</strong></p></div>
                    <div><span className="legend-swatch non-billable" /><p>Não rentáveis <strong>{Math.round(overviewNonBillableHours)}h</strong></p></div>
                    <div><span className="legend-swatch other" /><p>Outras <strong>{Math.round(overviewOtherHours)}h</strong></p></div>
                  </div>
                </div>
              </article>
            </section>

            {weeklyStatus && (
              <section className="overview-project-pulse" aria-label="Resumo do projeto selecionado">
                <div>
                  <span>Projeto selecionado</span>
                  <strong>{weeklyStatus.project_name}</strong>
                  <small>{weeklyStatus.health_label}</small>
                </div>
                <div><span>Avanço real</span><strong>{Math.round(weeklyStatus.progress_real)}%</strong><small>Esperado: {Math.round(weeklyStatus.progress_expected)}%</small></div>
                <div><span>Go-live</span><strong>{formatDateBR(weeklyStatus.go_live_date)}</strong><small>{weeklyStatus.days_to_go_live} dias restantes</small></div>
                <div><span>Saldo de horas</span><strong>{Math.round(weeklyStatus.hours.balance)}h</strong><small>{weeklyStatus.hours.billable_rate}% rentáveis</small></div>
              </section>
            )}

            <section className="overview-insight-grid">
              <article className="panel overview-summary-card">
                <div className="panel-header">
                  <div>
                    <span className="eyebrow">Leitura rápida</span>
                    <h3>Resumo executivo</h3>
                  </div>
                  <button className="text-link" onClick={() => openSection("ai")} type="button">
                    Atualizar com IA
                  </button>
                </div>
                <div className="overview-summary-list">
                  {overviewDashboard.executive_summary.length ? (
                    overviewDashboard.executive_summary.slice(0, 4).map((summary, index) => (
                      <div key={summary}>
                        <span>{index + 1}</span>
                        <p>{summary}</p>
                      </div>
                    ))
                  ) : (
                    <p className="empty-text">O resumo aparecerá quando houver dados consolidados.</p>
                  )}
                </div>
              </article>
              <ActionPanel actions={overviewDashboard.actions} openActions={() => openSection("actions")} />
            </section>

            <StatusTable dashboard={overviewDashboard} openProjects={() => openSection("projects")} />
          </section>
        )}

        {activeSection === "closing" && (
          <section className="content-section active">
            <div className="page-intro">
              <div>
                <span className="eyebrow">Fechamento semanal</span>
                <h2>Da coleta à publicação, com revisão humana</h2>
                <p>Um fluxo único para reduzir inconsistências e preservar a rastreabilidade do status enviado ao cliente.</p>
              </div>
            </div>
            <WeeklyClosingWizard
              step={weeklyClosingStep}
              setStep={setWeeklyClosingStep}
              projectName={selectedProject?.name ?? ""}
              period={selectedStatusCycle ? formatPeriodBR(selectedStatusCycle.period_start, selectedStatusCycle.period_end) : "Semana atual sem ciclo cadastrado"}
              hasCycle={Boolean(selectedProject && selectedStatusCycle)}
              mode={closingMode}
              setMode={(mode) => {
                setClosingMode(mode);
                setClosingReviewed(false);
                if (mode === "ai") setAiAppliedForClosing(false);
              }}
              manualItems={closingManualItems}
              aiReady={aiAppliedForClosing}
              dataReady={closingDataReady}
              validationIssues={validationIssues}
              validationWarnings={validationWarnings}
              report={closingReport}
              reviewed={closingReviewed}
              published={closingReport?.status === "approved" || closingReport?.status === "presented"}
              setReviewed={setClosingReviewed}
              onCreateCycle={() => setModalMode("statusCycle")}
              onOpenAi={() => {
                setAiReturnToClosing(true);
                openSection("ai");
              }}
              onGenerateReport={() => void generateClosingReport()}
              onOpenReport={() => openSection("reports")}
              onPublish={() => {
                if (closingReport && closingReviewed) void approveReport(closingReport.id);
              }}
            />
            <StatusHistory reports={reports} />
          </section>
        )}

        {activeSection === "documents" && (
          <section className="content-section active">
            <div className="page-intro">
              <div>
                <span className="eyebrow">Documentos</span>
                <h2>Arquivos, versões e evidências do projeto</h2>
                <p>A estrutura está pronta para a integração documental, com categorias adequadas à rotina de projetos.</p>
              </div>
            </div>
            <DocumentCenter />
          </section>
        )}

        {activeSection === "ai" && (
          <section className="content-section active">
            <div className="ai-page-heading">
              <div>
                <span className="eyebrow">Assistente de IA</span>
                <h2>Transforme suas anotações em dados do portal</h2>
                <p>
                  Cole o resumo da semana. A IA organiza riscos, ações, horas e solicitações
                  para você revisar antes de atualizar o projeto.
                </p>
              </div>
            </div>

            <ol aria-label="Como usar o assistente de IA" className="ai-steps">
              <li className="active">
                <span>1</span>
                <div><strong>Cole as informações</strong><small>Use reunião, e-mail ou anotações.</small></div>
              </li>
              <li className={aiPreview ? "active" : ""}>
                <span>2</span>
                <div><strong>Revise o rascunho</strong><small>Confira o que a IA identificou.</small></div>
              </li>
              <li>
                <span>3</span>
                <div><strong>Atualize o portal</strong><small>Só acontece após sua confirmação.</small></div>
              </li>
            </ol>

            <article className="panel ai-intake-panel">
              <div className="ai-intake-header">
                <div>
                  <span className="ai-step-label">Etapa 1</span>
                  <h3>Cole as informações da semana</h3>
                  <p>Não precisa organizar. Quanto mais datas, responsáveis e números você incluir, melhor será o rascunho.</p>
                </div>
                <span className="ai-project-context">
                  Projeto: <strong>{selectedProject?.name ?? "não selecionado"}</strong>
                </span>
              </div>

              <div className="ai-input-toolbar">
                <span>Inclua, se tiver: avanços, riscos, ações, horas e solicitações.</span>
                <div>
                  <button
                    className="text-btn"
                    disabled={aiGenerating}
                    onClick={() => {
                      setAiPrompt(aiPromptExample);
                      setAiGenerationError("");
                      setAiGenerationMessage("");
                    }}
                    type="button"
                  >
                    Inserir exemplo
                  </button>
                  {!!aiPrompt && (
                    <button
                      className="text-btn muted"
                      disabled={aiGenerating}
                      onClick={() => {
                        setAiPrompt("");
                        setAiPreview(null);
                        setAiGenerationError("");
                        setAiGenerationMessage("");
                      }}
                      type="button"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <label className="full ai-prompt-field">
                <span className="sr-only">Texto da reunião, e-mail ou anotação</span>
                <textarea
                  aria-describedby="ai-prompt-help"
                  disabled={aiGenerating}
                  onChange={(event) => {
                    setAiPrompt(event.target.value);
                    if (aiGenerationError) setAiGenerationError("");
                    if (aiGenerationMessage) setAiGenerationMessage("");
                  }}
                  placeholder="Exemplo: Na reunião de 24/07, concluímos a configuração fiscal. A integração bancária está atrasada por falta das credenciais..."
                  rows={9}
                  value={aiPrompt}
                />
              </label>

              <div className="ai-submit-row">
                <p className="ai-prompt-help" id="ai-prompt-help">
                  {aiPrompt.trim().length < 20
                    ? `Digite pelo menos mais ${20 - aiPrompt.trim().length} caracteres.`
                    : "Texto pronto para análise."}
                </p>
                <button
                  className="primary-btn ai-generate-btn"
                  disabled={aiGenerating || aiPrompt.trim().length < 20 || !selectedProject}
                  onClick={generateAiPreview}
                  type="button"
                >
                  {aiGenerating && <span aria-hidden="true" className="button-spinner" />}
                  {aiGenerating ? "Analisando informações..." : "Gerar rascunho com IA"}
                </button>
              </div>

              {aiGenerating && (
                <div aria-live="polite" className="ai-generation-feedback loading" role="status">
                  <span className="generation-spinner" aria-hidden="true" />
                  <div>
                    <strong>A IA está organizando suas informações.</strong>
                    <span>Você pode aguardar nesta tela. Normalmente isso leva até 45 segundos.</span>
                  </div>
                </div>
              )}
              {!aiGenerating && aiGenerationError && (
                <div className="ai-generation-feedback error" role="alert">
                  <div>
                    <strong>O rascunho não foi gerado.</strong>
                    <span>{aiGenerationError}</span>
                  </div>
                  <button className="secondary-btn" onClick={generateAiPreview} type="button">
                    Tentar novamente
                  </button>
                </div>
              )}
              {!aiGenerating && aiGenerationMessage && (
                <div aria-live="polite" className="ai-generation-feedback success" role="status">
                  <div>
                    <strong>Rascunho pronto para revisão.</strong>
                    <span>{aiGenerationMessage}</span>
                  </div>
                </div>
              )}
            </article>
            {aiPreview && (
              <AiPreviewPanel
                applyAiPreview={applyAiPreview}
                preview={aiPreview}
              />
            )}
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
            <ServiceRequestSummaryPanel
              selectedStatusCycle={selectedStatusCycle}
              summaries={serviceRequestSummaries}
            />
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
            {selectedProject && (
              <>
                <ProjectHeader
                  project={selectedProject}
                  period={weeklyStatus ? formatPeriodBR(weeklyStatus.period_start, weeklyStatus.period_end) : "Semana atual"}
                  health={weeklyStatus?.health_label ?? labelFor(selectedProject.status)}
                  onUpdate={() => loadProjectDetails(selectedProject.id)}
                  onCloseWeek={() => openSection("closing")}
                  onGenerateStatus={() => openSection("closing")}
                  onDocuments={() => openSection("documents")}
                />
                <ExecutiveSummary
                  content={dashboard.executive_summary}
                  generatedAt={new Date().toLocaleDateString("pt-BR")}
                  reviewer={user?.full_name ?? "Aguardando responsável"}
                  reviewStatus={reports[0]?.status === "approved" ? "Aprovado" : "Revisão necessária"}
                  onRegenerate={() => openSection("ai")}
                  onEdit={() => openSection("closing")}
                  onApprove={() => openSection("reports")}
                />
                <section className="executive-kpi-grid" aria-label="Indicadores principais do projeto">
                  <KpiCard label="Avanço geral" value={`${selectedProject.progress_percent}%`} comparison="Realizado acumulado" help="Percentual físico informado no cadastro do projeto." tone="info" />
                  <KpiCard label="Planejado até hoje" value={`${weeklyStatus?.progress_expected ?? 0}%`} comparison="Curva de referência" help="Progresso linear esperado entre início e conclusão." />
                  <KpiCard label="Desvio do cronograma" value={`${weeklyStatus?.progress_gap ?? 0} p.p.`} comparison={(weeklyStatus?.progress_gap ?? 0) >= 0 ? "Dentro ou acima do plano" : "Abaixo do planejado"} help="Diferença entre realizado e planejado." tone={(weeklyStatus?.progress_gap ?? 0) < 0 ? "warning" : "positive"} />
                  <KpiCard label="Entregas concluídas" value={String(deliverables.filter((item) => item.status === "done").length)} comparison={`${deliverables.length} entrega(s) no total`} help="Entregas concluídas no projeto." tone="positive" />
                  <KpiCard label="Riscos críticos" value={String(dashboard.risks.filter((risk) => risk.project_id === selectedProject.id && risk.severity === "critical" && risk.status !== "closed").length)} comparison="Abertos no momento" help="Riscos críticos ainda não encerrados." tone="critical" />
                  <KpiCard label="Consumo de horas" value={`${percentage(selectedProject.actual_hours, selectedProject.contracted_hours)}%`} comparison={`${selectedProject.actual_hours}h de ${selectedProject.contracted_hours}h`} help="Consumo contratual; não representa automaticamente avanço entregue." tone="info" />
                </section>
                <ProgressComparisonChart
                  actual={selectedProject.progress_percent}
                  planned={weeklyStatus?.progress_expected ?? 0}
                  points={dashboard.portfolio_trend}
                />
                <WeeklyAchievements
                  completed={tasks.filter((task) => task.status === "done")}
                  inProgress={tasks.filter((task) => task.status === "in_progress")}
                  next={weeklyStatus?.next_steps ?? tasks.filter((task) => task.status === "todo")}
                />
                <PendingDecisionsTable items={impediments} />
                <RisksTable risks={dashboard.risks.filter((risk) => risk.project_id === selectedProject.id)} />
                <HoursSummary
                  contracted={selectedProject.contracted_hours}
                  consumed={selectedProject.actual_hours}
                  billable={selectedProject.billable_hours}
                  nonBillable={selectedProject.non_billable_hours}
                />
                <div className="operational-shortcuts">
                  <button onClick={() => openSection("tasks")} type="button">Ver tarefas</button>
                  <button onClick={() => openSection("actions")} type="button">Ver plano executivo</button>
                  <button onClick={() => openSection("requests")} type="button">Ver solicitações</button>
                  <button onClick={() => openSection("impediments")} type="button">Ver impedimentos</button>
                </div>
              </>
            )}
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
              <div className="heading-actions">
                <button className="secondary-btn" onClick={() => setModalMode("impediment")} type="button">
                  + Nova pendência
                </button>
                <button className="primary-btn" onClick={() => setModalMode("risk")} type="button">
                  + Novo risco
                </button>
              </div>
            </div>
            <PendingDecisionsTable items={impediments} />
            <RisksTable risks={dashboard.risks.filter((risk) => !selectedProjectId || risk.project_id === selectedProjectId)} />
            <div className="risk-grid legacy-risk-grid">
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
            {selectedProject && (
              <HoursSummary
                contracted={selectedProject.contracted_hours}
                consumed={selectedProject.actual_hours}
                billable={selectedProject.billable_hours}
                nonBillable={selectedProject.non_billable_hours}
              />
            )}
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
            <StatusHistory reports={reports} />
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

        {activeSection === "settings" && (
          <section className="content-section active">
            <div className="page-intro">
              <div>
                <span className="eyebrow">Configurações</span>
                <h2>Administração e áreas operacionais</h2>
                <p>Funções menos frequentes ficam agrupadas aqui sem retirar acesso aos fluxos existentes.</p>
              </div>
            </div>
            <section className="settings-grid">
              <article className="surface">
                <h3>Perfil e acesso</h3>
                <dl className="settings-list">
                  <div><dt>Usuário</dt><dd>{user?.full_name}</dd></div>
                  <div><dt>E-mail</dt><dd>{user?.email}</dd></div>
                  <div><dt>Perfil</dt><dd>{labelFor(user?.role)}</dd></div>
                </dl>
                <p className="context-note">O backend preserva os perfis atuais. A separação completa de conteúdo do cliente depende de políticas adicionais de visibilidade.</p>
              </article>
              <article className="surface">
                <h3>Áreas operacionais</h3>
                <div className="settings-actions">
                  <button onClick={() => openSection("tasks")} type="button">Tarefas</button>
                  <button onClick={() => openSection("actions")} type="button">Plano executivo</button>
                  <button onClick={() => openSection("requests")} type="button">Solicitações semanais</button>
                  <button onClick={() => openSection("impediments")} type="button">Impedimentos</button>
                  <button onClick={() => openSection("ai")} type="button">Preenchimento por IA</button>
                </div>
              </article>
              {user?.role === "admin" && (
                <article className="surface">
                  <h3>Usuários e acessos</h3>
                  <p className="context-note">
                    Crie contas individuais e escolha o perfil de acesso de cada pessoa.
                  </p>
                  <div className="settings-actions">
                    <button onClick={() => setModalMode("user")} type="button">
                      + Novo usuário
                    </button>
                  </div>
                </article>
              )}
            </section>
          </section>
        )}
      </main>

      {modalMode && (
        <DataModal
          mode={modalMode}
          projects={projects}
          selectedProjectId={selectedProject?.id ?? ""}
          selectedStatusCycle={selectedStatusCycle}
          setSelectedProjectId={setSelectedProjectId}
          close={() => setModalMode(null)}
          onUserSubmit={handleUserSubmit}
          onProjectSubmit={handleProjectSubmit}
          onMilestoneSubmit={handleMilestoneSubmit}
          onRiskSubmit={handleRiskSubmit}
          onActionSubmit={handleActionSubmit}
          onTaskSubmit={handleTaskSubmit}
          onDeliverableSubmit={handleDeliverableSubmit}
          onImpedimentSubmit={handleImpedimentSubmit}
          onTimeEntrySubmit={handleTimeEntrySubmit}
          onServiceRequestSummarySubmit={handleServiceRequestSummarySubmit}
          onStatusCycleSubmit={handleStatusCycleSubmit}
          tasks={tasks}
        />
      )}
    </div>
  );
}

function PortfolioChart({ points }: { points: Dashboard["portfolio_trend"] }) {
  const safePoints = points.length ? points : emptyDashboard.portfolio_trend;
  const chartPoints = safePoints.map((point, index) => ({
    ...point,
    x: 22 + (index / Math.max(safePoints.length - 1, 1)) * 656,
    y: 210 - (Math.min(Math.max(point.progress_percent, 0), 100) / 100) * 180,
  }));
  const coordinates = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `M${coordinates.replaceAll(" ", " L")} L678 210 L22 210 Z`;

  return (
    <div
      aria-label={`Evolução do portfólio: ${safePoints.map((point) => `${point.label}, ${Math.round(point.progress_percent)}%`).join("; ")}`}
      className="portfolio-chart"
      role="img"
    >
      <div className="portfolio-chart-y" aria-hidden="true">
        <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
      </div>
      <div className="portfolio-chart-main">
        <div className="portfolio-chart-goal"><span>Meta 75%</span></div>
        <svg viewBox="0 0 700 230" preserveAspectRatio="none">
          <defs>
            <linearGradient id="portfolioAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0871c2" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#0871c2" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path className="portfolio-area" d={area} />
          <polyline className="portfolio-line" points={coordinates} />
          {chartPoints.map((point) => (
            <circle className="portfolio-point" cx={point.x} cy={point.y} key={point.label} r="5" />
          ))}
        </svg>
        <div
          className="portfolio-chart-labels"
          style={{ gridTemplateColumns: `repeat(${safePoints.length}, minmax(0, 1fr))` }}
        >
          {safePoints.map((point) => (
            <span key={point.label}><strong>{Math.round(point.progress_percent)}%</strong><small>{point.label}</small></span>
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
          <div><span>Excedentes</span><strong>{Math.round(status.hours.exceeded)}h</strong></div>
          <div><span>Fora do projeto</span><strong>{Math.round(status.hours.outside_project)}h</strong></div>
          <div><span>Deslocamento</span><strong>{Math.round(status.hours.travel)}h</strong></div>
        </div>
      </article>

      <article className="panel weekly-list">
        <div className="panel-header">
          <h3>Horas por profissional</h3>
        </div>
        <WeeklyBreakdown
          items={status.hours_by_professional}
          empty="Sem horas aprovadas no periodo."
        />
      </article>

      <article className="panel weekly-list">
        <div className="panel-header">
          <h3>Consumo mensal</h3>
        </div>
        <WeeklyBreakdown items={status.hours_by_month} empty="Sem historico de horas." />
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

function WeeklyBreakdown({
  empty,
  items,
}: {
  empty: string;
  items: Array<{ label: string; value: number }>;
}) {
  if (!items.length) {
    return <p className="empty-text">{empty}</p>;
  }
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="weekly-bars">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{Math.round(item.value)}h</strong>
          <i style={{ width: `${Math.max((item.value / maxValue) * 100, 6)}%` }} />
        </div>
      ))}
    </div>
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
          {dashboard.initiatives.slice(0, 6).map((initiative) => (
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
          {!dashboard.initiatives.length && (
            <tr>
              <td colSpan={6}>Nenhuma iniciativa disponível para este período.</td>
            </tr>
          )}
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
        {actions.slice(0, 5).map((action) => (
          <label key={action.id}>
            <input checked={action.status === "done"} readOnly type="checkbox" />
            <span>{action.title}</span>
            <b className={`priority ${action.priority}`}>{labelFor(action.priority)}</b>
            <em>{formatDateBR(action.due_date).slice(0, 5)}</em>
          </label>
        ))}
        {!actions.length && <p className="empty-text">Nenhuma ação pendente no momento.</p>}
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

function AiPreviewPanel({
  applyAiPreview,
  preview,
}: {
  applyAiPreview: () => void;
  preview: AiIntakePreview;
}) {
  const draft = preview.draft;
  const totalRequests =
    draft.service_requests.project_requests +
    draft.service_requests.cr_requests +
    draft.service_requests.gap_requests +
    draft.service_requests.adjustment_requests;
  return (
    <section className="ai-review-section">
      <div className="ai-review-heading">
        <div>
          <span className="ai-step-label">Etapa 2</span>
          <h3>Revise o rascunho antes de atualizar o portal</h3>
          <p>A IA não salvou nada ainda. Confira os dados abaixo e confirme somente se estiverem corretos.</p>
        </div>
        <span className="ai-provider-label">
          {preview.provider === "mock" ? "Modo demonstração" : "Gerado com Gemini"}
        </span>
      </div>

      <div className="ai-preview-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Resumo identificado</span>
              <h3>{draft.status_cycle.title}</h3>
            </div>
            <span className="status-pill yellow">{Math.round(draft.confidence * 100)}% de confiança</span>
          </div>
          <p>{draft.summary}</p>
          <div className="request-number-grid">
            <div><span>Reunião</span><strong>{formatDateBR(draft.status_cycle.meeting_date)}</strong></div>
            <div><span>Período</span><strong>{formatPeriodBR(draft.status_cycle.period_start, draft.status_cycle.period_end)}</strong></div>
            <div><span>Progresso</span><strong>{draft.progress_percent ?? "Não informado"}{draft.progress_percent != null ? "%" : ""}</strong></div>
            <div><span>Solicitações</span><strong>{totalRequests}</strong></div>
            <div><span>Horas</span><strong>{Math.round(draft.time_entries.reduce((sum, item) => sum + item.hours, 0))}h</strong></div>
            <div><span>Registros</span><strong>{draft.tasks.length + draft.deliverables.length + draft.impediments.length + draft.milestones.length}</strong></div>
          </div>
          {!!draft.warnings.length && (
            <div className="ai-warning-list">
              {draft.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}
          <button className="primary-btn ai-apply-btn" onClick={applyAiPreview} type="button">
            Confirmar e atualizar o portal
          </button>
          <small className="ai-apply-help">Esta ação grava os dados deste rascunho no projeto selecionado.</small>
        </article>

        <article className="panel weekly-list">
          <div className="panel-header"><h3>Ações detectadas</h3></div>
          <WeeklyItems
            empty="Nenhuma ação detectada."
            items={draft.actions.map((action) => ({
              title: action.title,
              status: action.status,
              due_date: action.due_date,
            }))}
          />
        </article>

        <article className="panel weekly-list">
          <div className="panel-header"><h3>Riscos detectados</h3></div>
          <WeeklyItems
            empty="Nenhum risco detectado."
            items={draft.risks.map((risk) => ({
              title: risk.title,
              status: risk.severity,
            }))}
          />
        </article>

        <article className="panel weekly-list">
          <div className="panel-header"><h3>Tarefas e entregas detectadas</h3></div>
          <WeeklyItems
            empty="Nenhuma tarefa ou entrega detectada."
            items={[
              ...draft.tasks.map((task) => ({
                title: task.title,
                status: task.status,
                owner: task.owner_name,
                due_date: task.due_date,
                progress_percent: task.progress_percent,
              })),
              ...draft.deliverables.map((deliverable) => ({
                title: deliverable.title,
                status: deliverable.status,
                owner: deliverable.owner_name,
                due_date: deliverable.due_date,
              })),
            ]}
          />
        </article>

        <article className="panel weekly-list">
          <div className="panel-header"><h3>Marcos e impedimentos detectados</h3></div>
          <WeeklyItems
            empty="Nenhum marco ou impedimento detectado."
            items={[
              ...draft.milestones.map((milestone) => ({
                title: milestone.title,
                status: milestone.status,
                due_date: milestone.due_date,
              })),
              ...draft.impediments.map((impediment) => ({
                title: impediment.description,
                status: impediment.status,
                owner: impediment.owner_name,
                due_date: impediment.due_date,
              })),
            ]}
          />
        </article>
      </div>
    </section>
  );
}

function ServiceRequestSummaryPanel({
  selectedStatusCycle,
  summaries,
}: {
  selectedStatusCycle?: StatusCycle;
  summaries: ServiceRequestSummary[];
}) {
  const latest =
    (selectedStatusCycle
      ? summaries.find(
          (summary) =>
            summary.period_start === selectedStatusCycle.period_start &&
            summary.period_end === selectedStatusCycle.period_end,
        )
      : undefined) ?? summaries[0];
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
    ["CRs", latest.cr_requests],
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
              <th>CRs</th>
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
                <td>{summary.cr_requests}</td>
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
  selectedStatusCycle,
  setSelectedProjectId,
  close,
  onUserSubmit,
  onProjectSubmit,
  onMilestoneSubmit,
  onRiskSubmit,
  onActionSubmit,
  onTaskSubmit,
  onDeliverableSubmit,
  onImpedimentSubmit,
  onTimeEntrySubmit,
  onServiceRequestSummarySubmit,
  onStatusCycleSubmit,
}: {
  mode: ModalMode;
  projects: Project[];
  tasks: Task[];
  selectedProjectId: string;
  selectedStatusCycle?: StatusCycle;
  setSelectedProjectId: (projectId: string) => void;
  close: () => void;
  onUserSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onProjectSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMilestoneSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRiskSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onActionSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTaskSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDeliverableSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onImpedimentSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTimeEntrySubmit: (event: FormEvent<HTMLFormElement>) => void;
  onServiceRequestSummarySubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStatusCycleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [close]);

  const title =
    mode === "user"
      ? "Novo usuário"
      : mode === "project"
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
                      : mode === "serviceRequests"
                        ? "Solicitacoes da semana"
                        : "Ciclo de status";
  const submitHandler =
    mode === "user"
      ? onUserSubmit
      : mode === "project"
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
                      : mode === "serviceRequests"
                        ? onServiceRequestSummarySubmit
                        : onStatusCycleSubmit;

  return (
    <div className="modal" onClick={close} role="presentation">
      <div
        aria-labelledby="data-modal-title"
        aria-modal="true"
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button aria-label="Fechar janela" className="modal-close" onClick={close} type="button">
          ×
        </button>
        <span className="eyebrow">
          {mode === "user" ? "Administração de acesso" : "Preencher dados do dashboard"}
        </span>
        <h2 id="data-modal-title">{title}</h2>
        <form className="form-grid" onSubmit={submitHandler}>
          {mode !== "project" && mode !== "user" && (
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
          {mode === "user" && <UserFields />}
          {mode === "project" && <ProjectFields />}
          {mode === "milestone" && <MilestoneFields />}
          {mode === "risk" && <RiskFields />}
          {mode === "action" && <ActionFields />}
          {mode === "task" && <TaskFields />}
          {mode === "deliverable" && <DeliverableFields />}
          {mode === "impediment" && <ImpedimentFields />}
          {mode === "timeEntry" && <TimeEntryFields tasks={tasks} />}
          {mode === "serviceRequests" && (
            <ServiceRequestSummaryFields selectedStatusCycle={selectedStatusCycle} />
          )}
          {mode === "statusCycle" && <StatusCycleFields />}
          <div className="modal-actions full">
            <button className="secondary-btn" onClick={close} type="button">
              Cancelar
            </button>
            <button className="primary-btn" type="submit">
              {mode === "user" ? "Criar usuário" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserFields() {
  return (
    <>
      <label className="full">
        Nome
        <input name="full_name" required minLength={3} placeholder="Nome completo" />
      </label>
      <label className="full">
        E-mail
        <input name="email" required type="email" placeholder="usuario@maxicon.com.br" />
      </label>
      <label>
        Perfil
        <select name="role" defaultValue="consultant">
          <option value="admin">Administrador</option>
          <option value="manager">Gerente</option>
          <option value="consultant">Consultor</option>
          <option value="executive">Executivo</option>
          <option value="client">Cliente</option>
        </select>
      </label>
      <label>
        Senha inicial
        <input name="password" required minLength={8} type="password" />
      </label>
    </>
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

function StatusCycleFields() {
  return (
    <>
      <label>
        Titulo
        <input name="title" required placeholder="Status semanal Cotrijal" />
      </label>
      <label>
        Data da reuniao
        <input name="meeting_date" required type="date" defaultValue={today} />
      </label>
      <label>
        Inicio do periodo
        <input name="period_start" required type="date" defaultValue={today} />
      </label>
      <label>
        Fim do periodo
        <input name="period_end" required type="date" defaultValue={today} />
      </label>
      <label className="full">
        Status
        <select name="status" defaultValue="collecting">
          <option value="collecting">Em coleta</option>
          <option value="ready">Pronto</option>
          <option value="presented">Apresentado</option>
          <option value="approved">Aprovado</option>
          <option value="archived">Arquivado</option>
        </select>
      </label>
      <label className="full">
        Observacao
        <textarea name="notes" rows={3} placeholder="Ex.: periodo consolidado por remanejamento da reuniao." />
      </label>
    </>
  );
}

function ServiceRequestSummaryFields({
  selectedStatusCycle,
}: {
  selectedStatusCycle?: StatusCycle;
}) {
  const defaultStart = selectedStatusCycle?.period_start ?? today;
  const defaultEnd = selectedStatusCycle?.period_end ?? today;
  return (
    <>
      <label>
        Inicio do periodo
        <input name="period_start" required type="date" defaultValue={defaultStart} />
      </label>
      <label>
        Fim do periodo
        <input name="period_end" required type="date" defaultValue={defaultEnd} />
      </label>
      <label>
        Projeto
        <input name="project_requests" min="0" type="number" defaultValue="0" />
      </label>
      <label>
        CRs
        <input name="cr_requests" min="0" type="number" defaultValue="0" />
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

