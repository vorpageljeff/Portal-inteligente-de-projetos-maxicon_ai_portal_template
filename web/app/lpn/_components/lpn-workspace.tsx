"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import styles from "../lpn.module.css";
import { apiRequest } from "../_lib/api";
import {
  LpnBlockEditor,
  type LpnBrief,
  type NewBlock,
} from "./lpn-block-editor";
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

const SECTION_POSITION = new Map(
  CONTENT_SECTIONS.map((section, index) => [section.kind, index]),
);

function sortContentItems(items: ContentItem[]) {
  const hasVisualOrder = items.some((item) => typeof item.payload.editor_order === "number");
  return [...items].sort((left, right) => {
    if (hasVisualOrder) {
      const leftOrder = Number(left.payload.editor_order ?? Number.MAX_SAFE_INTEGER);
      const rightOrder = Number(right.payload.editor_order ?? Number.MAX_SAFE_INTEGER);
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    }
    const sectionDifference =
      (SECTION_POSITION.get(left.kind) ?? 99) - (SECTION_POSITION.get(right.kind) ?? 99);
    return sectionDifference || left.sort_order - right.sort_order;
  });
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
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [approvalStepId, setApprovalStepId] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedLpn = lpns.find((item) => item.id === selectedLpnId) ?? lpns[0];
  const version = selectedLpn?.current_version;
  const selectedDemand = demands.find((item) => item.id === selectedLpn?.demand_id);
  const blockingFailures = validations.filter(
    (item) => item.status === "failed" && item.severity === "blocking",
  );
  const warningFailures = validations.filter(
    (item) => item.status === "failed" && item.severity === "warning",
  );
  const passedValidations = validations.filter((item) => item.status !== "failed");

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
        setContent(sortContentItems(items));
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

  async function createContent(block: NewBlock) {
    if (!version) return;
    const section = CONTENT_SECTIONS.find((item) => item.kind === block.kind)!;
    const count = content.filter((item) => item.kind === block.kind).length + 1;
    await execute(async () => {
      const created = await apiRequest<ContentItem>(
        `/lpns/versions/${version.id}/content`,
        token,
        organizationId,
        {
          method: "POST",
          body: JSON.stringify({
            kind: block.kind,
            code: `${section.prefix}-${String(count).padStart(3, "0")}`,
            title: block.title,
            payload: {
              description: block.description,
              editor_order: content.length + 1,
              origin: "user_input",
              human_reviewed: true,
            },
            sort_order: content.length + 1,
          }),
        },
      );
      setContent((current) => [...current, created]);
      setValidations([]);
    }, "Bloco adicionado ao documento.");
  }

  async function saveContentBlock(
    item: ContentItem,
    title: string,
    description: string,
    locked: boolean,
  ) {
    if (!version) return;
    await execute(async () => {
      const updated = await apiRequest<ContentItem>(
        `/lpns/versions/${version.id}/content/${item.id}`,
        token,
        organizationId,
        {
          method: "PUT",
          body: JSON.stringify({
            kind: item.kind,
            code: item.code,
            title,
            payload: {
              ...item.payload,
              description,
              locked,
              human_reviewed: true,
              requires_human_validation: false,
            },
            sort_order: item.sort_order,
          }),
        },
      );
      setContent((current) => current.map((candidate) =>
        candidate.id === item.id ? updated : candidate,
      ));
      setValidations([]);
    }, "Bloco salvo e marcado como revisado.");
  }

  async function deleteContentBlock(item: ContentItem) {
    if (!version) return;
    await execute(async () => {
      await apiRequest(
        `/lpns/versions/${version.id}/content/${item.id}`,
        token,
        organizationId,
        { method: "DELETE" },
      );
      setContent((current) => current.filter((candidate) => candidate.id !== item.id));
      setValidations([]);
    }, "Bloco removido do documento.");
  }

  async function reorderContentBlocks(items: ContentItem[]) {
    if (!version) return;
    await execute(async () => {
      const updated = await Promise.all(items.map((item, index) =>
        apiRequest<ContentItem>(
          `/lpns/versions/${version.id}/content/${item.id}`,
          token,
          organizationId,
          {
            method: "PUT",
            body: JSON.stringify({
              kind: item.kind,
              code: item.code,
              title: item.title,
              payload: { ...item.payload, editor_order: index + 1 },
              sort_order: index + 1,
            }),
          },
        ),
      ));
      setContent(sortContentItems(updated));
      setValidations([]);
    }, "Ordem dos blocos atualizada.");
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
      setValidations([]);
    }, "Evidência anexada e vinculada à versão.");
  }

  async function sendToApproval() {
    if (!version || !user) return;
    await execute(async () => {
      const checks = await apiRequest<ValidationResult[]>(
        `/lpns/versions/${version.id}/validate`,
        token,
        organizationId,
        { method: "POST" },
      );
      setValidations(checks);
      const blockingMessages = checks
        .filter((item) => item.status === "failed" && item.severity === "blocking")
        .map((item) => item.message);
      if (blockingMessages.length) {
        throw new Error(`Antes de enviar para aprovação: ${blockingMessages.join(" ")}`);
      }
      const currentIndex = STATUS_FLOW.indexOf(version.status);
      const approvalIndex = STATUS_FLOW.indexOf("waiting_approval");
      if (currentIndex < 0 || currentIndex > approvalIndex) {
        throw new Error("Esta versão não está em uma etapa que possa ser enviada para aprovação.");
      }
      for (const nextStatus of STATUS_FLOW.slice(currentIndex + 1, approvalIndex + 1)) {
        await apiRequest(`/lpns/versions/${version.id}/transition`, token, organizationId, {
          method: "POST",
          body: JSON.stringify({ to_status: nextStatus }),
        });
      }
      const approval = await apiRequest<{ id: string }>(
        `/lpns/versions/${version.id}/approval`,
        token,
        organizationId,
        {
        method: "POST",
        body: JSON.stringify({ approver_ids: [user.id], required_approvals: 1 }),
        },
      );
      setApprovalStepId(approval.id);
      await refresh();
    }, "LPN verificada e enviada para sua aprovação.");
  }

  async function approveAndFinish() {
    if (!approvalStepId || !version) return;
    await execute(async () => {
      await apiRequest(
        `/lpns/approval/${approvalStepId}/decision`,
        token,
        organizationId,
        { method: "POST", body: JSON.stringify({ decision: "approved" }) },
      );
      await apiRequest(`/lpns/versions/${version.id}/transition`, token, organizationId, {
        method: "POST",
        body: JSON.stringify({ to_status: "approved" }),
      });
      setApprovalStepId("");
      await refresh();
    }, "LPN aprovada. O documento oficial já pode ser gerado.");
  }

  async function generateAiDraft(brief: LpnBrief) {
    if (!version) return;
    await execute(async () => {
      const result = await apiRequest<{
        analysis: string;
        suggestion_ids: string[];
        questions: Array<{ question: string }>;
        suggestions: Array<{ kind: ContentKind }>;
      }>(`/lpns/versions/${version.id}/ai/compose`, token, organizationId, {
        method: "POST",
        body: JSON.stringify(brief),
      });
      if (!result.suggestion_ids.length) {
        throw new Error(result.questions.map((item) => item.question).join(" ") || result.analysis);
      }
      const decisions = await Promise.all(result.suggestion_ids.map((suggestionId) =>
        apiRequest<{ content_item_id?: string | null }>(
          `/lpns/ai/suggestions/${suggestionId}/decision`,
          token,
          organizationId,
          { method: "POST", body: JSON.stringify({ decision: "accepted" }) },
        ),
      ));
      const createdByKind = new Map<ContentKind, string>();
      result.suggestions.forEach((suggestion, index) => {
        const itemId = decisions[index]?.content_item_id;
        if (itemId) createdByKind.set(suggestion.kind, itemId);
      });
      const requirementId = createdByKind.get("requirement");
      const acceptanceId = createdByKind.get("acceptance_criterion");
      if (requirementId && acceptanceId) {
        await apiRequest(`/lpns/versions/${version.id}/links`, token, organizationId, {
          method: "POST",
          body: JSON.stringify({
            source_item_id: requirementId,
            target_item_id: acceptanceId,
            relationship: "validated_by",
          }),
        });
      }
      const updated = await apiRequest<ContentItem[]>(
        `/lpns/versions/${version.id}/content`,
        token,
        organizationId,
      );
      const ordered = sortContentItems(updated);
      setContent(ordered);
      setValidations([]);
      setAiAnalysis(result.analysis);
      const processSteps = [...ordered]
        .reverse()
        .find((item) => item.kind === "requirement" && Array.isArray(item.payload.process_steps))
        ?.payload.process_steps;
      if (Array.isArray(processSteps)) {
        const steps = processSteps.filter((step): step is string => typeof step === "string");
        if (steps.length >= 2) await persistDiagram(steps);
      }
    }, "Rascunho completo criado. Revise e reorganize os blocos.");
  }

  async function persistDiagram(steps: string[]) {
    if (!version) return;
    const nodes = steps.map((name, index) => ({
      id: `step-${index + 1}`,
      type: index === 0 ? "start" : index === steps.length - 1 ? "end" : "activity",
      lane_id: "process",
      name,
    }));
    const edges = nodes.slice(0, -1).map((node, index) => ({
      id: `edge-${index + 1}`,
      source: node.id,
      target: nodes[index + 1].id,
    }));
    await apiRequest(`/lpns/versions/${version.id}/diagrams`, token, organizationId, {
      method: "PUT",
      body: JSON.stringify({
        process_type: "to_be",
        name: "Processo proposto",
        model: {
          lanes: [{ id: "process", name: "Processo proposto" }],
          nodes,
          edges,
          layout: {},
          metadata: { editor: "visual-blocks-v1" },
        },
      }),
    });
  }

  async function saveFlow(steps: string[]) {
    await execute(async () => {
      await persistDiagram(steps);
      const requirement = [...content].reverse().find((item) => item.kind === "requirement");
      if (!version || !requirement) return;
      const updated = await apiRequest<ContentItem>(
        `/lpns/versions/${version.id}/content/${requirement.id}`,
        token,
        organizationId,
        {
          method: "PUT",
          body: JSON.stringify({
            kind: requirement.kind,
            code: requirement.code,
            title: requirement.title,
            payload: {
              ...requirement.payload,
              process_steps: steps,
              human_reviewed: true,
            },
            sort_order: requirement.sort_order,
          }),
        },
      );
      setContent((current) => current.map((item) => item.id === updated.id ? updated : item));
      setValidations([]);
    }, "Fluxo proposto atualizado.");
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
          body: JSON.stringify({ formats: ["docx"] }),
        },
      );
      setDocuments(result);
    }, "Documento oficial gerado.");
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
              <LpnBlockEditor
                busy={busy}
                editable={version.status !== "approved"}
                items={content}
                onAdd={createContent}
                onDelete={deleteContentBlock}
                onGenerate={generateAiDraft}
                onReorder={reorderContentBlocks}
                onSave={saveContentBlock}
                onSaveFlow={saveFlow}
              />
              {aiAnalysis ? <p className={styles.aiAnalysis}>{aiAnalysis}</p> : null}
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
                  <h2>Revisão e geração</h2>
                  <p>Verifique o conteúdo, envie para aprovação e gere o Word oficial.</p>
                </div>
                <div className={styles.governanceActions}>
                  <button disabled={busy} onClick={validate} type="button">1. Verificar LPN</button>
                  <button disabled={busy || version.status === "approved"} onClick={sendToApproval} type="button">2. Enviar para aprovação</button>
                  <button disabled={busy || !approvalStepId} onClick={approveAndFinish} type="button">3. Aprovar LPN</button>
                  <button disabled={busy || version.status !== "approved"} onClick={generateDocuments} type="button">4. Gerar documento</button>
                  <button disabled={busy || version.status !== "approved"} onClick={cloneApprovedVersion} type="button">Criar nova versão</button>
                </div>
              </section>
              {validations.length ? (
                <section className={styles.validationPanel}>
                  <header className={styles.validationHeader}>
                    <div>
                      <h2>Resultado da verificação</h2>
                      <p>
                        {blockingFailures.length
                          ? `${blockingFailures.length} ajuste(s) obrigatório(s) antes da aprovação.`
                          : "A LPN não possui bloqueios para aprovação."}
                      </p>
                    </div>
                    <strong className={blockingFailures.length ? styles.validationBlocked : styles.validationReady}>
                      {blockingFailures.length ? "Ajustes necessários" : "Pronta para avançar"}
                    </strong>
                  </header>
                  {blockingFailures.length || warningFailures.length ? (
                    <ul className={styles.validationList}>
                      {[...blockingFailures, ...warningFailures].map((item) => (
                        <li className={item.severity === "blocking" ? styles.failed : styles.warning} key={item.id}>
                          <span>{item.severity === "blocking" ? "Obrigatório" : "Atenção"}</span>
                          <strong>{item.message}</strong>
                          <small>{item.rule_code}</small>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {passedValidations.length ? (
                    <details className={styles.passedChecks}>
                      <summary>{passedValidations.length} verificações concluídas</summary>
                      <ul className={styles.validationList}>
                        {passedValidations.map((item) => (
                          <li className={styles.passed} key={item.id}>
                            <span>Concluído</span>
                            <strong>{item.message}</strong>
                            <small>{item.rule_code}</small>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </section>
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
