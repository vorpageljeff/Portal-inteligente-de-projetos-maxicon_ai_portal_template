"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Section = "overview" | "projects" | "milestones" | "risks" | "actions" | "reports";
type ModalMode = "project" | "milestone" | "risk" | "action" | null;
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
    : "https://maxicon-ai-portal-api.onrender.com";

const navItems: Array<{ id: Section; label: string; icon: string }> = [
  { id: "overview", label: "Visao geral", icon: "⌂" },
  { id: "projects", label: "Projetos", icon: "▣" },
  { id: "milestones", label: "Marcos", icon: "⚑" },
  { id: "risks", label: "Riscos", icon: "!" },
  { id: "actions", label: "Plano de acao", icon: "☑" },
];

const today = new Date().toISOString().slice(0, 10);
const nextMonth = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);

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

export default function Home() {
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [dashboard, setDashboard] = useState<Dashboard>(emptyDashboard);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [reports, setReports] = useState<StatusReport[]>([]);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.detail ?? "Nao foi possivel completar a operacao.");
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
          {navItems.map((item) => (
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
            <h1>Status Report Semanal</h1>
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
                  Os indicadores abaixo sao calculados a partir de projetos, marcos, riscos e plano
                  de acao cadastrados.
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

        {activeSection === "projects" && (
          <section className="content-section active">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Portfolio</span>
                <h2>Projetos em andamento</h2>
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
                  <span>{milestone.due_date}</span>
                  <h3>{milestone.title}</h3>
                  <p>Status: {milestone.status}</p>
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
                  <span>{risk.severity}</span>
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
                <h2>Plano de acao completo</h2>
              </div>
              <button className="primary-btn" onClick={() => setModalMode("action")} type="button">
                + Nova acao
              </button>
            </div>
            <div className="kanban">
              {(["todo", "in_progress", "done"] as const).map((status) => (
                <article className="panel kanban-column" key={status}>
                  <h3>{status === "todo" ? "A fazer" : status === "in_progress" ? "Em andamento" : "Concluido"}</h3>
                  {dashboard.actions
                    .filter((action) => action.status === status)
                    .map((action) => (
                      <div className="task-card" key={action.id}>{action.title}</div>
                    ))}
                </article>
              ))}
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
            <b className={`priority ${action.priority}`}>{action.priority}</b>
            <em>{action.due_date.slice(5)}</em>
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
              <td>{project.target_end_date}</td>
              <td>
                <span className={project.status === "at_risk" ? "status-pill yellow" : "status-pill green"}>
                  {project.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function DataModal({
  mode,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  close,
  onProjectSubmit,
  onMilestoneSubmit,
  onRiskSubmit,
  onActionSubmit,
}: {
  mode: ModalMode;
  projects: Project[];
  selectedProjectId: string;
  setSelectedProjectId: (projectId: string) => void;
  close: () => void;
  onProjectSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMilestoneSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRiskSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onActionSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const title =
    mode === "project"
      ? "Novo projeto"
      : mode === "milestone"
        ? "Novo marco"
        : mode === "risk"
          ? "Novo risco"
          : "Nova acao";
  const submitHandler =
    mode === "project"
      ? onProjectSubmit
      : mode === "milestone"
        ? onMilestoneSubmit
        : mode === "risk"
          ? onRiskSubmit
          : onActionSubmit;

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
