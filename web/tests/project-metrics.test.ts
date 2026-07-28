import assert from "node:assert/strict";
import test from "node:test";

import { percentage, progressGap, remainingHours } from "../app/lib/project-metrics.ts";

test("percentage calcula consumo e protege divisão por zero", () => {
  assert.equal(percentage(25, 100), 25);
  assert.equal(percentage(1, 3), 33);
  assert.equal(percentage(10, 0), 0);
});

test("progressGap preserva uma casa decimal", () => {
  assert.equal(progressGap(62.45, 58.11), 4.3);
  assert.equal(progressGap(50, 60), -10);
});

test("remainingHours nunca retorna saldo negativo", () => {
  assert.equal(remainingHours(120, 42.5), 77.5);
  assert.equal(remainingHours(100, 125), 0);
});
