"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import type { ContentItem, ContentKind } from "../_lib/types";
import styles from "../lpn.module.css";

export type LpnBrief = {
  as_is: string;
  to_be: string;
  constraints: string;
  additional_context: string;
};

export type NewBlock = {
  kind: ContentKind;
  title: string;
  description: string;
};

const BLOCK_TYPES: Array<{ kind: ContentKind; label: string }> = [
  { kind: "storytelling", label: "Processo atual" },
  { kind: "objective", label: "Objetivo e resultados" },
  { kind: "requirement", label: "Processo proposto" },
  { kind: "constraint", label: "Restrições e premissas" },
  { kind: "pending_issue", label: "Informações complementares" },
  { kind: "acceptance_criterion", label: "Critérios de aceite" },
];

const LABEL_BY_KIND = new Map(BLOCK_TYPES.map((item) => [item.kind, item.label]));

type Props = {
  items: ContentItem[];
  busy: boolean;
  editable: boolean;
  onAdd: (block: NewBlock) => Promise<void>;
  onDelete: (item: ContentItem) => Promise<void>;
  onGenerate: (brief: LpnBrief) => Promise<void>;
  onReorder: (items: ContentItem[]) => Promise<void>;
  onSave: (item: ContentItem, title: string, description: string, locked: boolean) => Promise<void>;
  onSaveFlow: (steps: string[]) => Promise<void>;
};

export function LpnBlockEditor({
  items,
  busy,
  editable,
  onAdd,
  onDelete,
  onGenerate,
  onReorder,
  onSave,
  onSaveFlow,
}: Props) {
  const [draggedId, setDraggedId] = useState("");
  const suggestedSteps = useMemo(() => {
    const requirement = [...items].reverse().find((item) => item.kind === "requirement");
    const value = requirement?.payload.process_steps;
    return Array.isArray(value) ? value.filter((step): step is string => typeof step === "string") : [];
  }, [items]);
  const flowAnchorId = [...items].reverse().find((item) => item.kind === "requirement")?.id;

  async function moveItem(sourceId: string, targetId: string) {
    if (!editable || sourceId === targetId) return;
    const sourceIndex = items.findIndex((item) => item.id === sourceId);
    const targetIndex = items.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...items];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    await onReorder(next);
  }

  async function moveBy(item: ContentItem, offset: number) {
    const index = items.findIndex((candidate) => candidate.id === item.id);
    const target = items[index + offset];
    if (target) await moveItem(item.id, target.id);
  }

  return (
    <section className={styles.visualEditor}>
      <header className={styles.editorHeader}>
        <div>
          <span>CONSTRUTOR VISUAL</span>
          <h2>Monte a LPN com blocos</h2>
          <p>A IA cria o rascunho. Depois você edita, trava e reorganiza cada trecho.</p>
        </div>
        <strong>{items.length} blocos</strong>
      </header>

      <AiBriefPanel busy={busy} editable={editable} onGenerate={onGenerate} />

      <div className={styles.documentCanvas}>
        <div className={styles.canvasHeading}>
          <div>
            <span>PRÉVIA DO CONTEÚDO</span>
            <h3>Documento em construção</h3>
          </div>
          <p>Arraste os blocos pela alça ⋮⋮ ou use as setas.</p>
        </div>

        {items.map((item, index) => (
          <div key={item.id}>
            <ContentBlockCard
              busy={busy}
              editable={editable}
              index={index}
              item={item}
              onDelete={onDelete}
              onDragStart={() => setDraggedId(item.id)}
              onDrop={() => {
                void moveItem(draggedId, item.id);
                setDraggedId("");
              }}
              onMoveDown={() => void moveBy(item, 1)}
              onMoveUp={() => void moveBy(item, -1)}
              onSave={onSave}
              total={items.length}
            />
            {item.id === flowAnchorId ? (
              <ProcessFlowBlock
                busy={busy}
                editable={editable}
                key={`flow-${item.id}`}
                onSave={onSaveFlow}
                suggestedSteps={suggestedSteps}
              />
            ) : null}
          </div>
        ))}

        {!items.length ? (
          <div className={styles.canvasEmpty}>
            Informe o AS IS e o TO BE acima para a IA montar o primeiro rascunho.
          </div>
        ) : null}

        <AddBlockPanel busy={busy} editable={editable} onAdd={onAdd} />
      </div>
    </section>
  );
}

