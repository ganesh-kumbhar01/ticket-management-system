"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  X, 
  Search, 
  BookOpen, 
  AlertCircle, 
  Eye, 
  Edit3, 
  Trash2, 
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast, { Toaster } from 'react-hot-toast';

type Article = {
  id: string;
  title: string;
  content: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
};

const kbSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

type KbFormValues = z.infer<typeof kbSchema>;

export default function KnowledgeClient({ initialArticles, isAdmin }: { initialArticles: Article[]; isAdmin: boolean }) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingArticle, setViewingArticle] = useState<Article | null>(null);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();

  // Form for Creating Article
  const createForm = useForm<KbFormValues>({
    resolver: zodResolver(kbSchema),
    mode: 'onTouched',
    defaultValues: { title: '', content: '' }
  });

  // Form for Editing Article
  const editForm = useForm<KbFormValues>({
    resolver: zodResolver(kbSchema),
    mode: 'onTouched',
    defaultValues: { title: '', content: '' }
  });

  // 1. Create Article Handler
  const handleCreateSubmit = async (data: KbFormValues) => {
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

      setIsCreateOpen(false);
      createForm.reset();
      toast.success('Article created & embedded successfully!');
      router.refresh();
      setTimeout(() => window.location.reload(), 500);
    } catch (error: any) {
      toast.error(error.message || 'Error creating article');
    }
  };

  // 2. Open Edit Modal
  const openEditModal = (article: Article, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingArticle(article);
    editForm.reset({
      title: article.title,
      content: article.content
    });
    // If we're viewing it, close viewer
    setViewingArticle(null);
  };

  // 3. Edit Article Handler
  const handleEditSubmit = async (data: KbFormValues) => {
    if (!editingArticle) return;
    try {
      const res = await fetch(`/api/knowledge/${editingArticle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update article');
      }

      // Update local state
      setArticles(prev => prev.map(a => 
        a.id === editingArticle.id ? { ...a, title: data.title, content: data.content, updatedAt: new Date() } : a
      ));

      setEditingArticle(null);
      editForm.reset();
      toast.success('Article updated successfully!');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Error updating article');
    }
  };

  // 4. Delete Article Handler
  const handleDeleteArticle = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/knowledge/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete article');
      }

      // Remove from local state
      setArticles(prev => prev.filter(a => a.id !== id));
      setDeletingArticleId(null);
      if (viewingArticle?.id === id) setViewingArticle(null);
      toast.success('Article deleted successfully!');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Error deleting article');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Knowledge Base
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md border border-blue-500/20">
              {articles.length} {articles.length === 1 ? 'Article' : 'Articles'}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Self-service articles and FAQs used by the AI to answer student tickets.
          </p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-bold transition-all shadow-md shadow-blue-600/20 shrink-0 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Article</span>
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/40 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col min-h-[500px]">
        {/* Search Bar */}
        <div className="p-4 md:p-5 border-b border-white/40 dark:border-slate-800/60 flex items-center justify-between bg-transparent">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input 
              type="text"
              placeholder="Search articles by title or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-white/50 dark:border-slate-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Articles Grid */}
        <div className="flex-1 p-4 md:p-6">
          {filteredArticles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-3 py-16">
              <div className="p-4 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/40 dark:border-slate-700">
                <BookOpen className="w-10 h-10 text-slate-400" />
              </div>
              <p className="font-bold text-base text-slate-700 dark:text-slate-300">No articles found</p>
              <p className="text-xs text-slate-400 max-w-sm text-center">
                {searchQuery ? 'No articles match your search query.' : 'Create your first Knowledge Base article or use Horizon to auto-draft one.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredArticles.map(article => (
                <div 
                  key={article.id} 
                  onClick={() => setViewingArticle(article)}
                  className="group relative p-5 rounded-2xl border border-white/50 dark:border-slate-800/70 hover:border-blue-500/40 dark:hover:border-blue-500/40 hover:shadow-lg transition-all duration-200 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex flex-col justify-between cursor-pointer space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2" title={article.title}>
                        {article.title}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {article.content}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/40 dark:border-slate-800/60 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-[11px] font-medium">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(article.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewingArticle(article); }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                        title="Read Article"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            onClick={(e) => openEditModal(article, e)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                            title="Edit Article"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingArticleId(article.id); }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Article"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 1. VIEW ARTICLE READER MODAL */}
      {viewingArticle && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setViewingArticle(null)}
        >
          <div 
            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/40 dark:border-slate-700/70 w-full max-w-3xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <BookOpen className="w-3 h-3" />
                  Knowledge Article
                </span>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {viewingArticle.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Published on {new Date(viewingArticle.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>

              <button 
                onClick={() => setViewingArticle(null)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 text-slate-800 dark:text-slate-200 prose prose-sm md:prose-base dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {viewingArticle.content}
              </ReactMarkdown>
            </div>

            {/* Modal Footer */}
            <div className="p-4 md:p-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-white/40 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => openEditModal(viewingArticle)}
                      className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-200/50 dark:border-indigo-800/50 transition-all flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Article</span>
                    </button>
                    <button
                      onClick={() => setDeletingArticleId(viewingArticle.id)}
                      className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 font-bold text-xs rounded-xl border border-rose-200/50 dark:border-rose-800/50 transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => setViewingArticle(null)}
                className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CREATE ARTICLE MODAL */}
      {isCreateOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsCreateOpen(false)}
        >
          <div 
            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/40 dark:border-slate-700/70 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Knowledge Article</h2>
              <button 
                onClick={() => setIsCreateOpen(false)} 
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-3 bg-blue-500/10 border-b border-blue-500/20 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                When you save, the AI will compute vector embeddings to automatically recommend this article to customers and agents.
              </p>
            </div>

            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="p-6 space-y-4" noValidate>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Article Title</label>
                <input
                  type="text"
                  {...createForm.register('title')}
                  className={`w-full h-11 px-3.5 bg-white/70 dark:bg-slate-800/70 border ${createForm.formState.errors.title ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/30 text-slate-900 dark:text-white text-sm transition-all`}
                  placeholder="e.g. How to resolve payment timeout"
                />
                {createForm.formState.errors.title && <p className="text-red-500 text-xs font-medium mt-1">{createForm.formState.errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Content / Markdown Supported</label>
                <textarea
                  {...createForm.register('content')}
                  className={`w-full min-h-[220px] p-3.5 bg-white/70 dark:bg-slate-800/70 border ${createForm.formState.errors.content ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/30 text-slate-900 dark:text-white text-sm transition-all resize-y`}
                  placeholder="Provide clear step-by-step troubleshooting instructions..."
                />
                {createForm.formState.errors.content && <p className="text-red-500 text-xs font-medium mt-1">{createForm.formState.errors.content.message}</p>}
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createForm.formState.isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {createForm.formState.isSubmitting ? 'Saving & Embedding...' : 'Publish Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. EDIT ARTICLE MODAL */}
      {editingArticle && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setEditingArticle(null)}
        >
          <div 
            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/40 dark:border-slate-700/70 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Knowledge Article</h2>
              </div>
              <button 
                onClick={() => setEditingArticle(null)} 
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="p-6 space-y-4" noValidate>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Article Title</label>
                <input
                  type="text"
                  {...editForm.register('title')}
                  className={`w-full h-11 px-3.5 bg-white/70 dark:bg-slate-800/70 border ${editForm.formState.errors.title ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/30 text-slate-900 dark:text-white text-sm transition-all`}
                />
                {editForm.formState.errors.title && <p className="text-red-500 text-xs font-medium mt-1">{editForm.formState.errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Content / Markdown</label>
                <textarea
                  {...editForm.register('content')}
                  className={`w-full min-h-[220px] p-3.5 bg-white/70 dark:bg-slate-800/70 border ${editForm.formState.errors.content ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/30 text-slate-900 dark:text-white text-sm transition-all resize-y`}
                />
                {editForm.formState.errors.content && <p className="text-red-500 text-xs font-medium mt-1">{editForm.formState.errors.content.message}</p>}
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingArticle(null)}
                  className="px-4 py-2.5 font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={editForm.formState.isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {editForm.formState.isSubmitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. DELETE CONFIRMATION MODAL */}
      {deletingArticleId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setDeletingArticleId(null)}
        >
          <div 
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/40 dark:border-slate-700/70 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Delete Article?</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to delete this knowledge base article? This action cannot be undone and the AI will no longer use it for automated answers.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingArticleId(null)}
                disabled={isDeleting}
                className="px-4 py-2 font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteArticle(deletingArticleId)}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
