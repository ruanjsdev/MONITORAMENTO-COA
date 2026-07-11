export function LoadState({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (loading) return <section className="panel">Carregando...</section>;
  if (error) return <section className="panel error-box"><p>{error}</p><button onClick={retry}>Tentar novamente</button></section>;
  return null;
}
