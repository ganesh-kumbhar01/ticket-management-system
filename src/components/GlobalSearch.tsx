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
      default: return <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 dark:text-slate-400" />;
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-sm transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline-block font-medium">Search...</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
          <div 
            className="w-full max-w-xl bg-white dark:bg-slate-900 dark:bg-slate-900 dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 dark:border-slate-800 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <Command shouldFilter={false} className="w-full">
              <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 dark:border-slate-800 px-3">
                <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 dark:text-slate-500 shrink-0" />
                <Command.Input 
                  autoFocus
                  placeholder="Search tickets, users, or articles..."
                  value={query}
                  onValueChange={setQuery}
                  className="flex-1 h-12 bg-transparent outline-none border-none px-3 text-sm placeholder:text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-200"
                />
                {loading && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
              </div>

              <Command.List className="max-h-[300px] overflow-y-auto p-2">
                {query && results.length === 0 && !loading && (
                  <Command.Empty className="p-4 text-sm text-center text-slate-500 dark:text-slate-400 dark:text-slate-400">
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
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 dark:aria-selected:bg-slate-800 aria-selected:text-slate-900 dark:text-white dark:text-white dark:aria-selected:text-white text-slate-700 dark:text-slate-300 dark:text-slate-300 dark:text-slate-300"
                  >
                    <div className="shrink-0 p-2 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 dark:bg-slate-800/50 rounded-lg">
                      {getIcon(result.type)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400">{result.subtitle}</span>
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
