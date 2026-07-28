"use client";

import { useMemo, useState, type ReactNode } from "react";

import { percentage, progressGap, remainingHours } from "../lib/project-metrics";
import { closingProgress } from "../lib/closing-workflow";

type Tone = "positive" | "warning" | "critical" | "neutral" | "info";

export function ProjectHealthBadge({ label }: { label: string }) {
  const normalized = label.toLowerCase();
  const tone: Tone =
    normalized.includes("cr") || normalized.includes("atras")
      ? "critical"
      : normalized.includes("aten")
        ? "warning"
        : normalized.includes("est") || normalized.includes("concl")
          ? "positive"
          : "neutral";

  return <span className={`health-badge ${tone}`}>{label}</span>;
}

export function KpiCard({
  label,
  value,
  comparison,
  help,
  tone = "neutral",
}: {
  label: string;
  value: string;
  comparison: string;
  help: string;
  tone?: Tone;
}) {
  return (
    <article className={`executive-kpi ${tone}`} title={help}>
      <div className="kpi-label-row">
        <span>{label}</span>
        <span className="help-dot" aria-label={help}>
          ?
        </span>
      </div>
      <strong>{value}</strong>
      <small>{comparison}</small>
    </article>
  );
}

export function ProjectHeader({
  project,
  period,
  health,
  onUpdate,
  onCloseWeek,
  onGenerateStatus,
  onDocuments,
}: {
  project: {
    name: string;
    client_name: string;
    manager_name?: string | null;
    status: string;
    target_end_date: string;
  };
  period: string;
  health: string;
  onUpdate: () => void;
  onCloseWeek: () => void;
  onGenerateStatus: () => void;
  onDocuments: () => void;
}) {
  return (
    <section className="project-header">
      <div className="project-title">
        <span className="eyebrow">Visão do projeto</span>
        <div>
          <h2>{project.name}</h2>
          <ProjectHealthBadge label={health} />
        </div>
        <p>{project.client_name}</p>
      </div>
      <dl className="project-metadata">
        <div>
          <dt>Responsável</dt>
          <dd>{project.manager_name || "Não informado"}</dd>
        </div>
        <div>
          <dt>Fase atual</dt>
          <dd>{project.status}</dd>
        </div>
        <div>
          <dt>Período analisado</dt>
          <dd>{period}</dd>
        </div>
        <div>
          <dt>Conclusão prevista</dt>
          <dd>{new Date(`${project.target_end_date}T12:00:00`).toLocaleDateString("pt-BR")}</dd>
        </div>
      </dl>
      <div className="project-actions" aria-label="Ações do projeto">
        <button className="primary-btn" onClick={onUpdate} type="button">
          Atualizar projeto
        </button>
        <button className="secondary-btn" onClick={onCloseWeek} type="button">
          Fechar semana
        </button>
        <button className="secondary-btn" onClick={onGenerateStatus} type="button">
          Gerar status
        </button>
        <button className="secondary-btn" onClick={onDocuments} type="button">
          Baixar documentos
        </button>
      </div>
    </section>
  );
}

