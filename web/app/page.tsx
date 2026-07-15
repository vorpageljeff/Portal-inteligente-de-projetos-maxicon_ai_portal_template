"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type View = "dashboard" | "projects" | "hours" | "reports";

type Project = {
  id: string;
  name: string;
  client_name: string;
  description?: string | null;
  manager_name?: string | null;
  start_date: string;
  target_end_date: string;
  contracted_hours: number;
  status: string;
  created_at: string;
};

type ProjectForm = {
  name: string;
  client_name: string;
  description: string;
  manager_name: string;
  start_date: string;
  target_end_date: string;
  contracted_hours: string;
  status: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const initialProjectForm: ProjectForm = {
  name: "Implantação Cotrijal - Demonstração",
  client_name: "Cotrijal",
  description: "Projeto piloto para acompanhar implantação, tarefas, riscos e status semanal.",
  manager_name: "Gerente Maxicon",
  start_date: new Date().toISOString().slice(0, 10),
  target_end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString().slice(0, 10),
  contracted_hours: "240",
  status: "planning",
};

const navItems: Array<{ id: View; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "projects", label: "Projetos" },
  { id: "hours", label: "Horas" },
  { id: "reports", label: "Status Report" },
];

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function Home() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draft, setDraft] = useState("");
  const [projectForm, setProjectForm] = useState<ProjectForm>(initialProjectForm);
  const [hours, setHours] = useState({ planned: "40", done: "0", billable: "0", nonBillable: "0" });
  const [reportForm, setReportForm] = useState({
    completed_items: "Kickoff realizado\nPlano de implantação revisado",
    ongoing_items: "Levantamento de aderência\nPreparação de treinamento",
    delayed_items: "",
    risks: "Agenda de usuários-chave pode impactar homologação",
    impediments: "",
    next_steps: "Validar cronograma da próxima semana\nConfirmar responsáveis por cutover",
  });

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];

  const metrics = useMemo(() => {
    const activeProjects = projects.filter((project) => project.status !== "completed").length;
    const attentionProjects = projects.filter((project) => project.status === "at_risk").length;
    const contractedHours = projects.reduce((total, project) => total + project.contracted_hours, 0);
    const planned = Number(hours.planned) || 0;
    const done = Number(hours.done) || 0;
    const consumed = contractedHours > 0 ? Math.round((done / contractedHours) * 100) : 0;

    return { activeProjects, attentionProjects, contractedHours, planned, done, consumed };
  }, [hours.done, hours.planned, projects]);

  async function loadProjects() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/projects`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Nao foi possivel carregar os projetos.");
      }
      const data = (await response.json()) as Project[];
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...projectForm,
          contracted_hours: Number(projectForm.contracted_hours) || 0,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail ?? "Nao foi possivel criar o projeto.");
      }

      const project = (await response.json()) as Project;
      setProjects((current) => [project, ...current]);
      setSelectedProjectId(project.id);
      setSuccess("Projeto criado com sucesso.");
      setActiveView("projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao salvar projeto.");
    } finally {
      setSaving(false);
    }
  }

  async function generateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) {
      setError("Crie ou selecione um projeto antes de gerar o status report.");
      setActiveView("projects");
      return;
    }

    setReporting(true);
    setError("");
    setSuccess("");
    setDraft("");
    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 4);

      const response = await fetch(`${apiBaseUrl}/api/v1/status-reports/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: selectedProject.name,
          period_start: weekStart.toISOString().slice(0, 10),
          period_end: weekEnd.toISOString().slice(0, 10),
          completed_items: splitLines(reportForm.completed_items),
          ongoing_items: splitLines(reportForm.ongoing_items),
          delayed_items: splitLines(reportForm.delayed_items),
          risks: splitLines(reportForm.risks),
          impediments: splitLines(reportForm.impediments),
          next_steps: splitLines(reportForm.next_steps),
        }),
      });

      if (!response.ok) {
        throw new Error("Nao foi possivel gerar o rascunho.");
      }

      const payload = (await response.json()) as { content: string };
      setDraft(payload.content);
      setSuccess("Rascunho gerado. Revise antes de enviar ao cliente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao gerar report.");
    } finally {
      setReporting(false);
    }
  }

  return (
    <>
      <header className="app-header">
        <button className="brand" onClick={() => setActiveView("dashboard")} type="button">
          <span>Maxicon</span>
          <strong>Portal Inteligente</strong>
        </button>
        <nav aria-label="Principal">
          {navItems.map((item) => (
            <button
              className={activeView === item.id ? "active" : ""}
              key={item.id}
              onClick={() => setActiveView(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="shell">
        {(error || success) && (
          <div className={error ? "notice error" : "notice success"}>{error || success}</div>
        )}

        {activeView === "dashboard" && (
          <section className="view">
            <div className="hero">
              <p>Visão executiva</p>
              <h1>Status semanal sem montar planilhas toda sexta-feira.</h1>
              <span>Centralize projetos, horas, riscos e pendências com revisão humana.</span>
              <div className="hero-actions">
                <button onClick={() => setActiveView("projects")} type="button">
                  Criar projeto
                </button>
                <button className="secondary" onClick={() => setActiveView("reports")} type="button">
                  Gerar status report
                </button>
              </div>
            </div>

            <section className="cards">
              <article>
                <span>Projetos ativos</span>
                <strong>{metrics.activeProjects}</strong>
              </article>
              <article>
                <span>Em atenção</span>
                <strong>{metrics.attentionProjects}</strong>
              </article>
              <article>
                <span>Horas contratadas</span>
                <strong>{metrics.contractedHours}</strong>
              </article>
              <article>
                <span>Consumo estimado</span>
                <strong>{metrics.consumed}%</strong>
              </article>
            </section>

            <section className="panel">
              <div className="panel-title">
                <div>
                  <p>Operação</p>
                  <h2>Projetos recentes</h2>
                </div>
                <button onClick={loadProjects} type="button">
                  Atualizar
                </button>
              </div>
              {loading ? (
                <p className="empty">Carregando projetos...</p>
              ) : projects.length === 0 ? (
                <p className="empty">Nenhum projeto cadastrado ainda.</p>
              ) : (
                <div className="project-list">
                  {projects.slice(0, 4).map((project) => (
                    <button
                      className="project-row"
                      key={project.id}
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setActiveView("projects");
                      }}
                      type="button"
                    >
                      <span>
                        <strong>{project.name}</strong>
                        <small>{project.client_name}</small>
                      </span>
                      <em>{project.status}</em>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

        {activeView === "projects" && (
          <section className="view split">
            <section className="panel">
              <div className="panel-title">
                <div>
                  <p>Cadastro</p>
                  <h2>Novo projeto</h2>
                </div>
              </div>
              <form className="form" onSubmit={createProject}>
                <label>
                  Nome
                  <input
                    onChange={(event) =>
                      setProjectForm({ ...projectForm, name: event.target.value })
                    }
                    required
                    value={projectForm.name}
                  />
                </label>
                <label>
                  Cliente
                  <input
                    onChange={(event) =>
                      setProjectForm({ ...projectForm, client_name: event.target.value })
                    }
                    required
                    value={projectForm.client_name}
                  />
                </label>
                <label>
                  Gerente
                  <input
                    onChange={(event) =>
                      setProjectForm({ ...projectForm, manager_name: event.target.value })
                    }
                    value={projectForm.manager_name}
                  />
                </label>
                <label>
                  Horas contratadas
                  <input
                    min="0"
                    onChange={(event) =>
                      setProjectForm({ ...projectForm, contracted_hours: event.target.value })
                    }
                    type="number"
                    value={projectForm.contracted_hours}
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Início
                    <input
                      onChange={(event) =>
                        setProjectForm({ ...projectForm, start_date: event.target.value })
                      }
                      required
                      type="date"
                      value={projectForm.start_date}
                    />
                  </label>
                  <label>
                    Previsão
                    <input
                      onChange={(event) =>
                        setProjectForm({ ...projectForm, target_end_date: event.target.value })
                      }
                      required
                      type="date"
                      value={projectForm.target_end_date}
                    />
                  </label>
                </div>
                <label>
                  Status
                  <select
                    onChange={(event) =>
                      setProjectForm({ ...projectForm, status: event.target.value })
                    }
                    value={projectForm.status}
                  >
                    <option value="planning">Planejamento</option>
                    <option value="active">Ativo</option>
                    <option value="at_risk">Em risco</option>
                    <option value="completed">Concluído</option>
                  </select>
                </label>
                <label>
                  Descrição
                  <textarea
                    onChange={(event) =>
                      setProjectForm({ ...projectForm, description: event.target.value })
                    }
                    rows={4}
                    value={projectForm.description}
                  />
                </label>
                <button disabled={saving} type="submit">
                  {saving ? "Salvando..." : "Salvar projeto"}
                </button>
              </form>
            </section>

            <section className="panel">
              <div className="panel-title">
                <div>
                  <p>Portfólio</p>
                  <h2>Projetos cadastrados</h2>
                </div>
                <button onClick={loadProjects} type="button">
                  Recarregar
                </button>
              </div>
              {projects.length === 0 ? (
                <p className="empty">Crie o primeiro projeto para movimentar o portal.</p>
              ) : (
                <div className="project-list">
                  {projects.map((project) => (
                    <button
                      className={
                        selectedProject?.id === project.id ? "project-row selected" : "project-row"
                      }
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      type="button"
                    >
                      <span>
                        <strong>{project.name}</strong>
                        <small>
                          {project.client_name} · {project.manager_name || "Sem gerente"}
                        </small>
                      </span>
                      <em>{project.contracted_hours}h</em>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

        {activeView === "hours" && (
          <section className="view split">
            <section className="panel">
              <div className="panel-title">
                <div>
                  <p>Horas</p>
                  <h2>Planejado x realizado</h2>
                </div>
              </div>
              <div className="form">
                <label>
                  Horas planejadas na semana
                  <input
                    min="0"
                    onChange={(event) => setHours({ ...hours, planned: event.target.value })}
                    type="number"
                    value={hours.planned}
                  />
                </label>
                <label>
                  Horas realizadas
                  <input
                    min="0"
                    onChange={(event) => setHours({ ...hours, done: event.target.value })}
                    type="number"
                    value={hours.done}
                  />
                </label>
                <label>
                  Horas rentáveis
                  <input
                    min="0"
                    onChange={(event) => setHours({ ...hours, billable: event.target.value })}
                    type="number"
                    value={hours.billable}
                  />
                </label>
                <label>
                  Horas não rentáveis
                  <input
                    min="0"
                    onChange={(event) => setHours({ ...hours, nonBillable: event.target.value })}
                    type="number"
                    value={hours.nonBillable}
                  />
                </label>
              </div>
            </section>
            <section className="panel">
              <div className="panel-title">
                <div>
                  <p>Capacidade</p>
                  <h2>Resumo da semana</h2>
                </div>
              </div>
              <div className="summary-grid">
                <article>
                  <span>Restante</span>
                  <strong>{Math.max(metrics.planned - metrics.done, 0)}h</strong>
                </article>
                <article>
                  <span>Rentáveis</span>
                  <strong>{Number(hours.billable) || 0}h</strong>
                </article>
                <article>
                  <span>Não rentáveis</span>
                  <strong>{Number(hours.nonBillable) || 0}h</strong>
                </article>
                <article>
                  <span>Execução</span>
                  <strong>{metrics.planned ? Math.round((metrics.done / metrics.planned) * 100) : 0}%</strong>
                </article>
              </div>
            </section>
          </section>
        )}

        {activeView === "reports" && (
          <section className="view split">
            <section className="panel">
              <div className="panel-title">
                <div>
                  <p>Status report</p>
                  <h2>Gerar rascunho</h2>
                </div>
              </div>
              <form className="form" onSubmit={generateReport}>
                <label>
                  Projeto
                  <select
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                    value={selectedProject?.id ?? ""}
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Concluídos
                  <textarea
                    onChange={(event) =>
                      setReportForm({ ...reportForm, completed_items: event.target.value })
                    }
                    rows={3}
                    value={reportForm.completed_items}
                  />
                </label>
                <label>
                  Em andamento
                  <textarea
                    onChange={(event) =>
                      setReportForm({ ...reportForm, ongoing_items: event.target.value })
                    }
                    rows={3}
                    value={reportForm.ongoing_items}
                  />
                </label>
                <label>
                  Atrasos
                  <textarea
                    onChange={(event) =>
                      setReportForm({ ...reportForm, delayed_items: event.target.value })
                    }
                    rows={2}
                    value={reportForm.delayed_items}
                  />
                </label>
                <label>
                  Riscos
                  <textarea
                    onChange={(event) => setReportForm({ ...reportForm, risks: event.target.value })}
                    rows={2}
                    value={reportForm.risks}
                  />
                </label>
                <label>
                  Próximos passos
                  <textarea
                    onChange={(event) =>
                      setReportForm({ ...reportForm, next_steps: event.target.value })
                    }
                    rows={3}
                    value={reportForm.next_steps}
                  />
                </label>
                <button disabled={reporting || projects.length === 0} type="submit">
                  {reporting ? "Gerando..." : "Gerar rascunho"}
                </button>
              </form>
            </section>

            <section className="panel report-preview">
              <div className="panel-title">
                <div>
                  <p>Revisão humana obrigatória</p>
                  <h2>Rascunho</h2>
                </div>
              </div>
              {draft ? (
                <pre>{draft}</pre>
              ) : (
                <p className="empty">
                  Preencha os dados da semana e gere um rascunho. Nada é aprovado automaticamente.
                </p>
              )}
            </section>
          </section>
        )}
      </main>
    </>
  );
}
