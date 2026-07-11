import { useEffect, useState } from "react";

export function useLoadable<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await loader());
    } catch (error) {
      setError(error instanceof Error ? error.message : "Falha ao carregar dados da API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return { data, error, loading, reload: load };
}
