/**
 * WowStore CMS Admin Dashboard
 * Award-winning UX for content management
 */

import {json, type LoaderFunctionArgs, redirect} from '@shopify/remix-oxygen';
import {useLoaderData, Link} from '@remix-run/react';
import {useState, useEffect} from 'react';

export async function loader({context}: LoaderFunctionArgs) {
  // Check if user is admin (you can customize this check)
  const isAdmin = await checkAdminAccess(context);

  if (!isAdmin) {
    return redirect('/account/login');
  }

  // Get dashboard stats
  const stats = await getDashboardStats(context);

  return json({stats});
}

async function checkAdminAccess(context: any): Promise<boolean> {
  try {
    if (await context.customerAccount.isLoggedIn()) {
      const {data} = await context.customerAccount.query(
        `query getCustomer {
          customer {
            id
            email
            tags
          }
        }`
      );

      // Check if customer has 'admin' tag
      return data?.customer?.tags?.includes('admin') || false;
    }
  } catch (error) {
    console.error('Admin check error:', error);
  }
  return false;
}

async function getDashboardStats(context: any) {
  const firestore = context.firestore;

  // Get counts from Firestore
  const [pagesSnapshot, menusSnapshot, productsWithReviews] = await Promise.all([
    firestore.collection('cms_pages').get(),
    firestore.collection('cms_menus').get(),
    firestore.collection('product_reviews').get(),
  ]);

  return {
    totalPages: pagesSnapshot.size,
    totalMenus: menusSnapshot.size,
    totalReviews: productsWithReviews.size,
    lastUpdated: new Date().toISOString(),
  };
}

export default function AdminDashboard() {
  const {stats} = useLoaderData<typeof loader>();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="header-content">
          <div>
            <h1 className="dashboard-title">WowStore CMS</h1>
            <p className="dashboard-subtitle">
              {time.toLocaleTimeString()} • {time.toLocaleDateString()}
            </p>
          </div>
          <Link to="/" className="btn-view-site">
            <ViewIcon className="w-5 h-5" />
            View Site
          </Link>
        </div>
      </header>

      {/* Quick Stats */}
      <section className="stats-grid">
        <StatCard
          title="Pages"
          value={stats.totalPages}
          icon={<PageIcon />}
          color="blue"
          link="/admin/pages"
        />
        <StatCard
          title="Menus"
          value={stats.totalMenus}
          icon={<MenuIcon />}
          color="purple"
          link="/admin/menus"
        />
        <StatCard
          title="Reviews"
          value={stats.totalReviews}
          icon={<StarIcon />}
          color="yellow"
          link="/admin/reviews"
        />
        <StatCard
          title="Voice Sessions"
          value="Live"
          icon={<MicIcon />}
          color="red"
          link="/admin/voice-analytics"
          badge="NEW"
        />
      </section>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Content Management */}
        <ContentSection
          title="Content"
          description="Manage your site content"
          items={[
            {
              title: 'Pages',
              description: 'Create and edit pages',
              icon: <PageIcon />,
              link: '/admin/pages',
              color: 'blue',
            },
            {
              title: 'Menus',
              description: 'Manage navigation',
              icon: <MenuIcon />,
              link: '/admin/menus',
              color: 'purple',
            },
            {
              title: 'Homepage',
              description: 'Edit homepage sections',
              icon: <HomeIcon />,
              link: '/admin/homepage',
              color: 'green',
            },
          ]}
        />

        {/* Design */}
        <ContentSection
          title="Design"
          description="Customize your store's look"
          items={[
            {
              title: 'Themes',
              description: 'Color themes & styling',
              icon: <PaletteIcon />,
              link: '/admin/themes',
              color: 'pink',
            },
            {
              title: 'Collections',
              description: 'Collection layouts',
              icon: <GridIcon />,
              link: '/admin/collections',
              color: 'indigo',
            },
          ]}
        />

        {/* Live Shopping */}
        <ContentSection
          title="Live Shopping"
          description="Manage live events"
          badge="NEW"
          items={[
            {
              title: 'Go Live',
              description: 'Start live shopping event',
              icon: <LiveIcon />,
              link: '/admin/live-shopping',
              color: 'red',
              highlight: true,
            },
            {
              title: 'Voice AI',
              description: 'Voice assistant settings',
              icon: <MicIcon />,
              link: '/admin/voice-settings',
              color: 'purple',
            },
          ]}
        />

        {/* Analytics */}
        <ContentSection
          title="Analytics"
          description="Track performance"
          items={[
            {
              title: 'Voice Analytics',
              description: 'Voice session insights',
              icon: <ChartIcon />,
              link: '/admin/voice-analytics',
              color: 'blue',
            },
            {
              title: 'Content Performance',
              description: 'Page & content metrics',
              icon: <TrendIcon />,
              link: '/admin/analytics',
              color: 'green',
            },
          ]}
        />
      </div>

      <style>{adminStyles}</style>
    </div>
  );
}