function AiBriefPanel({
  busy,
  editable,
  onGenerate,
}: {
  busy: boolean;
  editable: boolean;
  onGenerate: (brief: LpnBrief) => Promise<void>;
}) {
  const [brief, setBrief] = useState<LpnBrief>({
    as_is: "",
    to_be: "",
    constraints: "",
    additional_context: "",
  });

  function update(field: keyof LpnBrief, value: string) {
    setBrief((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className={styles.briefPanel}>
      <div className={styles.briefIntro}>
        <span>1. CONTE O CENÁRIO</span>
        <h3>O essencial para a IA raciocinar</h3>
        <p>Não precisa escrever como documento. Explique o que acontece hoje e o resultado esperado.</p>
      </div>
      <label>
        <strong>AS IS — como funciona hoje</strong>
        <textarea
          onChange={(event) => update("as_is", event.target.value)}
          placeholder="Ex.: Hoje a expedição acessa a VPE020, preenche diversos filtros e confere o relatório manualmente..."
          rows={6}
          value={brief.as_is}
        />
      </label>
      <label>
        <strong>TO BE — como deveria funcionar</strong>
        <textarea
          onChange={(event) => update("to_be", event.target.value)}
          placeholder="Ex.: A tela deverá destacar os filtros obrigatórios, validar os dados e mostrar um resumo antes da emissão..."
          rows={6}
          value={brief.to_be}
        />
      </label>
      <details className={styles.briefDetails}>
        <summary>Adicionar restrições e contexto</summary>
        <div className={styles.briefExtras}>
          <label>
            <strong>O que não pode mudar</strong>
            <textarea
              onChange={(event) => update("constraints", event.target.value)}
              placeholder="Regras, permissões, cálculos ou integrações que devem ser preservados."
              rows={3}
              value={brief.constraints}
            />
          </label>
          <label>
            <strong>Contexto adicional</strong>
            <textarea
              onChange={(event) => update("additional_context", event.target.value)}
              placeholder="Problemas, usuários envolvidos, exceções conhecidas ou resultados esperados."
              rows={3}
              value={brief.additional_context}
            />
          </label>
        </div>
      </details>
      <button
        className={styles.generateDraftButton}
        disabled={busy || !editable || brief.as_is.trim().length < 20 || brief.to_be.trim().length < 20}
        onClick={() => void onGenerate(brief)}
        type="button"
      >
        {busy ? "Gerando estrutura..." : "Gerar rascunho completo com IA"}
      </button>
      <small>A IA adiciona novos blocos e nunca substitui silenciosamente o que você já revisou.</small>
    </section>
  );
}

function ContentBlockCard({
  item,
  index,
  total,
  busy,
  editable,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDrop,
}: {
  item: ContentItem;
  index: number;
  total: number;
  busy: boolean;
  editable: boolean;
  onSave: Props["onSave"];
  onDelete: Props["onDelete"];
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(String(item.payload.description || ""));
  const [locked, setLocked] = useState(Boolean(item.payload.locked));

  useEffect(() => {
    setTitle(item.title);
    setDescription(String(item.payload.description || ""));
    setLocked(Boolean(item.payload.locked));
  }, [item]);

  const generatedByAi = item.payload.origin === "suggested_by_ai";
  const reviewed = item.payload.human_reviewed === true;

  return (
    <article
      className={styles.contentBlock}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <button
        className={styles.dragHandle}
        disabled={!editable || busy}
        draggable={editable && !busy}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", item.id);
          onDragStart();
        }}
        type="button"
        aria-label="Arrastar bloco"
        title="Arrastar bloco"
      >
        ⋮⋮
      </button>
      <div className={styles.blockBody}>
        <div className={styles.blockMeta}>
          <span>{LABEL_BY_KIND.get(item.kind) || item.kind}</span>
          {generatedByAi ? <em>Gerado pela IA</em> : <em>Adicionado manualmente</em>}
          {reviewed ? <b>Revisado</b> : null}
        </div>
        <input
          aria-label="Título do bloco"
          disabled={!editable || busy}
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
        <textarea
          aria-label={`Conteúdo de ${title}`}
          disabled={!editable || busy}
          onChange={(event) => setDescription(event.target.value)}
          rows={Math.max(5, Math.min(12, description.split("\n").length + 4))}
          value={description}
        />
        <div className={styles.blockActions}>
          <label className={styles.lockControl}>
            <input
              checked={locked}
              disabled={!editable || busy}
              onChange={(event) => setLocked(event.target.checked)}
              type="checkbox"
            />
            Proteger da IA
          </label>
          <div>
            <button disabled={busy || !editable || index === 0} onClick={onMoveUp} type="button" aria-label="Mover bloco para cima">↑</button>
            <button disabled={busy || !editable || index === total - 1} onClick={onMoveDown} type="button" aria-label="Mover bloco para baixo">↓</button>
            <button disabled={busy || !editable} onClick={() => void onSave(item, title, description, locked)} type="button">Salvar</button>
            <button className={styles.dangerButton} disabled={busy || !editable} onClick={() => void onDelete(item)} type="button">Excluir</button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProcessFlowBlock({
  suggestedSteps,
  busy,
  editable,
  onSave,
}: {
  suggestedSteps: string[];
  busy: boolean;
  editable: boolean;
  onSave: (steps: string[]) => Promise<void>;
}) {
  const [stepsText, setStepsText] = useState("");

  useEffect(() => {
    if (suggestedSteps.length) setStepsText(suggestedSteps.join("\n"));
  }, [suggestedSteps]);

  const steps = useMemo(
    () => stepsText.split("\n").map((step) => step.trim()).filter(Boolean),
    [stepsText],
  );

  return (
    <article className={`${styles.contentBlock} ${styles.flowBlock}`}>
      <div className={styles.dragHandle} aria-hidden="true">↳</div>
      <div className={styles.blockBody}>
        <div className={styles.blockMeta}><span>Fluxo do processo proposto</span><em>Bloco visual</em></div>
        <textarea
          aria-label="Etapas do fluxo proposto"
          disabled={!editable || busy}
          onChange={(event) => setStepsText(event.target.value)}
          placeholder="Uma etapa por linha"
          rows={Math.max(5, steps.length + 1)}
          value={stepsText}
        />
        <div className={styles.flowPreview} aria-label="Prévia do fluxo proposto">
          {steps.map((step, index) => (
            <div key={`${step}-${index}`}>
              <span>{step}</span>
              {index < steps.length - 1 ? <b aria-hidden="true">→</b> : null}
            </div>
          ))}
          {!steps.length ? <p>A IA desenhará as etapas do TO BE aqui.</p> : null}
        </div>
        <div className={styles.blockActions}>
          <span>Edite uma etapa por linha.</span>
          <button disabled={busy || !editable || steps.length < 2} onClick={() => void onSave(steps)} type="button">Salvar fluxo</button>
        </div>
      </div>
    </article>
  );
}

function AddBlockPanel({
  busy,
  editable,
  onAdd,
}: {
  busy: boolean;
  editable: boolean;
  onAdd: (block: NewBlock) => Promise<void>;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = event.currentTarget;
    const data = new FormData(target);
    await onAdd({
      kind: String(data.get("kind")) as ContentKind,
      title: String(data.get("title")),
      description: String(data.get("description")),
    });
    target.reset();
  }

  return (
    <details className={styles.addBlock}>
      <summary>+ Adicionar outro bloco</summary>
      <form className={styles.stackForm} onSubmit={submit}>
        <select name="kind" required>
          {BLOCK_TYPES.map((item) => <option key={item.kind} value={item.kind}>{item.label}</option>)}
        </select>
        <input name="title" placeholder="Título do bloco" required />
        <textarea name="description" placeholder="Conteúdo do bloco" required rows={5} />
        <button disabled={busy || !editable} type="submit">Adicionar ao documento</button>
      </form>
    </details>
  );
}
