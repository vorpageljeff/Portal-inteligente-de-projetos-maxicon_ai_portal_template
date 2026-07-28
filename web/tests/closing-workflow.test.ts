import assert from "node:assert/strict";
import test from "node:test";

import { closingProgress } from "../app/lib/closing-workflow.ts";

test("bloqueia etapas futuras quando o ciclo ainda não existe", () => {
  const progress = closingProgress({
    hasCycle: false,
    mode: null,
    dataReady: false,
    blockingIssueCount: 0,
    reviewed: false,
    published: false,
  });

  assert.equal(progress.maxAccessibleStep, 1);
  assert.deepEqual(progress.completed, [false, false, false, false, false, false]);
});

test("permite validar depois de concluir o checklist manual", () => {
  const progress = closingProgress({
    hasCycle: true,
    mode: "manual",
    dataReady: true,
    blockingIssueCount: 0,
    reviewed: false,
    published: false,
  });

  assert.equal(progress.maxAccessibleStep, 5);
  assert.deepEqual(progress.completed.slice(0, 4), [true, true, true, true]);
});

test("impede a revisão enquanto houver inconsistência bloqueante", () => {
  const progress = closingProgress({
    hasCycle: true,
    mode: "ai",
    dataReady: true,
    blockingIssueCount: 2,
    reviewed: false,
    published: false,
  });

  assert.equal(progress.maxAccessibleStep, 4);
  assert.equal(progress.completed[3], false);
});

test("libera a publicação somente após a revisão humana", () => {
  const progress = closingProgress({
    hasCycle: true,
    mode: "ai",
    dataReady: true,
    blockingIssueCount: 0,
    reviewed: true,
    published: false,
  });

  assert.equal(progress.maxAccessibleStep, 6);
  assert.equal(progress.completed[4], true);
  assert.equal(progress.completed[5], false);
});