// Components
function StatCard({
  title,
  value,
  icon,
  color,
  link,
  badge,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  link: string;
  badge?: string;
}) {
  return (
    <Link to={link} className={`stat-card stat-card-${color}`}>
      {badge && <span className="stat-badge">{badge}</span>}
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <p className="stat-label">{title}</p>
        <p className="stat-value">{value}</p>
      </div>
      <ArrowIcon className="stat-arrow" />
    </Link>
  );
}

function ContentSection({
  title,
  description,
  items,
  badge,
}: {
  title: string;
  description: string;
  items: Array<{
    title: string;
    description: string;
    icon: React.ReactNode;
    link: string;
    color: string;
    highlight?: boolean;
  }>;
  badge?: string;
}) {
  return (
    <section className="content-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            {title}
            {badge && <span className="section-badge">{badge}</span>}
          </h2>
          <p className="section-description">{description}</p>
        </div>
      </div>
      <div className="section-items">
        {items.map((item) => (
          <Link
            key={item.title}
            to={item.link}
            className={`section-item ${item.highlight ? 'section-item-highlight' : ''}`}
          >
            <div className={`item-icon item-icon-${item.color}`}>
              {item.icon}
            </div>
            <div className="item-content">
              <h3 className="item-title">{item.title}</h3>
              <p className="item-description">{item.description}</p>
            </div>
            <ArrowIcon className="item-arrow" />
          </Link>
        ))}
      </div>
    </section>
  );
}

// Icons
function PageIcon({className = 'w-6 h-6'}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function MenuIcon({className = 'w-6 h-6'}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function StarIcon({className = 'w-6 h-6'}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

function MicIcon({className = 'w-6 h-6'}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function HomeIcon({className = 'w-6 h-6'}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function PaletteIcon({className = 'w-6 h-6'}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  );
}

function GridIcon({className = 'w-6 h-6'}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  );
}

function LiveIcon({className = 'w-6 h-6'}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function ChartIcon({className = 'w-6 h-6'}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function TrendIcon({className = 'w-6 h-6'}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function ViewIcon({className = 'w-6 h-6'}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function ArrowIcon({className = 'w-5 h-5'}: {className?: string}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

// Styles
const adminStyles = `
  .admin-dashboard {
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    padding: 2rem;
  }

  .admin-header {
    background: white;
    border-radius: 20px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dashboard-title {
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0;
  }

  .dashboard-subtitle {
    color: #6b7280;
    margin-top: 0.5rem;
  }

  .btn-view-site {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    font-weight: 600;
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .btn-view-site:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    position: relative;
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    text-decoration: none;
    transition: all 0.3s;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }

  .stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--stat-color-1), var(--stat-color-2));
  }

  .stat-card-blue { --stat-color-1: #3b82f6; --stat-color-2: #2563eb; }
  .stat-card-purple { --stat-color-1: #8b5cf6; --stat-color-2: #7c3aed; }
  .stat-card-yellow { --stat-color-1: #f59e0b; --stat-color-2: #d97706; }
  .stat-card-red { --stat-color-1: #ef4444; --stat-color-2: #dc2626; }

  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }

  .stat-badge {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    animation: pulse 2s infinite;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--stat-color-1), var(--stat-color-2));
    display: flex;
    align-items: center;
    justify-center;
    color: white;
  }

  .stat-content {
    flex: 1;
  }

  .stat-label {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .stat-arrow {
    color: #9ca3af;
    transition: transform 0.2s;
  }

  .stat-card:hover .stat-arrow {
    transform: translateX(4px);
  }

  .content-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2rem;
  }

  .content-section {
    background: white;
    border-radius: 20px;
    padding: 2rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-badge {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
  }

  .section-description {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0.25rem 0 0;
  }

  .section-items {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .section-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border-radius: 12px;
    background: #f9fafb;
    text-decoration: none;
    transition: all 0.2s;
  }

  .section-item:hover {
    background: #f3f4f6;
    transform: translateX(4px);
  }

  .section-item-highlight {
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border: 2px solid #fecaca;
  }

  .item-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-center;
    color: white;
    flex-shrink: 0;
  }

  .item-icon-blue { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
  .item-icon-purple { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
  .item-icon-green { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
  .item-icon-pink { background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); }
  .item-icon-indigo { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); }
  .item-icon-red { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }

  .item-content {
    flex: 1;
  }

  .item-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }

  .item-description {
    font-size: 0.8125rem;
    color: #6b7280;
    margin: 0.25rem 0 0;
  }

  .item-arrow {
    color: #9ca3af;
    transition: transform 0.2s;
  }

  .section-item:hover .item-arrow {
    transform: translateX(4px);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  @media (max-width: 768px) {
    .admin-dashboard {
      padding: 1rem;
    }

    .header-content {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .content-grid {
      grid-template-columns: 1fr;
    }
  }
`;
