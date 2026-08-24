"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import styles from "../lpn.module.css";
import { apiRequest } from "../_lib/api";
import type {
  Client,
  ContentItem,
  ContentKind,
  Demand,
  GeneratedDocument,
  Lpn,
  Organization,
  User,
  ValidationResult,
} from "../_lib/types";

const CONTENT_SECTIONS: Array<{ kind: ContentKind; label: string; prefix: string }> = [
  { kind: "storytelling", label: "Processo atual", prefix: "ATUAL" },
  { kind: "objective", label: "Objetivo e resultados", prefix: "OBJ" },
  { kind: "requirement", label: "Processo proposto", prefix: "PROP" },
  { kind: "constraint", label: "Restrições e impeditivos", prefix: "REST" },
  { kind: "pending_issue", label: "Informações complementares", prefix: "INFO" },
  { kind: "acceptance_criterion", label: "Critérios de aceite", prefix: "ACEITE" },
];

const STATUS_FLOW = [
  "draft",
  "in_discovery",
  "as_is_validation",
  "as_is_approved",
  "to_be_building",
  "to_be_validation",
  "functional_review",
  "technical_review",
  "waiting_approval",
  "approved",
];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}

export function LpnWorkspace() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [lpns, setLpns] = useState<Lpn[]>([]);
  const [selectedLpnId, setSelectedLpnId] = useState("");
  const [content, setContent] = useState<ContentItem[]>([]);
  const [activeKind, setActiveKind] = useState<ContentKind>("storytelling");
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [approvalStepId, setApprovalStepId] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [aiSuggestionId, setAiSuggestionId] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedLpn = lpns.find((item) => item.id === selectedLpnId) ?? lpns[0];
  const version = selectedLpn?.current_version;
  const selectedDemand = demands.find((item) => item.id === selectedLpn?.demand_id);
  const visibleContent = useMemo(
    () => content.filter((item) => item.kind === activeKind),
    [activeKind, content],
  );

  const loadOrganizationData = useCallback(
    async (authToken: string, activeOrganizationId: string) => {
      const [clientData, demandData, lpnData, currentUser] = await Promise.all([
        apiRequest<Client[]>("/organizations/clients", authToken, activeOrganizationId),
        apiRequest<Demand[]>("/lpns/demands", authToken, activeOrganizationId),
        apiRequest<Lpn[]>("/lpns", authToken, activeOrganizationId),
        apiRequest<User>("/auth/me", authToken, activeOrganizationId),
      ]);
      setClients(clientData);
      setDemands(demandData);
      setLpns(lpnData);
      setUser(currentUser);
      setSelectedLpnId((current) => current || lpnData[0]?.id || "");
    },
    [],
  );

  useEffect(() => {
    const storedToken = window.localStorage.getItem("maxicon_portal_token") ?? "";
    setToken(storedToken);
    if (!storedToken) {
      setLoading(false);
      return;
    }
    apiRequest<Organization[]>("/organizations", storedToken)
      .then(async (items) => {
        setOrganizations(items);
        const active = items[0]?.id || "";
        setOrganizationId(active);
        if (active) await loadOrganizationData(storedToken, active);
      })
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }, [loadOrganizationData]);

  useEffect(() => {
    if (!version || !token || !organizationId) {
      setContent([]);
      return;
    }
    Promise.all([
      apiRequest<ContentItem[]>(
        `/lpns/versions/${version.id}/content`,
        token,
        organizationId,
      ),
      apiRequest<Array<{
        id: string;
        assigned_to_current_user: boolean;
        current_user_decision?: string | null;
      }>>(`/lpns/versions/${version.id}/approval`, token, organizationId),
      apiRequest<GeneratedDocument[]>(
        `/lpns/versions/${version.id}/documents`,
        token,
        organizationId,
      ),
    ])
      .then(([items, approvalSteps, generated]) => {
        setContent(items);
        setDocuments(generated);
        const pendingStep = approvalSteps.find(
          (item) => item.assigned_to_current_user && !item.current_user_decision,
        );
        setApprovalStepId(pendingStep?.id || "");
      })
      .catch((caught) => setError(errorMessage(caught)));
  }, [organizationId, token, version?.id]);

  async function refresh() {
    if (!token || !organizationId) return;
    await loadOrganizationData(token, organizationId);
  }

  async function execute(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await execute(async () => {
      await apiRequest("/organizations/clients", token, organizationId, {
        method: "POST",
        body: JSON.stringify({ name: form.get("name") }),
      });
      event.currentTarget.reset();
      await refresh();
    }, "Cliente cadastrado.");
  }

  async function createDemand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await execute(async () => {
      const demand = await apiRequest<Demand>("/lpns/demands", token, organizationId, {
        method: "POST",
        body: JSON.stringify({
          client_id: form.get("client_id"),
          title: form.get("title"),
          external_number: form.get("external_number") || null,
          business_area: form.get("business_area"),
          business_process: form.get("business_process"),
          system_product: form.get("system_product"),
          requester_name: form.get("requester_name"),
          product_owner_name: form.get("product_owner_name") || null,
          priority: form.get("priority"),
          priority_reason: form.get("priority_reason") || null,
          discovery_date: new Date().toISOString().slice(0, 10),
          demand_type: form.get("demand_type"),
        }),
      });
      const lpn = await apiRequest<Lpn>(
        `/lpns/from-demand/${demand.id}`,
        token,
        organizationId,
        { method: "POST" },
      );
      setSelectedLpnId(lpn.id);
      event.currentTarget.reset();
      await refresh();
    }, "Demanda e LPN criadas.");
  }

  async function createContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!version) return;
    const form = new FormData(event.currentTarget);
    const section = CONTENT_SECTIONS.find((item) => item.kind === activeKind)!;
    const count = content.filter((item) => item.kind === activeKind).length + 1;
    const payload = { description: form.get("description") };
    await execute(async () => {
      const created = await apiRequest<ContentItem>(
        `/lpns/versions/${version.id}/content`,
        token,
        organizationId,
        {
          method: "POST",
          body: JSON.stringify({
            kind: activeKind,
            code: `${section.prefix}-${String(count).padStart(3, "0")}`,
            title: form.get("title"),
            payload,
            sort_order: count,
          }),
        },
      );
      setContent((current) => [...current, created]);
      event.currentTarget.reset();
    }, `${section.label}: item adicionado.`);
  }

  async function saveDiagram(processType: "as_is" | "to_be", rawModel: string) {
    if (!version) return;
    await execute(async () => {
      const model = JSON.parse(rawModel) as Record<string, unknown>;
      await apiRequest(`/lpns/versions/${version.id}/diagrams`, token, organizationId, {
        method: "PUT",
        body: JSON.stringify({
          process_type: processType,
          name: processType === "as_is" ? "Processo atual" : "Processo proposto",
          model,
        }),
      });
    }, `Fluxo ${processType.toUpperCase()} salvo.`);
  }

  async function validate() {
    if (!version) return;
    await execute(async () => {
      const result = await apiRequest<ValidationResult[]>(
        `/lpns/versions/${version.id}/validate`,
        token,
        organizationId,
        { method: "POST" },
      );
      setValidations(result);
    }, "Checklist atualizado.");
  }

  async function uploadEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!version || !selectedLpn) return;
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return;
    const upload = new FormData();
    upload.append("file", file);
    await execute(async () => {
      const uploaded = await apiRequest<{ version_id: string }>(
        `/lpns/${selectedLpn.id}/attachments`,
        token,
        organizationId,
        { method: "POST", body: upload },
      );
      await apiRequest(`/lpns/versions/${version.id}/evidences`, token, organizationId, {
        method: "POST",
        body: JSON.stringify({
          attachment_version_id: uploaded.version_id,
          content_item_id: form.get("content_item_id") || null,
          description: form.get("description") || null,
        }),
      });
      event.currentTarget.reset();
    }, "Evidência anexada e vinculada à versão.");
  }

  async function advanceStatus() {
    if (!version) return;
    const currentIndex = STATUS_FLOW.indexOf(version.status);
    const nextStatus = STATUS_FLOW[currentIndex + 1];
    if (!nextStatus) return;
    await execute(async () => {
      await apiRequest(`/lpns/versions/${version.id}/transition`, token, organizationId, {
        method: "POST",
        body: JSON.stringify({ to_status: nextStatus }),
      });
      await refresh();
    }, `LPN avançou para ${nextStatus}.`);
  }

  async function configureApproval() {
    if (!version || !user) return;
    await execute(async () => {
      const result = await apiRequest<{ id: string }>(
        `/lpns/versions/${version.id}/approval`,
        token,
        organizationId,
        {
        method: "POST",
        body: JSON.stringify({ approver_ids: [user.id], required_approvals: 1 }),
        },
      );
      setApprovalStepId(result.id);
    }, "Aprovação simples configurada para o usuário atual.");
  }

  async function approveCurrentStep() {
    if (!approvalStepId) return;
    await execute(async () => {
      await apiRequest(
        `/lpns/approval/${approvalStepId}/decision`,
        token,
        organizationId,
        { method: "POST", body: JSON.stringify({ decision: "approved" }) },
      );
    }, "Decisão de aprovação registrada.");
  }

  async function requestAiSuggestion() {
    if (!version || !aiInput.trim()) return;
    await execute(async () => {
      const result = await apiRequest<{
        analysis: string;
        suggestion_ids: string[];
        questions: Array<{ question: string }>;
      }>(`/lpns/versions/${version.id}/ai/preview`, token, organizationId, {
        method: "POST",
        body: JSON.stringify({ use_case: activeKind, input_text: aiInput }),
      });
      setAiAnalysis(
        result.questions.length
          ? `${result.analysis} ${result.questions.map((item) => item.question).join(" ")}`
          : result.analysis,
      );
      setAiSuggestionId(result.suggestion_ids[0] || "");
    }, "Análise da IA concluída; revise antes de aplicar.");
  }

  async function acceptAiSuggestion() {
    if (!aiSuggestionId || !version) return;
    await execute(async () => {
      await apiRequest(
        `/lpns/ai/suggestions/${aiSuggestionId}/decision`,
        token,
        organizationId,
        { method: "POST", body: JSON.stringify({ decision: "accepted" }) },
      );
      const updated = await apiRequest<ContentItem[]>(
        `/lpns/versions/${version.id}/content`,
        token,
        organizationId,
      );
      setContent(updated);
      setAiSuggestionId("");
      setAiInput("");
    }, "Sugestão revisada e incorporada à versão.");
  }

  async function generateDocuments() {
    if (!version) return;
    await execute(async () => {
      const result = await apiRequest<GeneratedDocument[]>(
        `/lpns/versions/${version.id}/documents`,
        token,
        organizationId,
        {
          method: "POST",
          body: JSON.stringify({ formats: ["docx", "pdf", "json", "svg"] }),
        },
      );
      setDocuments(result);
    }, "Documentos gerados.");
  }

  async function cloneApprovedVersion() {
    if (!version) return;
    await execute(async () => {
      await apiRequest(`/lpns/versions/${version.id}/clone`, token, organizationId, {
        method: "POST",
        body: JSON.stringify({ change_summary: "Nova revisão criada pelo portal" }),
      });
      await refresh();
    }, "Nova versão criada a partir da aprovada.");
  }

  async function downloadDocument(document: GeneratedDocument) {
    await execute(async () => {
      const response = await fetch(`/api/v1/lpns/documents/${document.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Organization-ID": organizationId,
        },
      });
      if (!response.ok) throw new Error("Não foi possível baixar o documento.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = document.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    }, `${document.filename} baixado.`);
  }

  if (loading) return <main className={styles.centerState}>Preparando o módulo de LPN...</main>;
  if (!token) {
    return (
      <main className={styles.centerState}>
        <h1>Entre no portal para acessar as LPNs</h1>
        <Link href="/">Voltar para o login</Link>
      </main>
    );
  }

  return (
    <main className={styles.workspace}>
      <header className={styles.header}>
        <div>
          <span>Portal Inteligente de Projetos</span>
          <h1>Levantamentos LPN</h1>
          <p>Documento funcional do processo atual ao aceite do cliente.</p>
        </div>
        <div className={styles.headerActions}>
          <select
            aria-label="Organização ativa"
            value={organizationId}
            onChange={(event) => {
              const next = event.target.value;
              setOrganizationId(next);
              void loadOrganizationData(token, next);
            }}
          >
            {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <Link href="/">Gestão de projetos</Link>
        </div>
      </header>

      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {notice ? <div className={styles.notice} role="status">{notice}</div> : null}

      <section className={styles.grid}>
        <aside className={styles.sidebar}>
          <h2>LPNs</h2>
          <select
            aria-label="LPN selecionada"
            value={selectedLpn?.id || ""}
            onChange={(event) => setSelectedLpnId(event.target.value)}
          >
            {!lpns.length ? <option value="">Nenhuma LPN</option> : null}
            {lpns.map((item) => {
              const demand = demands.find((candidate) => candidate.id === item.demand_id);
              return <option key={item.id} value={item.id}>{demand?.title || item.id}</option>;
            })}
          </select>
          <div className={styles.summary}>
            <span>{selectedDemand?.business_area || "Sem demanda selecionada"}</span>
            <strong>{selectedDemand?.title || "Crie a primeira LPN"}</strong>
            <small>Versão {version?.version_number || 0} · {version?.status || "rascunho"}</small>
          </div>
          <details>
            <summary>Novo cliente</summary>
            <form onSubmit={createClient} className={styles.stackForm}>
              <input name="name" required placeholder="Nome do cliente" />
              <button disabled={busy} type="submit">Cadastrar cliente</button>
            </form>
          </details>
          <details open={!lpns.length}>
            <summary>Nova demanda</summary>
            <form onSubmit={createDemand} className={styles.stackForm}>
              <select name="client_id" required>
                <option value="">Selecione o cliente</option>
                {clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <input name="external_number" placeholder="Número da solicitação" />
              <input name="title" required placeholder="Processo / título da demanda" />
              <input name="business_area" required placeholder="Área de negócio" />
              <input name="business_process" required placeholder="Processo de negócio" />
              <input name="system_product" required placeholder="Módulos envolvidos" />
              <input name="product_owner_name" placeholder="Product Owner" />
              <input name="requester_name" required placeholder="Designação de gerenciamento" />
              <select name="priority" defaultValue="medium">
                <option value="low">Baixa</option><option value="medium">Média</option>
                <option value="high">Alta</option><option value="critical">Crítica</option>
              </select>
              <input name="priority_reason" placeholder="Justificativa da prioridade" />
              <select name="demand_type" defaultValue="improvement">
                <option value="correction">Correção</option>
                <option value="improvement">Melhoria</option>
                <option value="new_feature">Nova funcionalidade</option>
                <option value="report">Relatório</option>
                <option value="integration">Integração</option>
                <option value="legal">Adequação legal</option>
              </select>
              <button disabled={busy || !clients.length} type="submit">Criar demanda e LPN</button>
            </form>
          </details>
        </aside>

        <section className={styles.contentArea}>
          {!version ? (
            <div className={styles.empty}>Cadastre um cliente e crie uma demanda para começar.</div>
          ) : (
            <>
              <section className={styles.generalData}>
                <div>
                  <span>Cliente</span>
                  <strong>{clients.find((item) => item.id === selectedDemand?.client_id)?.name}</strong>
                </div>
                <div><span>Solicitação</span><strong>{selectedDemand?.external_number || "Não informada"}</strong></div>
                <div><span>Módulos envolvidos</span><strong>{selectedDemand?.system_product}</strong></div>
                <div><span>Processo</span><strong>{selectedDemand?.title}</strong></div>
                <div><span>Product Owner</span><strong>{selectedDemand?.product_owner_name || "Não informado"}</strong></div>
                <div><span>Analista de Negócios</span><strong>{user?.full_name}</strong></div>
              </section>
              <nav className={styles.sectionTabs} aria-label="Seções da LPN">
                {CONTENT_SECTIONS.map((section) => (
                  <button
                    className={activeKind === section.kind ? styles.activeTab : ""}
                    key={section.kind}
                    onClick={() => setActiveKind(section.kind)}
                    type="button"
                  >
                    {section.label}
                    <span>{content.filter((item) => item.kind === section.kind).length}</span>
                  </button>
                ))}
              </nav>
              <div className={styles.editorGrid}>
                <section className={styles.panel}>
                  <h2>{CONTENT_SECTIONS.find((item) => item.kind === activeKind)?.label}</h2>
                  <form onSubmit={createContent} className={styles.stackForm}>
                    <input name="title" required placeholder="Título do trecho" />
                    <textarea
                      name="description"
                      required
                      rows={9}
                      placeholder="Descreva esta parte da LPN em linguagem funcional, como ela aparecerá no documento."
                    />
                    <button disabled={busy || version.status === "approved"} type="submit">Adicionar ao documento</button>
                  </form>
                  <div className={styles.itemList}>
                    {visibleContent.map((item) => (
                      <article key={item.id}>
                        <span>{item.code}</span><strong>{item.title}</strong>
                        <p>{String(item.payload.description || item.payload.problem || item.payload.responsibility || "Conteúdo estruturado")}</p>
                      </article>
                    ))}
                    {!visibleContent.length ? <p>Nenhum item nesta seção.</p> : null}
                  </div>
                </section>
                <ProcessPanel disabled={busy || version.status === "approved"} onSave={saveDiagram} />
              </div>
              <section className={styles.aiPanel}>
                <div>
                  <span>IA rastreável</span>
                  <h2>Apoio para {CONTENT_SECTIONS.find((item) => item.kind === activeKind)?.label}</h2>
                  <p>A sugestão só entra na LPN depois da sua decisão.</p>
                </div>
                <textarea
                  onChange={(event) => setAiInput(event.target.value)}
                  placeholder="Cole o relato, ata ou informação confirmada..."
                  rows={4}
                  value={aiInput}
                />
                <div className={styles.aiActions}>
                  <button disabled={busy || aiInput.trim().length < 20} onClick={requestAiSuggestion} type="button">
                    Analisar conteúdo
                  </button>
                  <button disabled={busy || !aiSuggestionId} onClick={acceptAiSuggestion} type="button">
                    Aceitar sugestão
                  </button>
                </div>
                {aiAnalysis ? <p className={styles.aiAnalysis}>{aiAnalysis}</p> : null}
              </section>
              <section className={styles.supportGrid}>
                <form className={styles.panel} onSubmit={uploadEvidence}>
                  <h2>Imagens e evidências do processo</h2>
                  <p>As telas anexadas entram no documento como referência do processo atual.</p>
                  <div className={styles.stackForm}>
                    <input name="file" required type="file" />
                    <select name="content_item_id">
                      <option value="">Evidência geral da versão</option>
                      {content.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.title}</option>)}
                    </select>
                    <input name="description" placeholder="Descrição da evidência" />
                    <button disabled={busy || version.status === "approved"} type="submit">Enviar evidência</button>
                  </div>
                </form>
              </section>
              <section className={styles.governance}>
                <div>
                  <h2>Governança</h2>
                  <p>Valide o conteúdo antes de avançar. Aprovação congela toda a versão.</p>
                </div>
                <div className={styles.governanceActions}>
                  <button disabled={busy} onClick={validate} type="button">Executar checklist</button>
                  <button disabled={busy} onClick={configureApproval} type="button">Configurar aprovação simples</button>
                  <button disabled={busy || !approvalStepId} onClick={approveCurrentStep} type="button">Registrar meu aceite</button>
                  <button disabled={busy || version.status === "approved"} onClick={advanceStatus} type="button">Avançar status</button>
                  <button disabled={busy || version.status !== "approved"} onClick={generateDocuments} type="button">Gerar documentos</button>
                  <button disabled={busy || version.status !== "approved"} onClick={cloneApprovedVersion} type="button">Criar nova versão</button>
                </div>
              </section>
              {validations.length ? (
                <ul className={styles.validationList}>
                  {validations.map((item) => (
                    <li className={item.status === "failed" ? styles.failed : styles.passed} key={item.id}>
                      <strong>{item.rule_code}</strong> {item.message}
                    </li>
                  ))}
                </ul>
              ) : null}
              {documents.length ? (
                <div className={styles.documents}>
                  {documents.map((item) => (
                    <button onClick={() => void downloadDocument(item)} key={item.id} type="button">
                      {item.filename}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </section>
      </section>
    </main>
  );
}

function ProcessPanel({
  disabled,
  onSave,
}: {
  disabled: boolean;
  onSave: (type: "as_is" | "to_be", model: string) => Promise<void>;
}) {
  const [steps, setSteps] = useState("");
  const parsedSteps = useMemo(
    () => steps.split("\n").map((step) => step.trim()).filter(Boolean),
    [steps],
  );

  function saveProcess() {
    const nodes = parsedSteps.map((name, index) => ({
      id: `step-${index + 1}`,
      type: index === 0 ? "start" : index === parsedSteps.length - 1 ? "end" : "activity",
      lane_id: "process",
      name,
    }));
    const edges = nodes.slice(0, -1).map((node, index) => ({
      id: `edge-${index + 1}`,
      source: node.id,
      target: nodes[index + 1].id,
    }));
    const model = JSON.stringify({
      lanes: [{ id: "process", name: "Processo proposto" }],
      nodes,
      edges,
      layout: {},
      metadata: { editor: "simple-steps-v1" },
    });
    void onSave("to_be", model);
  }

  return (
    <section className={styles.panel}>
      <h2>Diagrama do processo</h2>
      <p>Informe uma etapa por linha, na ordem em que ela acontece.</p>
      <textarea
        aria-label="Etapas do processo proposto"
        onChange={(event) => setSteps(event.target.value)}
        placeholder={"VPE020 – Consultar ordem de carregamento\nLayout VPE081\nIncluir novas informações\nImprimir relatório"}
        rows={10}
        value={steps}
      />
      <div className={styles.simpleFlow} aria-label="Pré-visualização do processo">
        {parsedSteps.map((step, index) => (
          <div key={`${step}-${index}`}>
            <span>{step}</span>
            {index < parsedSteps.length - 1 ? <b aria-hidden="true">→</b> : null}
          </div>
        ))}
        {!parsedSteps.length ? <p>As etapas aparecerão aqui como no diagrama da LPN.</p> : null}
      </div>
      <button disabled={disabled || parsedSteps.length < 2} onClick={saveProcess} type="button">
        Salvar diagrama proposto
      </button>
    </section>
  );
}
