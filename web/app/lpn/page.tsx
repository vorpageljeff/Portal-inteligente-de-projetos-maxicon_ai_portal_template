import type { Metadata } from "next";

import { LpnWorkspace } from "./_components/lpn-workspace";

export const metadata: Metadata = {
  title: "Levantamentos LPN | Portal Inteligente",
  description: "Elaboração, validação e aprovação de LPNs.",
};

export default function LpnPage() {
  return <LpnWorkspace />;
}
