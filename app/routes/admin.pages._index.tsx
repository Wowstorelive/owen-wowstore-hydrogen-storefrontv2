/**
 * Pages Management - Visual CMS Editor
 * Beautiful UX for managing all content pages
 */

import {json, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, Link, useNavigate} from '@remix-run/react';
import {useState} from 'react';

export async function loader({context}: LoaderFunctionArgs) {
  const firestore = context.firestore;

  // Get all pages grouped by language
  const pagesSnapshot = await firestore
    .collection('cms_pages')
    .orderBy('updatedAt', 'desc')
    .get();

  const pages = pagesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    updatedAt: doc.data().updatedAt?.toDate().toISOString(),
  }));

  // Group by language
  const pagesByLanguage = pages.reduce((acc: any, page: any) => {
    if (!acc[page.language]) {
      acc[page.language] = [];
    }
    acc[page.language].push(page);
    return acc;
  }, {});

  return json({pages, pagesByLanguage});
}

export default function PagesManager() {
  const {pages, pagesByLanguage} = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [searchQuery, setSearchQuery] = useState('');

  const languages = Object.keys(pagesByLanguage);
  const currentPages = pagesByLanguage[selectedLanguage] || [];

  const filteredPages = currentPages.filter((page: any) =>
    page.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.slug?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="pages-manager">
      {/* Header */}
      <header className="manager-header">
        <div className="header-left">
          <Link to="/admin" className="back-link">
            <BackIcon className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <div>
            <h1 className="page-title">Pages</h1>
            <p className="page-subtitle">{pages.length} total pages across {languages.length} languages</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/pages/new')}
          className="btn-primary"
        >
          <PlusIcon className="w-5 h-5" />
          New Page
        </button>
      </header>

      {/* Filters */}
      <div className="filters-bar">
        {/* Search */}
        <div className="search-box">
          <SearchIcon className="search-icon" />
          <input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Language Selector */}
        <div className="language-selector">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`lang-btn ${selectedLanguage === lang ? 'lang-btn-active' : ''}`}
            >
              <span className="lang-flag">{getFlagEmoji(lang)}</span>
              {lang.toUpperCase()}
              <span className="lang-count">{pagesByLanguage[lang].length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pages Grid */}
      {filteredPages.length === 0 ? (
        <div className="empty-state">
          <EmptyIcon className="empty-icon" />
          <h3 className="empty-title">No pages found</h3>
          <p className="empty-description">
            {searchQuery
              ? 'Try a different search term'
              : `No pages in ${selectedLanguage.toUpperCase()} yet`}
          </p>
          <button
            onClick={() => navigate('/admin/pages/new')}
            className="btn-secondary"
          >
            Create First Page
          </button>
        </div>
      ) : (
        <div className="pages-grid">
          {filteredPages.map((page: any) => (
            <PageCard key={page.id} page={page} />
          ))}
        </div>
      )}

      <style>{pagesStyles}</style>
    </div>
  );
}

