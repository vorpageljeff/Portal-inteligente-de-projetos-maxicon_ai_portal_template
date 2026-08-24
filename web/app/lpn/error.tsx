"use client";

import styles from "./lpn.module.css";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className={styles.centerState}>
      <h1>Não foi possível abrir o módulo de LPN</h1>
      <button onClick={reset} type="button">Tentar novamente</button>
    </main>
  );
}
