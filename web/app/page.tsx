"use client";

import { useState } from "react";

type Section = "overview" | "projects" | "milestones" | "risks" | "actions";

const navItems: Array<{ id: Section; label: string; icon: string }> = [
  { id: "overview", label: "Visão geral", icon: "⌂" },
  { id: "projects", label: "Projetos", icon: "▣" },
  { id: "milestones", label: "Marcos", icon: "⚑" },
  { id: "risks", label: "Riscos", icon: "⚠" },
  { id: "actions", label: "Plano de ação", icon: "☑" },
];

export default function Home() {
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [modalOpen, setModalOpen] = useState(false);

  function openSection(section: Section) {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <img alt="Maxicon Sistemas" src="/logo-maxicon.png" />
          </div>
        </div>

        <nav className="nav" aria-label="Navegação principal">
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
              negócios e tecnologia
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
            <button className="menu-btn" type="button" aria-label="Abrir menu">
              ☰
            </button>
            <h1>Status Report Semanal</h1>
          </div>

          <div className="topbar-actions">
            <label className="period-select">
              <span>Período</span>
              <select defaultValue="current">
                <option value="current">12 a 18 de maio de 2025</option>
                <option value="previous">05 a 11 de maio de 2025</option>
                <option value="month">Maio de 2025</option>
              </select>
            </label>
            <button className="icon-btn" type="button" aria-label="Notificações">
              ♧<b>3</b>
            </button>
            <div className="admin-mini">
              <div className="avatar">AD</div>
              <div>
                <strong>Admin</strong>
                <span>Administrador</span>
              </div>
            </div>
          </div>
        </header>

        {activeSection === "overview" && (
          <section className="content-section active">
            <section className="hero-panel">
              <div className="hero-orb">
                <div className="shield">✓</div>
              </div>
              <div className="hero-content">
                <h2>Visão consolidada da semana</h2>
                <p>
                  Acompanhe o desempenho dos projetos, marcos, riscos e ações estratégicas em
                  andamento.
                </p>
              </div>
              <div className="hero-status">
                <span>Saúde geral:</span>
                <strong>Estável</strong>
                <div className="pulse-line" />
              </div>
              <div className="hero-brand">
                <span>25</span>
                <strong>maxicon</strong>
                <small>sistemas</small>
              </div>
            </section>

            <section className="kpi-grid">
              <article className="kpi-card">
                <div className="kpi-icon">▣</div>
                <div>
                  <span>Projetos ativos</span>
                  <strong>12</strong>
                  <small className="positive">↑ 1 vs semana anterior</small>
                </div>
              </article>

              <article className="kpi-card">
                <div className="kpi-icon ring-icon" />
                <div>
                  <span>Progresso médio</span>
                  <strong>63%</strong>
                  <small className="positive">↑ 5 p.p. vs semana anterior</small>
                </div>
              </article>

              <article className="kpi-card">
                <div className="kpi-icon">◷</div>
                <div>
                  <span>Horas apontadas</span>
                  <strong>1.248h</strong>
                  <small className="positive">↑ 8% vs semana anterior</small>
                </div>
              </article>

              <article className="kpi-card alert">
                <div className="kpi-icon">!</div>
                <div>
                  <span>Riscos críticos</span>
                  <strong>3</strong>
                  <small className="negative">↓ 1 vs semana anterior</small>
                </div>
              </article>
            </section>

            <section className="dashboard-grid">
              <article className="panel progress-panel">
                <div className="panel-header">
                  <h3>Evolução do portfólio</h3>
                </div>
                <div className="chart-legend">
                  <span className="solid">Progresso médio (%)</span>
                  <span className="dashed">Meta</span>
                </div>
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
                      <path
                        className="area"
                        d="M0 155 L140 142 L280 126 L420 103 L560 96 L700 78 L700 230 L0 230 Z"
                      />
                      <polyline
                        className="line"
                        points="0,155 140,142 280,126 420,103 560,96 700,78"
                      />
                      <g className="points">
                        <circle cx="0" cy="155" r="5" />
                        <circle cx="140" cy="142" r="5" />
                        <circle cx="280" cy="126" r="5" />
                        <circle cx="420" cy="103" r="5" />
                        <circle cx="560" cy="96" r="5" />
                        <circle cx="700" cy="78" r="5" />
                      </g>
                    </svg>
                    <div className="chart-values">
                      <span>45%</span>
                      <span>48%</span>
                      <span>52%</span>
                      <span>57%</span>
                      <span>58%</span>
                      <span>63%</span>
                    </div>
                    <div className="chart-labels">
                      <span>14/abr</span>
                      <span>21/abr</span>
                      <span>28/abr</span>
                      <span>05/mai</span>
                      <span>12/mai</span>
                      <span>18/mai</span>
                    </div>
                  </div>
                </div>
              </article>

              <article className="panel allocation-panel">
                <div className="panel-header">
                  <h3>Alocação de horas</h3>
                </div>
                <div className="donut-row">
                  <div className="donut">
                    <div className="donut-center">
                      <strong>78%</strong>
                      <span>Rentáveis</span>
                    </div>
                  </div>
                  <div className="legend">
                    <div>
                      <span className="legend-dot rentavel" />
                      <p>
                        Rentáveis <b>974h (78%)</b>
                      </p>
                    </div>
                    <div>
                      <span className="legend-dot nao-rentavel" />
                      <p>
                        Não rentáveis <b>208h (17%)</b>
                      </p>
                    </div>
                    <div>
                      <span className="legend-dot outros" />
                      <p>
                        Outros <b>66h (5%)</b>
                      </p>
                    </div>
                  </div>
                </div>
                <p className="total-hours">Total de horas: 1.248h</p>
              </article>

              <article className="panel summary-panel">
                <div className="panel-header">
                  <h3>Resumo executivo</h3>
                  <span className="doc-icon">▤</span>
                </div>
                <div className="summary-box">
                  <div className="summary-item success">
                    <span>✓</span>
                    <p>Entrega de marcos importantes em Cotrijal e Dunamis dentro do planejado.</p>
                  </div>
                  <div className="summary-item info">
                    <span>i</span>
                    <p>Aumento de 5 p.p. no progresso médio do portfólio.</p>
                  </div>
                  <div className="summary-item warning">
                    <span>△</span>
                    <p>3 riscos críticos em acompanhamento próximo e plano de mitigação em execução.</p>
                  </div>
                  <div className="summary-item trend">
                    <span>↗</span>
                    <p>Capacidade da equipe adequada para as demandas da próxima semana.</p>
                  </div>
                </div>
              </article>
            </section>

            <section className="lower-grid">
              <article className="panel table-panel">
                <div className="panel-header">
                  <h3>Status por iniciativa</h3>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Iniciativa</th>
                      <th>Progresso</th>
                      <th>Variação</th>
                      <th>Status</th>
                      <th>Marcos</th>
                      <th>Riscos</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Cotrijal</td>
                      <td>
                        <div className="progress-cell">
                          <b>72%</b>
                          <div className="progress-track">
                            <span style={{ width: "72%" }} />
                          </div>
                        </div>
                      </td>
                      <td className="positive">↑ 8 p.p.</td>
                      <td>
                        <span className="status-pill green">No caminho</span>
                      </td>
                      <td>3/4</td>
                      <td>
                        <span className="risk-count">1</span>
                      </td>
                    </tr>
                    <tr>
                      <td>Dunamis</td>
                      <td>
                        <div className="progress-cell">
                          <b>65%</b>
                          <div className="progress-track">
                            <span style={{ width: "65%" }} />
                          </div>
                        </div>
                      </td>
                      <td className="positive">↑ 6 p.p.</td>
                      <td>
                        <span className="status-pill green">No caminho</span>
                      </td>
                      <td>2/3</td>
                      <td>
                        <span className="risk-count">1</span>
                      </td>
                    </tr>
                    <tr>
                      <td>Agrária</td>
                      <td>
                        <div className="progress-cell">
                          <b>55%</b>
                          <div className="progress-track">
                            <span style={{ width: "55%" }} />
                          </div>
                        </div>
                      </td>
                      <td className="negative">↓ 2 p.p.</td>
                      <td>
                        <span className="status-pill yellow">Atenção</span>
                      </td>
                      <td>1/3</td>
                      <td>
                        <span className="risk-count muted">0</span>
                      </td>
                    </tr>
                    <tr>
                      <td>Olfar</td>
                      <td>
                        <div className="progress-cell">
                          <b>42%</b>
                          <div className="progress-track">
                            <span style={{ width: "42%" }} />
                          </div>
                        </div>
                      </td>
                      <td className="negative">↓ 4 p.p.</td>
                      <td>
                        <span className="status-pill red">Atrasado</span>
                      </td>
                      <td>1/4</td>
                      <td>
                        <span className="risk-count">1</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <button className="text-link" onClick={() => openSection("projects")} type="button">
                  Ver todas as iniciativas →
                </button>
              </article>

              <article className="panel action-panel">
                <div className="panel-header">
                  <h3>Plano de ação – próximos passos</h3>
                  <span className="doc-icon">▦</span>
                </div>
                <div className="action-list">
                  <label>
                    <input type="checkbox" />
                    <span>Mitigar riscos críticos identificados</span>
                    <b className="priority high">Alta</b>
                    <em>22/05</em>
                  </label>
                  <label>
                    <input type="checkbox" />
                    <span>Finalizar integrações – Cotrijal</span>
                    <b className="priority medium">Média</b>
                    <em>23/05</em>
                  </label>
                  <label>
                    <input type="checkbox" />
                    <span>Revisão de escopo – Olfar</span>
                    <b className="priority high">Alta</b>
                    <em>23/05</em>
                  </label>
                  <label>
                    <input defaultChecked type="checkbox" />
                    <span>Report de desempenho para stakeholders</span>
                    <b className="priority low">Baixa</b>
                    <em>19/05</em>
                  </label>
                </div>
                <button className="text-link" onClick={() => openSection("actions")} type="button">
                  Ver plano completo →
                </button>
              </article>
            </section>
          </section>
        )}

        {activeSection === "projects" && (
          <section className="content-section active">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Portfólio</span>
                <h2>Projetos em andamento</h2>
              </div>
              <button className="primary-btn" onClick={() => setModalOpen(true)} type="button">
                + Adicionar projeto
              </button>
            </div>
            <article className="panel table-panel wide">
              <table>
                <thead>
                  <tr>
                    <th>Projeto</th>
                    <th>Responsável</th>
                    <th>Progresso</th>
                    <th>Prazo</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Cotrijal • Integração SAP</td>
                    <td>Jefferson</td>
                    <td>72%</td>
                    <td>22/05</td>
                    <td>
                      <span className="status-pill green">No caminho</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Dunamis • Migração</td>
                    <td>Vanessa</td>
                    <td>65%</td>
                    <td>23/05</td>
                    <td>
                      <span className="status-pill green">No caminho</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Agrária • Evolutivos</td>
                    <td>Irwin</td>
                    <td>55%</td>
                    <td>27/05</td>
                    <td>
                      <span className="status-pill yellow">Atenção</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </article>
          </section>
        )}

        {activeSection === "milestones" && (
          <section className="content-section active">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Planejamento</span>
                <h2>Marcos da semana</h2>
              </div>
            </div>
            <div className="milestone-grid">
              {["Revisão do plano de cutover", "Testes integrados", "Go/No-Go executivo"].map(
                (item, index) => (
                  <article className="panel milestone-card" key={item}>
                    <span>{index === 0 ? "15/05" : index === 1 ? "18/05" : "22/05"}</span>
                    <h3>{item}</h3>
                    <p>Responsáveis alinhados, dependências mapeadas e evidências em preparação.</p>
                  </article>
                ),
              )}
            </div>
          </section>
        )}

        {activeSection === "risks" && (
          <section className="content-section active">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Governança</span>
                <h2>Riscos críticos</h2>
              </div>
            </div>
            <div className="risk-grid">
              <article className="panel risk-card critical">
                <span>Crítico</span>
                <h3>Dependência de retorno SAP</h3>
                <p>Cenários alternativos dependem de validação externa.</p>
              </article>
              <article className="panel risk-card high">
                <span>Alto</span>
                <h3>Capacidade insuficiente</h3>
                <p>Backlog acumulado acima da disponibilidade atual.</p>
              </article>
              <article className="panel risk-card medium">
                <span>Médio</span>
                <h3>Treinamento das unidades</h3>
                <p>Agenda de treinamento reduz janela para testes finais.</p>
              </article>
            </div>
          </section>
        )}

        {activeSection === "actions" && (
          <section className="content-section active">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Execução</span>
                <h2>Plano de ação completo</h2>
              </div>
            </div>
            <div className="kanban">
              {["A fazer", "Em andamento", "Concluído"].map((column) => (
                <article className="panel kanban-column" key={column}>
                  <h3>{column}</h3>
                  <div className="task-card">Validar cenários fora do caminho feliz</div>
                  <div className="task-card">Preparar apresentação Go/No-Go</div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      {modalOpen && (
        <div className="modal" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalOpen(false)} type="button">
              ×
            </button>
            <span className="eyebrow">Novo status report</span>
            <h2>Criar reporte semanal</h2>
            <div className="form-grid">
              <label>
                Projeto
                <input placeholder="Ex.: Cotrijal • Integração SAP" />
              </label>
              <label>
                Período
                <input type="week" />
              </label>
              <label>
                Progresso (%)
                <input max="100" min="0" placeholder="63" type="number" />
              </label>
              <label>
                Status
                <select>
                  <option>No caminho</option>
                  <option>Atenção</option>
                  <option>Atrasado</option>
                </select>
              </label>
              <label className="full">
                Resumo executivo
                <textarea placeholder="Principais avanços, desvios e decisões..." rows={4} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setModalOpen(false)} type="button">
                Cancelar
              </button>
              <button className="primary-btn" onClick={() => setModalOpen(false)} type="button">
                Salvar reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
