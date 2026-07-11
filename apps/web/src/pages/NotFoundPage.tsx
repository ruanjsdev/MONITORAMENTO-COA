export default function NotFoundPage({ navigate }: { navigate: (path: string) => void }) {
  return <section className="panel"><h1>Página não encontrada</h1><p>A tela solicitada não existe.</p><button onClick={() => navigate("/dashboard")}>Voltar ao dashboard</button></section>;
}
