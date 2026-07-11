export function TechnicalDetails({ data }: { data: unknown }) {
  return (
    <details className="technical">
      <summary>Ver dados técnicos</summary>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}