export function ExecutiveSummary({
  content,
  generatedAt,
  reviewer,
  reviewStatus,
  onRegenerate,
  onEdit,
  onApprove,
}: {
  content: string[];
  generatedAt: string;
  reviewer: string;
  reviewStatus: string;
  onRegenerate: () => void;
  onEdit: () => void;
  onApprove: () => void;
}) {
  return (
    <article className="surface executive-summary">
      <header className="surface-header">
        <div>
          <span className="eyebrow">Leitura executiva</span>
          <h3>Resumo executivo</h3>
        </div>
        <ProjectHealthBadge label={reviewStatus} />
      </header>
      <div className="summary-content">
        {content.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
      <footer className="summary-footer">
        <span>Gerado em {generatedAt}</span>
        <span>Revisão: {reviewer}</span>
        <div>
          <button className="text-action" onClick={onRegenerate} type="button">
            Regenerar
          </button>
          <button className="secondary-btn" onClick={onEdit} type="button">
            Editar
          </button>
          <button className="primary-btn" onClick={onApprove} type="button">
            Aprovar
          </button>
        </div>
      </footer>
    </article>
  );
}

export function ProgressComparisonChart({
  planned,
  actual,
  points,
}: {
  planned: number;
  actual: number;
  points: Array<{ label: string; progress_percent: number }>;
}) {
  const gap = progressGap(actual, planned);
  return (
    <article className="surface progress-comparison">
      <header className="surface-header">
        <div>
          <span className="eyebrow">Evolução acumulada</span>
          <h3>Planejado versus realizado</h3>
        </div>
        <ProjectHealthBadge label={gap >= 0 ? `${gap} p.p. adiantado` : `${Math.abs(gap)} p.p. abaixo`} />
      </header>
      <div className="comparison-bars" role="img" aria-label={`Planejado ${planned}%, realizado ${actual}%`}>
        <div>
          <span>Planejado até a data</span>
          <div className="comparison-track">
            <i className="planned" style={{ width: `${Math.min(planned, 100)}%` }} />
          </div>
          <strong>{planned}%</strong>
        </div>
        <div>
          <span>Realizado acumulado</span>
          <div className="comparison-track">
            <i className="actual" style={{ width: `${Math.min(actual, 100)}%` }} />
          </div>
          <strong>{actual}%</strong>
        </div>
      </div>
      <div className="trend-points" aria-label="Tendência recente">
        {points.map((point) => (
          <span key={point.label}>
            <small>{point.label}</small>
            <b>{point.progress_percent}%</b>
          </span>
        ))}
      </div>
    </article>
  );
}

type WorkItem = {
  title: string;
  owner?: string | null;
  due_date?: string | null;
  status?: string;
};

function WorkList({ items, empty }: { items: WorkItem[]; empty: string }) {
  if (!items.length) return <EmptyState title={empty} description="Cadastre ou atualize os itens operacionais do período." />;
  return (
    <ul className="work-list">
      {items.slice(0, 5).map((item) => (
        <li key={`${item.title}-${item.due_date ?? ""}`}>
          <strong>{item.title}</strong>
          <span>
            {item.owner || "Responsável não informado"}
            {item.due_date
              ? ` · ${new Date(`${item.due_date}T12:00:00`).toLocaleDateString("pt-BR")}`
              : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function WeeklyAchievements({
  completed,
  inProgress,
  next,
}: {
  completed: WorkItem[];
  inProgress: WorkItem[];
  next: WorkItem[];
}) {
  return (
    <section className="weekly-columns">
      <article className="surface">
        <span className="eyebrow positive-text">Concluído nesta semana</span>
        <WorkList items={completed} empty="Nenhuma conclusão registrada" />
      </article>
      <article className="surface">
        <span className="eyebrow">Em andamento</span>
        <WorkList items={inProgress} empty="Nenhum item em andamento" />
      </article>
      <article className="surface">
        <span className="eyebrow">Próximos passos</span>
        <WorkList items={next} empty="Nenhum próximo passo definido" />
      </article>
    </section>
  );
}

export function PendingDecisionsTable({
  items,
}: {
  items: Array<{
    id: string;
    description: string;
    owner_name: string;
    responsible_org: string;
    due_date: string;
    impact: string;
    status: string;
  }>;
}) {
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [impactFilter, setImpactFilter] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const options = useMemo(
    () => ({
      statuses: [...new Set(items.map((item) => item.status))].sort(),
      owners: [...new Set(items.map((item) => item.owner_name))].sort(),
      impacts: [...new Set(items.map((item) => item.impact))].sort(),
      organizations: [...new Set(items.map((item) => item.responsible_org))].sort(),
    }),
    [items],
  );
  const filteredItems = items.filter(
    (item) =>
      (!statusFilter || item.status === statusFilter) &&
      (!ownerFilter || item.owner_name === ownerFilter) &&
      (!impactFilter || item.impact === impactFilter) &&
      (!organizationFilter || item.responsible_org === organizationFilter),
  );

  return (
    <article className="surface responsive-table">
      <header className="surface-header">
        <div>
          <span className="eyebrow">Ação necessária</span>
          <h3>Pendências e decisões</h3>
        </div>
        <FilterBar
          filters={[
            { label: "Situação", value: statusFilter, options: options.statuses, onChange: setStatusFilter },
            { label: "Responsável", value: ownerFilter, options: options.owners, onChange: setOwnerFilter },
            { label: "Impacto", value: impactFilter, options: options.impacts, onChange: setImpactFilter },
            { label: "Organização", value: organizationFilter, options: options.organizations, onChange: setOrganizationFilter },
          ]}
        />
      </header>
      {!items.length ? (
        <EmptyState title="Nenhuma pendência aberta" description="Impedimentos e decisões do projeto aparecerão aqui." />
      ) : !filteredItems.length ? (
        <EmptyState title="Nenhum resultado para os filtros" description="Remova um ou mais filtros para ampliar a busca." />
      ) : (
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Responsável</th>
              <th>Organização</th>
              <th>Prazo</th>
              <th>Impacto</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td data-label="Descrição">
                  {item.description}
                  {item.responsible_org === "client" && <span className="client-dependency">Depende do cliente</span>}
                </td>
                <td data-label="Responsável">{item.owner_name}</td>
                <td data-label="Organização">{item.responsible_org}</td>
                <td data-label="Prazo">{new Date(`${item.due_date}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                <td data-label="Impacto">{item.impact}</td>
                <td data-label="Situação"><ProjectHealthBadge label={item.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  );
}

export function RisksTable({
  risks,
}: {
  risks: Array<{ id: string; title: string; description?: string | null; severity: string; status: string }>;
}) {
  return (
    <article className="surface responsive-table">
      <header className="surface-header">
        <div>
          <span className="eyebrow">Governança</span>
          <h3>Riscos do projeto</h3>
        </div>
      </header>
      {!risks.length ? (
        <EmptyState title="Nenhum risco registrado" description="Registre riscos com impacto real no projeto." />
      ) : (
        <table>
          <thead>
            <tr>
              <th>Risco</th>
              <th>Descrição</th>
              <th>Criticidade</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((risk) => (
              <tr key={risk.id}>
                <td data-label="Risco"><strong>{risk.title}</strong></td>
                <td data-label="Descrição">{risk.description || "Sem descrição"}</td>
                <td data-label="Criticidade"><ProjectHealthBadge label={risk.severity} /></td>
                <td data-label="Situação">{risk.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  );
}

export function HoursSummary({
  contracted,
  consumed,
  billable,
  nonBillable,
}: {
  contracted: number;
  consumed: number;
  billable: number;
  nonBillable: number;
}) {
  const remaining = remainingHours(contracted, consumed);
  const consumedPercent = percentage(consumed, contracted);
  return (
    <article className="surface">
      <header className="surface-header">
        <div>
          <span className="eyebrow">Capacidade financeira</span>
          <h3>Horas e orçamento</h3>
        </div>
        <ProjectHealthBadge label={`${consumedPercent}% consumido`} />
      </header>
      <div className="hours-metrics">
        <div><span>Contratadas</span><strong>{contracted}h</strong></div>
        <div><span>Consumidas</span><strong>{consumed}h</strong></div>
        <div><span>Restantes</span><strong>{remaining}h</strong></div>
        <div><span>Rentáveis</span><strong>{billable}h</strong></div>
        <div><span>Não rentáveis</span><strong>{nonBillable}h</strong></div>
      </div>
      <p className="context-note">
        Consumo de horas mede esforço e orçamento. Não representa automaticamente avanço físico entregue.
      </p>
    </article>
  );
}

export function DocumentCenter() {
  const categories = ["LPN", "POP", "Plano de Cutover", "Especificações", "Evidências", "Atas", "Modelos", "Relatórios", "Outros"];
  return (
    <section className="surface document-center">
      <header className="surface-header">
        <div>
          <span className="eyebrow">Arquivos e evidências</span>
          <h3>Central de documentos</h3>
        </div>
        <button className="primary-btn" disabled title="Aguardando contrato de upload" type="button">
          Enviar documento
        </button>
      </header>
      <div className="document-categories">
        {categories.map((category) => <span key={category}>{category}</span>)}
      </div>
      <EmptyState
        title="Integração documental pendente"
        description="O backend ainda não possui upload, versionamento e download. O contrato necessário está documentado."
      />
    </section>
  );
}

export function WeeklyClosingWizard({
  step,
  setStep,
  projectName,
  period,
  hasCycle,
  mode,
  setMode,
  manualItems,
  aiReady,
  dataReady,
  validationIssues,
  validationWarnings,
  report,
  reviewed,
  published,
  setReviewed,
  onCreateCycle,
  onOpenAi,
  onGenerateReport,
  onOpenReport,
  onPublish,
}: {
  step: number;
  setStep: (step: number) => void;
  projectName: string;
  period: string;
  hasCycle: boolean;
  mode: "ai" | "manual" | null;
  setMode: (mode: "ai" | "manual") => void;
  manualItems: Array<{
    id: string;
    label: string;
    description: string;
    count: number;
    checked: boolean;
    onToggle: () => void;
    onAdd: () => void;
  }>;
  aiReady: boolean;
  dataReady: boolean;
  validationIssues: string[];
  validationWarnings: string[];
  report?: { status: string; latest_content?: string | null };
  reviewed: boolean;
  published: boolean;
  setReviewed: (reviewed: boolean) => void;
  onCreateCycle: () => void;
  onOpenAi: () => void;
  onGenerateReport: () => void;
  onOpenReport: () => void;
  onPublish: () => void;
}) {
  const steps = ["Período", "Forma de preenchimento", "Dados da semana", "Validação", "Revisão humana", "Publicação"];
  const { completed, maxAccessibleStep } = closingProgress({
    hasCycle,
    mode,
    dataReady,
    blockingIssueCount: validationIssues.length,
    reviewed,
    published,
  });

  return (
    <section className="surface closing-wizard">
      <ol className="wizard-steps" aria-label="Etapas do fechamento semanal">
        {steps.map((label, index) => (
          <li
            className={
              step === index + 1
                ? "active"
                : completed[index]
                  ? "complete"
                  : index + 1 > maxAccessibleStep
                    ? "locked"
                    : ""
            }
            key={label}
          >
            <button
              disabled={index + 1 > maxAccessibleStep}
              onClick={() => setStep(index + 1)}
              type="button"
            >
              <span>{completed[index] ? "✓" : index + 1}</span>{label}
            </button>
          </li>
        ))}
      </ol>
      <div className="wizard-content">
        <span className="eyebrow">Etapa {step} de 6</span>
        {step === 1 && (
          <>
            <h3>Confirme o projeto e o período</h3>
            <div className={`closing-period-card ${hasCycle ? "ready" : "missing"}`}>
              <div>
                <span>Projeto</span>
                <strong>{projectName || "Nenhum projeto selecionado"}</strong>
              </div>
              <div>
                <span>Ciclo de status</span>
                <strong>{period}</strong>
              </div>
              <b>{hasCycle ? "Pronto" : "Ciclo obrigatório"}</b>
            </div>
            {!hasCycle && <p>Crie um ciclo para definir exatamente qual semana será fechada.</p>}
          </>
        )}
        {step === 2 && (
          <>
            <h3>Como deseja preencher o fechamento?</h3>
            <p>Os dois caminhos terminam na mesma validação e revisão humana.</p>
            <div className="closing-mode-grid">
              <button
                className={mode === "ai" ? "selected" : ""}
                onClick={() => setMode("ai")}
                type="button"
              >
                <span className="mode-icon">IA</span>
                <strong>Preencher com IA</strong>
                <small>Cole uma reunião, e-mail ou anotação. A IA organiza os dados para você revisar.</small>
                <b>{mode === "ai" ? "Selecionado" : "Escolher IA"}</b>
              </button>
              <button
                className={mode === "manual" ? "selected" : ""}
                onClick={() => setMode("manual")}
                type="button"
              >
                <span className="mode-icon">✓</span>
                <strong>Preencher manualmente</strong>
                <small>Revise cada categoria, cadastre o que faltar e confirme até concluir o checklist.</small>
                <b>{mode === "manual" ? "Selecionado" : "Escolher manual"}</b>
              </button>
            </div>
          </>
        )}
        {step === 3 && mode === "ai" && (
          <>
            <h3>Preenchimento assistido por IA</h3>
            {aiReady ? (
              <div className="closing-success">
                <strong>Dados aplicados ao projeto.</strong>
                <span>A IA preencheu o rascunho e os registros já podem ser validados.</span>
              </div>
            ) : (
              <div className="closing-ai-callout">
                <div>
                  <strong>Abra o assistente e cole as informações da semana.</strong>
                  <span>Você voltará automaticamente para a validação depois de confirmar o rascunho.</span>
                </div>
                <button className="primary-btn" onClick={onOpenAi} type="button">Abrir assistente de IA</button>
              </div>
            )}
          </>
        )}
        {step === 3 && mode === "manual" && (
          <>
            <h3>Revise os dados da semana</h3>
            <p>Cadastre o que estiver faltando e marque cada categoria como revisada, mesmo quando não houver registros.</p>
            <div className="manual-closing-list">
              {manualItems.map((item) => (
                <div className={item.checked ? "checked" : ""} key={item.id}>
                  <label>
                    <input checked={item.checked} onChange={item.onToggle} type="checkbox" />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                  </label>
                  <div>
                    <b>{item.count} registro(s)</b>
                    <button className="secondary-btn" onClick={item.onAdd} type="button">Adicionar</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="checklist-progress">
              {manualItems.filter((item) => item.checked).length} de {manualItems.length} categorias revisadas
            </p>
          </>
        )}
        {step === 3 && (
          mode === null && <p>Escolha primeiro a forma de preenchimento.</p>
        )}
        {step === 4 && (
          <>
            <h3>Validação de consistência</h3>
            {validationIssues.length ? (
              <>
                <p>Corrija os pontos abaixo antes de gerar o relatório.</p>
                <ul className="validation-list blocking">{validationIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
              </>
            ) : (
              <div className="closing-success">
                <strong>Dados consistentes.</strong>
                <span>O fechamento está pronto para gerar o rascunho do relatório.</span>
              </div>
            )}
            {!!validationWarnings.length && (
              <>
                <p>Confira também estes pontos de atenção. Eles não bloqueiam o fechamento.</p>
                <ul className="validation-list">{validationWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
              </>
            )}
          </>
        )}
        {step === 5 && (
          <>
            <h3>Revise o relatório final</h3>
            {report ? (
              <>
                <div className="closing-report-preview">
                  <div><span>Situação</span><strong>{report.status}</strong></div>
                  <p>{report.latest_content || "O relatório foi gerado sem conteúdo textual para este período."}</p>
                </div>
                {reviewed ? (
                  <div className="closing-success"><strong>Revisão confirmada.</strong><span>Você já pode avançar para a publicação.</span></div>
                ) : (
                  <p>Confira o conteúdo completo e confirme que ele está pronto para aprovação.</p>
                )}
              </>
            ) : (
              <p>O relatório ainda não foi gerado. Volte à validação e gere o rascunho.</p>
            )}
          </>
        )}
        {step === 6 && (
          <>
            <h3>{published ? "Fechamento concluído" : "Publicação no portal"}</h3>
            {published ? (
              <div className="closing-success">
                <strong>Versão aprovada e registrada no histórico.</strong>
                <span>O fechamento deste período está concluído no portal.</span>
              </div>
            ) : (
              <div className="closing-publish-summary">
                <p>Ao publicar, o relatório será aprovado e preservado no histórico do projeto.</p>
                <small>Envio por PDF, e-mail ou link externo ainda não está configurado no backend.</small>
              </div>
            )}
          </>
        )}
        <div className="wizard-actions">
          {step > 1 && <button className="secondary-btn" onClick={() => setStep(step - 1)} type="button">Voltar</button>}
          {step === 1 && (
            hasCycle
              ? <button className="primary-btn" onClick={() => setStep(2)} type="button">Continuar</button>
              : <button className="primary-btn" onClick={onCreateCycle} type="button">Criar ciclo</button>
          )}
          {step === 2 && <button className="primary-btn" disabled={!mode} onClick={() => setStep(3)} type="button">Continuar</button>}
          {step === 3 && <button className="primary-btn" disabled={!dataReady} onClick={() => setStep(4)} type="button">Validar dados</button>}
          {step === 4 && (
            <button
              className="primary-btn"
              disabled={!dataReady || validationIssues.length > 0}
              onClick={report ? () => setStep(5) : onGenerateReport}
              type="button"
            >
              {report ? "Revisar rascunho" : "Gerar rascunho do relatório"}
            </button>
          )}
          {step === 5 && report && (
            <>
              <button className="secondary-btn" onClick={onOpenReport} type="button">Abrir relatório completo</button>
              {reviewed
                ? <button className="primary-btn" onClick={() => setStep(6)} type="button">Ir para publicação</button>
                : <button className="primary-btn" onClick={() => setReviewed(true)} type="button">Confirmar revisão</button>}
            </>
          )}
          {step === 6 && (
            <button className="primary-btn" disabled={!reviewed || !report || published} onClick={onPublish} type="button">
              {published ? "Publicado" : "Aprovar e publicar no portal"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export function StatusReview() {
  return (
    <div>
      <h3>Revisão humana</h3>
      <div className="review-columns">
        <div><span>Dados originais</span><p>Registros operacionais do período.</p></div>
        <div><span>Sugestão da IA</span><p>Texto sugerido, sujeito a conferência.</p></div>
        <div><span>Conteúdo final</span><p>Versão editada e aprovada pelo responsável.</p></div>
      </div>
    </div>
  );
}

export function StatusHistory({
  reports,
}: {
  reports: Array<{
    id: string;
    period_start: string;
    period_end: string;
    status: string;
    approved_by?: string | null;
    approved_at?: string | null;
  }>;
}) {
  return (
    <section className="surface">
      <header className="surface-header"><div><span className="eyebrow">Rastreabilidade</span><h3>Histórico de status</h3></div></header>
      {!reports.length ? <EmptyState title="Nenhum status publicado" description="Os fechamentos aprovados formarão a linha do tempo." /> : (
        <ol className="status-timeline">
          {reports.map((report) => (
            <li key={report.id}>
              <span />
              <div>
                <strong>{new Date(`${report.period_start}T12:00:00`).toLocaleDateString("pt-BR")} a {new Date(`${report.period_end}T12:00:00`).toLocaleDateString("pt-BR")}</strong>
                <p>{report.status} · {report.approved_by || "Aguardando aprovação"}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><span aria-hidden="true">—</span><strong>{title}</strong><p>{description}</p>{action}</div>;
}

export function LoadingState() {
  return <div className="loading-state" aria-live="polite" aria-busy="true"><i /><i /><i /><span>Sincronizando dados do portal...</span></div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-state" role="alert"><strong>Não foi possível concluir a operação.</strong><span>{message}</span>{retry && <button className="secondary-btn" onClick={retry} type="button">Tentar novamente</button>}</div>;
}

export function FilterBar({
  filters,
}: {
  filters: Array<{
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
  }>;
}) {
  return (
    <div className="filter-bar" aria-label="Filtros disponíveis">
      {filters.map((filter) => (
        <label key={filter.label}>
          <span>{filter.label}</span>
          <select value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
            <option value="">Todos</option>
            {filter.options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal" role="presentation">
      <div aria-labelledby="confirm-dialog-title" aria-modal="true" className="modal-card confirm-dialog" role="dialog">
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{description}</p>
        <div className="modal-actions">
          <button className="secondary-btn" onClick={onCancel} type="button">Cancelar</button>
          <button className="danger-btn" onClick={onConfirm} type="button">Confirmar</button>
        </div>
      </div>
    </div>
  );
}
