type Project = { id:string; name:string; client_name:string; status:string; contracted_hours:number };
async function getProjects(): Promise<Project[]> {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try { const r = await fetch(`${api}/api/v1/projects`, {cache:"no-store"}); return r.ok ? r.json() : []; } catch { return []; }
}
export default async function Home() {
  const projects = await getProjects();
  return <><section className="hero"><p>VISÃO EXECUTIVA</p><h1>Status semanal sem montar planilhas toda sexta-feira.</h1><span>Centralize tarefas, horas, riscos e pendências para gerar relatórios com IA.</span></section><section className="cards"><article>Projetos ativos<strong>{projects.length}</strong></article><article>Em atenção<strong>0</strong></article><article>Entregas da semana<strong>0</strong></article><article>Riscos críticos<strong>0</strong></article></section><section className="panel"><h2>Projetos</h2>{projects.length===0?<p>Nenhum projeto cadastrado. Use a API em /docs.</p>:projects.map(p=><div key={p.id}>{p.name} — {p.client_name} — {p.status}</div>)}</section></>;
}
