// ============================================================================
// Reusable fast master-search dropdown. Used for both customer and product
// selection on the Quotation Maker. Type to filter, click/Enter to select.
// ============================================================================
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';

interface SearchSelectProps<T> {
  items: T[];
  placeholder: string;
  filter: (items: T[], term: string) => T[];
  renderItem: (item: T) => ReactNode;
  onSelect: (item: T) => void;
  getKey: (item: T) => string;
  autoFocus?: boolean;
}

export function SearchSelect<T>({
  items, placeholder, filter, renderItem, onSelect, getKey, autoFocus,
}: SearchSelectProps<T>) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = filter(items, term).slice(0, 30);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const choose = (item: T) => {
    onSelect(item);
    setTerm('');
    setOpen(false);
    setHighlight(0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && results[highlight]) { e.preventDefault(); choose(results[highlight]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder={placeholder}
          value={term}
          autoFocus={autoFocus}
          onChange={(e) => { setTerm(e.target.value); setOpen(true); setHighlight(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((item, i) => (
            <button
              key={getKey(item)}
              type="button"
              onMouseEnter={() => setHighlight(i)}
              onClick={() => choose(item)}
              className={`block w-full px-3 py-2 text-left text-sm ${i === highlight ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
            >
              {renderItem(item)}
            </button>
          ))}
        </div>
      )}
      {open && term && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow-lg">
          No matches found.
        </div>
      )}
    </div>
  );
}
