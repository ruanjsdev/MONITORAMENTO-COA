type FilterOption = { value: string; label: string };

export function FilterBar({ options, value, onChange, label = "Filtros" }: { options: FilterOption[]; value: string; onChange: (value: string) => void; label?: string }) {
  return (
    <div className="filter-bar" aria-label={label}>
      {options.map((option) => (
        <button className={value === option.value ? "active-filter" : ""} key={option.value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