function PageCard({page}: {page: any}) {
  const navigate = useNavigate();
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="page-card"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Preview Thumbnail */}
      <div className="page-thumbnail">
        <div className="thumbnail-overlay">
          {page.published ? (
            <span className="status-badge status-published">Published</span>
          ) : (
            <span className="status-badge status-draft">Draft</span>
          )}
        </div>
        <PageIcon className="thumbnail-icon" />
      </div>

      {/* Content */}
      <div className="page-card-content">
        <h3 className="page-card-title">{page.title || 'Untitled'}</h3>
        <p className="page-card-slug">/{page.slug}</p>

        <div className="page-card-meta">
          <span className="meta-item">
            <CalendarIcon className="w-4 h-4" />
            {new Date(page.updatedAt).toLocaleDateString()}
          </span>
          {page.author && (
            <span className="meta-item">
              <UserIcon className="w-4 h-4" />
              {page.author}
            </span>
          )}
        </div>

        {/* Quick Actions */}
        {showActions && (
          <div className="page-actions">
            <button
              onClick={() => navigate(`/admin/pages/${page.id}/edit`)}
              className="action-btn action-edit"
            >
              <EditIcon className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => window.open(`/${page.slug}`, '_blank')}
              className="action-btn action-view"
            >
              <EyeIcon className="w-4 h-4" />
              View
            </button>
            <button className="action-btn action-more">
              <DotsIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getFlagEmoji(lang: string): string {
  const flags: Record<string, string> = {
    en: '🇺🇸',
    es: '🇪🇸',
    fr: '🇫🇷',
    de: '🇩🇪',
    it: '🇮🇹',
    pt: '🇵🇹',
    nl: '🇳🇱',
  };
  return flags[lang] || '🌐';
}

// Icons (same as before, abbreviated for space)
function BackIcon({className = ''}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function PlusIcon({className = ''}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function SearchIcon({className = ''}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function PageIcon({className = ''}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function CalendarIcon({className = ''}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function UserIcon({className = ''}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function EditIcon({className = ''}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function EyeIcon({className = ''}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function DotsIcon({className = ''}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  );
}

function EmptyIcon({className = ''}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

const pagesStyles = `
  .pages-manager {
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    padding: 2rem;
  }

  .manager-header {
    background: white;
    border-radius: 20px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #6b7280;
    text-decoration: none;
    font-size: 0.875rem;
    transition: color 0.2s;
  }

  .back-link:hover {
    color: #111827;
  }

  .page-title {
    font-size: 2rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .page-subtitle {
    color: #6b7280;
    margin: 0.5rem 0 0;
  }

  .btn-primary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
  }

  .btn-secondary {
    padding: 0.75rem 1.5rem;
    background: white;
    color: #667eea;
    border: 2px solid #667eea;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: #667eea;
    color: white;
  }

  .filters-bar {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .search-box {
    position: relative;
    flex: 1;
    min-width: 250px;
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    color: #9ca3af;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 3rem;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    font-size: 0.9375rem;
    transition: border-color 0.2s;
  }

  .search-input:focus {
    outline: none;
    border-color: #667eea;
  }

  .language-selector {
    display: flex;
    gap: 0.5rem;
  }

  .lang-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #f9fafb;
    border: 2px solid transparent;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .lang-btn:hover {
    background: #f3f4f6;
  }

  .lang-btn-active {
    background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
    border-color: #8b5cf6;
    color: #7c3aed;
  }

  .lang-flag {
    font-size: 1.25rem;
  }

  .lang-count {
    background: rgba(0, 0, 0, 0.1);
    padding: 0.125rem 0.5rem;
    border-radius: 6px;
    font-size: 0.75rem;
  }

  .pages-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .page-card {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    transition: all 0.3s;
    cursor: pointer;
  }

  .page-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
  }

  .page-thumbnail {
    position: relative;
    height: 180px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-center;
  }

  .thumbnail-overlay {
    position: absolute;
    top: 1rem;
    right: 1rem;
  }

  .status-badge {
    padding: 0.375rem 0.75rem;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .status-published {
    background: rgba(16, 185, 129, 0.2);
    color: #059669;
    backdrop-filter: blur(10px);
  }

  .status-draft {
    background: rgba(251, 191, 36, 0.2);
    color: #d97706;
    backdrop-filter: blur(10px);
  }

  .thumbnail-icon {
    width: 64px;
    height: 64px;
    color: rgba(255, 255, 255, 0.6);
  }

  .page-card-content {
    padding: 1.5rem;
  }

  .page-card-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.5rem;
  }

  .page-card-slug {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0 0 1rem;
    font-family: monospace;
  }

  .page-card-meta {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: #9ca3af;
    font-size: 0.8125rem;
  }

  .page-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    padding: 0.5rem;
    border-radius: 8px;
    border: none;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-edit {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
  }

  .action-edit:hover {
    transform: scale(1.05);
  }

  .action-view {
    background: #f3f4f6;
    color: #6b7280;
  }

  .action-view:hover {
    background: #e5e7eb;
  }

  .action-more {
    background: #f3f4f6;
    color: #6b7280;
    flex: 0 0 auto;
    width: 36px;
  }

  .action-more:hover {
    background: #e5e7eb;
  }

  .empty-state {
    background: white;
    border-radius: 20px;
    padding: 4rem 2rem;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    color: #d1d5db;
    margin: 0 auto 1.5rem;
  }

  .empty-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.5rem;
  }

  .empty-description {
    color: #6b7280;
    margin: 0 0 2rem;
  }

  @media (max-width: 768px) {
    .pages-manager {
      padding: 1rem;
    }

    .manager-header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .filters-bar {
      flex-direction: column;
    }

    .pages-grid {
      grid-template-columns: 1fr;
    }
  }
`;
