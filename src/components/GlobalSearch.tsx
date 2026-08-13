"use client";

import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { Search, User, FileText, Ticket } from 'lucide-react';

type SearchResult = {
  type: 'ticket' | 'user' | 'knowledge';
  id: string;
  title: string;
  subtitle?: string;
  url: string;
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'ticket': return <Ticket className="w-4 h-4 text-blue-500" />;
      case 'user': return <User className="w-4 h-4 text-purple-500" />;
      case 'knowledge': return <FileText className="w-4 h-4 text-amber-500" />;
      default: return <Search className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-sm transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline-block">Search...</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-400 font-mono">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
          <div 
            className="w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <Command shouldFilter={false} className="w-full">
              <div className="flex items-center border-b border-slate-100 px-3">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <Command.Input 
                  autoFocus
                  placeholder="Search tickets, users, or articles..."
                  value={query}
                  onValueChange={setQuery}
                  className="flex-1 h-12 bg-transparent outline-none border-none px-3 text-sm placeholder:text-slate-400"
                />
                {loading && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
              </div>

              <Command.List className="max-h-[300px] overflow-y-auto p-2">
                {query && results.length === 0 && !loading && (
                  <Command.Empty className="p-4 text-sm text-center text-slate-500">
                    No results found for "{query}"
                  </Command.Empty>
                )}
                
                {results.map((result) => (
                  <Command.Item
                    key={`${result.type}-${result.id}`}
                    value={result.title}
                    onSelect={() => {
                      router.push(result.url);
                      setOpen(false);
                      setQuery('');
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-slate-100 aria-selected:text-slate-900 text-slate-700"
                  >
                    <div className="shrink-0 p-2 bg-slate-50 rounded-lg">
                      {getIcon(result.type)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-slate-500">{result.subtitle}</span>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}
