"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Plus, X, Search, BookOpen, AlertCircle } from 'lucide-react';

type Article = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
};

const createKbSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

type CreateKbFormValues = z.infer<typeof createKbSchema>;

export default function KnowledgeClient({ initialArticles, isAdmin }: { initialArticles: Article[], isAdmin: boolean }) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateKbFormValues>({
    resolver: zodResolver(createKbSchema),
    mode: 'onTouched',
    defaultValues: {
      title: '',
      content: ''
    }
  });

  const onSubmit = async (data: CreateKbFormValues) => {
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create article');
      }

      // Instead of relying purely on state (since ID comes from DB), let's refresh the router to fetch new list.
      setIsModalOpen(false);
      reset();
      router.refresh();
      // Small timeout to allow Next.js cache to invalidate
      setTimeout(() => window.location.reload(), 500);
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    }
  };

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Knowledge Base
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Articles and FAQs used by the AI to draft responses.
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-blue-600/20 active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5" />
            New Article
          </button>
        )}
      </div>

      <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[400px]">
        <div className="p-4 border-b border-white/50 flex items-center bg-transparent">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/50 backdrop-blur-md border border-white/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 p-6">
          {filteredArticles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 py-12">
              <BookOpen className="w-12 h-12 text-slate-300" />
              <p className="font-medium">No articles found in the Knowledge Base.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredArticles.map(article => (
                <div key={article.id} className="p-5 rounded-xl border border-white/60 hover:border-blue-300 hover:shadow-md transition-all bg-white/50 backdrop-blur-md flex flex-col">
                  <h3 className="font-bold text-slate-900 mb-2 line-clamp-1" title={article.title}>{article.title}</h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-3 flex-1">
                    {article.content}
                  </p>
                  <div className="text-xs font-semibold text-slate-500 pt-3 border-t border-white/50">
                    Added: {new Date(article.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Article Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white/80 backdrop-blur-2xl border border-white/50 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900">Create Knowledge Article</h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-blue-800">
                When you save this article, the AI will analyze it and create a vector embedding so it can be automatically retrieved to help answer student tickets.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4" noValidate>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Article Title</label>
                <input
                  type="text"
                  {...register('title')}
                  className={`w-full h-11 px-3 bg-white border ${errors.title ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-300 focus:ring-blue-600/10 focus:border-blue-600'} rounded-lg focus:outline-none focus:ring-4 text-slate-900 transition-all`}
                  placeholder="e.g., How to reset password"
                />
                {errors.title && <p className="text-red-500 text-xs font-medium mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Content / Answer</label>
                <textarea
                  {...register('content')}
                  className={`w-full min-h-[200px] p-3 bg-white border ${errors.content ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-300 focus:ring-blue-600/10 focus:border-blue-600'} rounded-lg focus:outline-none focus:ring-4 text-slate-900 transition-all resize-y`}
                  placeholder="Provide the full explanation or steps here..."
                />
                {errors.content && <p className="text-red-500 text-xs font-medium mt-1">{errors.content.message}</p>}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-blue-600/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? 'Saving & Embedding...' : 'Save Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
