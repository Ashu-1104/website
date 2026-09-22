'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------- Trie for fast prefix search ---------- */

interface TrieNode {
  children: Map<string, TrieNode>;
  indices: number[]; // indices into the original items array
}

function createTrieNode(): TrieNode {
  return { children: new Map(), indices: [] };
}

function buildTrie(items: { id: string; name: string }[]): TrieNode {
  const root = createTrieNode();

  for (let idx = 0; idx < items.length; idx++) {
    const name = items[idx].name.toLowerCase();
    // Insert all suffixes of every word for substring-like matching
    const words = name.split(/\s+/);
    for (const word of words) {
      let node = root;
      for (const ch of word) {
        if (!node.children.has(ch)) {
          node.children.set(ch, createTrieNode());
        }
        node = node.children.get(ch)!;
        node.indices.push(idx);
      }
    }
  }

  return root;
}

function searchTrie(root: TrieNode, query: string): Set<number> {
  const q = query.toLowerCase().trim();
  if (!q) return new Set();

  // Search for each word in the query
  const words = q.split(/\s+/).filter(Boolean);
  const resultSets: Set<number>[] = [];

  for (const word of words) {
    let node: TrieNode | undefined = root;
    for (const ch of word) {
      node = node?.children.get(ch);
      if (!node) break;
    }
    resultSets.push(node ? new Set(node.indices) : new Set());
  }

  // Intersect all word results
  if (resultSets.length === 0) return new Set();
  let result = resultSets[0];
  for (let i = 1; i < resultSets.length; i++) {
    const next = new Set<number>();
    for (const idx of result) {
      if (resultSets[i].has(idx)) next.add(idx);
    }
    result = next;
  }

  return result;
}

/* ---------- Component ---------- */

interface SearchableSelectProps {
  items: { id: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
}

export default function SearchableSelect({
  items,
  value,
  onChange,
  placeholder = 'Search...',
  emptyLabel = '-- None --',
  className,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build trie when items change
  const trie = useMemo(() => buildTrie(items), [items]);

  // Get filtered items
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const matchIndices = searchTrie(trie, query);
    return Array.from(matchIndices).map((i) => items[i]);
  }, [items, trie, query]);

  // Find selected item name
  const selectedName = useMemo(() => {
    if (!value) return '';
    const item = items.find((i) => i.id === value);
    return item?.name ?? '';
  }, [items, value]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Close on Escape
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setQuery('');
    // Focus input after render
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className={cn('searchable-select', className)} onKeyDown={handleKeyDown}>
      {/* Trigger button */}
      <button
        type="button"
        className="searchable-select-trigger"
        onClick={handleOpen}
      >
        <span className={cn('searchable-select-value', !value && 'searchable-select-placeholder')}>
          {value ? selectedName : emptyLabel}
        </span>
        <ChevronDown className="searchable-select-chevron" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="searchable-select-dropdown">
          {/* Search input */}
          <div className="searchable-select-search">
            <Search className="searchable-select-search-icon" />
            <input
              ref={inputRef}
              type="text"
              className="searchable-select-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                className="searchable-select-search-clear"
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div ref={listRef} className="searchable-select-list styled-scrollbar">
            {/* None option */}
            <button
              type="button"
              className={cn('searchable-select-option', !value && 'searchable-select-option-active')}
              onClick={() => handleSelect('')}
            >
              {emptyLabel}
            </button>

            {filtered.length === 0 ? (
              <div className="searchable-select-empty">No results found</div>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'searchable-select-option',
                    item.id === value && 'searchable-select-option-active'
                  )}
                  onClick={() => handleSelect(item.id)}
                >
                  {item.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
