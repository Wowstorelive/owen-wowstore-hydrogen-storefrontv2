import {json, type LoaderFunctionArgs, type ActionFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, Form} from '@remix-run/react';
import {
  getMembershipTier,
  getMembershipStats,
  MEMBERSHIP_TIERS,
  addToFoundingMemberWaitlist,
  type MembershipTier,
} from '~/lib/membership.service';
import {getUserStory, getCommunityImpactStats} from '~/lib/social-integration.service';

export async function loader({context}: LoaderFunctionArgs) {
  // Check if user is logged in
  if (!(await context.customerAccount.isLoggedIn())) {
    return json({
      customer: null,
      currentTier: 'free' as MembershipTier,
      stats: null,
      userStory: null,
      communityImpact: await getCommunityImpactStats(),
      betaMode: process.env.BETA_MODE === 'true',
    });
  }

  // Get customer data
  const {data} = await context.customerAccount.query(
    `query getCustomer {
      customer {
        id
        firstName
        lastName
        email
      }
    }`
  );

  const customer = data?.customer;
  const customerId = customer?.id || '';

  // Get membership info
  const currentTier = await getMembershipTier(customerId);
  const stats = await getMembershipStats(customerId);
  const userStory = await getUserStory(customerId);
  const communityImpact = await getCommunityImpactStats();

  return json({
    customer,
    currentTier,
    stats,
    userStory,
    communityImpact,
    betaMode: process.env.BETA_MODE === 'true',
  });
}

export async function action({request}: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get('action');
  const email = formData.get('email') as string;
  const tier = formData.get('tier') as MembershipTier;

  if (action === 'join-waitlist') {
    try {
      await addToFoundingMemberWaitlist(email, '', tier);
      return json({success: true, message: 'Added to waitlist!'});
    } catch (error) {
      return json({success: false, message: 'Failed to join waitlist'});
    }
  }

  return json({success: false});
}

export default function MembershipPage() {
  const {customer, currentTier, stats, userStory, communityImpact, betaMode} =
    useLoaderData<typeof loader>();

  const tiers: MembershipTier[] = ['free', 'silver', 'gold', 'platinum'];

  return (
    <div className="membership-page">
      {/* Hero Section */}
      <section className="membership-hero">
        <div className="hero-gradient">
          <h1 className="hero-title">Your Story. Your Style. Your Impact.</h1>
          <p className="hero-subtitle">
            Join a community of change makers where every purchase tells a story
            and creates real impact.
          </p>
          {betaMode && (
            <div className="beta-badge">
              🚀 BETA: All users FREE during beta! Premium tiers launch Black Friday
            </div>
          )}
        </div>
      </section>

      {/* Community Impact Stats */}
      <section className="community-impact">
        <h2>Our Community of Change Makers</h2>
        <div className="impact-stats-grid">
          <div className="impact-stat">
            <div className="stat-number">
              ${communityImpact.totalDonated.toFixed(0)}
            </div>
            <div className="stat-label">Total Donated</div>
          </div>
          <div className="impact-stat">
            <div className="stat-number">{communityImpact.totalMembers}</div>
            <div className="stat-label">Change Makers</div>
          </div>
          <div className="impact-stat">
            <div className="stat-number">{communityImpact.livesImpacted}</div>
            <div className="stat-label">Lives Impacted</div>
          </div>
          <div className="impact-stat">
            <div className="stat-number">
              {communityImpact.causesSupported.length}
            </div>
            <div className="stat-label">Causes Supported</div>
          </div>
        </div>
      </section>

      {/* User Story Preview (if logged in and has story) */}
      {userStory && (
        <section className="your-story-preview">
          <div className="story-card">
            <h3>{userStory.storyTitle}</h3>
            <p className="story-chapter">{userStory.currentChapter}</p>
            <div className="story-stats">
              <div className="story-stat">
                <span className="stat-value">
                  ${userStory.impactStats.totalDonated.toFixed(2)}
                </span>
                <span className="stat-label">Your Impact</span>
              </div>
              <div className="story-stat">
                <span className="stat-value">
                  {userStory.impactStats.livesImpacted}
                </span>
                <span className="stat-label">Lives Changed</span>
              </div>
              <div className="story-stat">
                <span className="stat-value">
                  {userStory.styleEvolution.outfitsCreated}
                </span>
                <span className="stat-label">Outfits Created</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Membership Tiers */}
      <section className="membership-tiers">
        <h2>Choose Your Change Maker Journey</h2>
        <div className="tiers-grid">
          {tiers.map((tier) => {
            const benefits = MEMBERSHIP_TIERS[tier];
            const isCurrent = tier === currentTier;
            const isComingSoon = betaMode && tier !== 'free';

            return (
              <div
                key={tier}
                className={`tier-card tier-${tier} ${isCurrent ? 'current' : ''} ${isComingSoon ? 'coming-soon' : ''}`}
              >
                <div className="tier-header">
                  <h3 className="tier-name">{tier.toUpperCase()}</h3>
                  {isCurrent && <div className="current-badge">Current</div>}
                  {isComingSoon && (
                    <div className="coming-soon-badge">
                      Launching Black Friday
                    </div>
                  )}
                </div>

                <div className="tier-price">
                  <span className="price-amount">
                    ${benefits.price.toFixed(2)}
                  </span>
                  <span className="price-period">/month</span>
                </div>

                {/* Social Features Highlight */}
                <div className="social-features-highlight">
                  <h4>✨ {benefits.socialFeatures.description}</h4>
                </div>

                {/* Features List */}
                <ul className="features-list">
                  {benefits.socialFeatures.highlights.map((highlight, i) => (
                    <li key={i} className="feature-item social-feature">
                      <span className="feature-icon">🌟</span>
                      {highlight}
                    </li>
                  ))}

                  {/* Other Key Features */}
                  {benefits.features.voiceAI && (
                    <li className="feature-item">
                      <span className="feature-icon">🎤</span>
                      Voice AI Shopping Assistant (
                      {benefits.limits.voiceSessionsPerMonth === -1
                        ? 'Unlimited'
                        : `${benefits.limits.voiceSessionsPerMonth}/month`}
                      )
                    </li>
                  )}

                  {benefits.features.shopTheLook && (
                    <li className="feature-item">
                      <span className="feature-icon">👗</span>
                      Shop the Look ({benefits.limits.shopTheLookUpdates})
                    </li>
                  )}

                  {benefits.features.eMagazine && (
                    <li className="feature-item">
                      <span className="feature-icon">📖</span>
                      Personalized E-Magazine (
                      {benefits.limits.eMagazineIssues})
                    </li>
                  )}

                  {benefits.features.personalStyling && (
                    <li className="feature-item">
                      <span className="feature-icon">💅</span>
                      Personal Styling Sessions (
                      {benefits.limits.stylingSessionsPerMonth}/month)
                    </li>
                  )}

                  {benefits.features.virtualTryOn && (
                    <li className="feature-item">
                      <span className="feature-icon">📸</span>
                      Virtual Try-On (AR/AI)
                    </li>
                  )}

                  {benefits.features.virtualCloset && (
                    <li className="feature-item">
                      <span className="feature-icon">👚</span>
                      Virtual Closet Manager
                    </li>
                  )}
                </ul>

                {/* CTA Button */}
                <div className="tier-cta">
                  {isCurrent ? (
                    <button className="btn-current" disabled>
                      Current Plan
                    </button>
                  ) : isComingSoon ? (
                    <Form method="post">
                      <input type="hidden" name="action" value="join-waitlist" />
                      <input
                        type="hidden"
                        name="tier"
                        value={tier}
                      />
                      <input
                        type="email"
                        name="email"
                        placeholder="your@email.com"
                        required
                        className="waitlist-email-input"
                      />
                      <button type="submit" className="btn-waitlist">
                        Join Waitlist - Get 50% Off Founding Member Pricing
                      </button>
                    </Form>
                  ) : (
                    <button className="btn-upgrade" disabled>
                      Coming Black Friday
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2>How Your Story Unfolds</h2>
        <div className="steps-grid">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Connect Your World</h3>
            <p>
              Link your social accounts (Instagram, TikTok, Facebook, Pinterest)
              and let us see your style journey.
            </p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>AI Creative Director Curates</h3>
            <p>
              Every week, our AI Creative Director selects your 3 best moments -
              style wins, life highlights, and impact milestones.
            </p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Your Story Takes Shape</h3>
            <p>
              See your personalized e-magazine with YOUR photos, YOUR impact,
              YOUR style evolution. This is your story in the making.
            </p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Inspire the Community</h3>
            <p>
              Share your change maker journey. Every purchase shows the lives
              you've impacted. Inspire others to join the movement.
            </p>
          </div>
        </div>
      </section>

      {/* Social Impact Features */}
      <section className="social-impact-features">
        <h2>More Than Shopping. It's Your Legacy.</h2>
        <div className="features-showcase">
          <div className="feature-showcase">
            <div className="feature-icon-large">📖</div>
            <h3>Your Personalized E-Magazine</h3>
            <p>
              Gold & Platinum members get a monthly/weekly e-magazine featuring
              YOUR life, YOUR style, YOUR impact. Curated by AI, starring YOU.
            </p>
          </div>
          <div className="feature-showcase">
            <div className="feature-icon-large">🎨</div>
            <h3>AI Creative Director</h3>
            <p>
              Gemini Pro analyzes your photos, style choices, and impact to tell
              your story authentically. No templates. No generic content. Just
              YOU.
            </p>
          </div>
          <div className="feature-showcase">
            <div className="feature-icon-large">💚</div>
            <h3>Track Your Real Impact</h3>
            <p>
              See exactly how many lives you've changed with your purchases. 5%
              of every order goes to causes YOU choose. Track it all.
            </p>
          </div>
          <div className="feature-showcase">
            <div className="feature-icon-large">🌍</div>
            <h3>Change Maker Community</h3>
            <p>
              Connect with other change makers. Share style tips. Inspire
              others. Build a movement of conscious consumers creating real
              change.
            </p>
          </div>
        </div>
      </section>

      {/* Beta CTA */}
      {betaMode && (
        <section className="beta-cta">
          <h2>Be a Founding Member</h2>
          <p>
            Join our beta THIS WEEK and lock in 50% off LIFETIME pricing on
            Silver, Gold, or Platinum when they launch Black Friday!
          </p>
          <div className="founding-member-benefits">
            <div className="benefit">🌟 50% Off Forever</div>
            <div className="benefit">🚀 First Access to All Features</div>
            <div className="benefit">👑 Founding Member Badge</div>
            <div className="benefit">💝 Exclusive Black Friday Deals</div>
          </div>
          {!customer && (
            <a href="/account/login" className="btn-cta-large">
              Sign Up for Beta Today
            </a>
          )}
        </section>
      )}

      <style>{`
        .membership-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .membership-hero {
          text-align: center;
          padding: 60px 20px;
          margin-bottom: 40px;
        }

        .hero-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          padding: 60px 40px;
          color: white;
        }

        .hero-title {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 20px;
          line-height: 1.2;
        }

        .hero-subtitle {
          font-size: 1.3rem;
          opacity: 0.95;
          max-width: 700px;
          margin: 0 auto;
        }

        .beta-badge {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          padding: 15px 30px;
          border-radius: 50px;
          margin-top: 30px;
          display: inline-block;
          font-weight: 600;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .community-impact {
          text-align: center;
          margin-bottom: 60px;
        }

        .community-impact h2 {
          font-size: 2.5rem;
          margin-bottom: 40px;
          color: #2d3748;
        }

        .impact-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 30px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .impact-stat {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 40px 20px;
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        .stat-number {
          font-size: 3rem;
          font-weight: 800;
          color: #667eea;
          margin-bottom: 10px;
        }

        .stat-label {
          font-size: 1rem;
          color: #4a5568;
          font-weight: 600;
        }

        .your-story-preview {
          margin-bottom: 60px;
        }

        .story-card {
          background: linear-gradient(135deg, #ffeaa7 0%, #fd79a8 100%);
          padding: 40px;
          border-radius: 20px;
          color: white;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }

        .story-card h3 {
          font-size: 2rem;
          margin-bottom: 15px;
        }

        .story-chapter {
          font-size: 1.2rem;
          margin-bottom: 30px;
          opacity: 0.95;
          font-style: italic;
        }

        .story-stats {
          display: flex;
          justify-content: center;
          gap: 50px;
          flex-wrap: wrap;
        }

        .story-stat {
          display: flex;
          flex-direction: column;
        }

        .story-stat .stat-value {
          font-size: 2rem;
          font-weight: 800;
        }

        .story-stat .stat-label {
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .membership-tiers {
          margin-bottom: 80px;
        }

        .membership-tiers h2 {
          text-align: center;
          font-size: 2.5rem;
          margin-bottom: 50px;
          color: #2d3748;
        }

        .tiers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
        }

        .tier-card {
          background: white;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .tier-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        }

        .tier-card.tier-platinum::before {
          background: linear-gradient(90deg, #ffd700 0%, #ffed4e 100%);
        }

        .tier-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }

        .tier-card.current {
          border: 3px solid #667eea;
        }

        .tier-card.coming-soon {
          opacity: 0.9;
        }

        .tier-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .tier-name {
          font-size: 1.8rem;
          font-weight: 800;
          color: #2d3748;
        }

        .current-badge, .coming-soon-badge {
          background: #667eea;
          color: white;
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .coming-soon-badge {
          background: #f59e0b;
        }

        .tier-price {
          margin-bottom: 30px;
        }

        .price-amount {
          font-size: 3rem;
          font-weight: 800;
          color: #667eea;
        }

        .price-period {
          font-size: 1.2rem;
          color: #718096;
        }

        .social-features-highlight {
          background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
          padding: 20px;
          border-radius: 15px;
          margin-bottom: 30px;
          border-left: 4px solid #667eea;
        }

        .social-features-highlight h4 {
          font-size: 1rem;
          color: #4a5568;
          line-height: 1.6;
          margin: 0;
        }

        .features-list {
          list-style: none;
          padding: 0;
          margin-bottom: 30px;
        }

        .feature-item {
          padding: 12px 0;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 0.95rem;
          color: #4a5568;
          line-height: 1.5;
        }

        .feature-item.social-feature {
          font-weight: 600;
          color: #2d3748;
        }

        .feature-item:last-child {
          border-bottom: none;
        }

        .feature-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .tier-cta {
          margin-top: 30px;
        }

        .waitlist-email-input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 1rem;
          margin-bottom: 10px;
        }

        .btn-current, .btn-upgrade, .btn-waitlist {
          width: 100%;
          padding: 15px 30px;
          border: none;
          border-radius: 10px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-current {
          background: #e2e8f0;
          color: #718096;
        }

        .btn-upgrade {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-waitlist {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .btn-upgrade:hover, .btn-waitlist:hover {
          transform: scale(1.02);
          box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        }

        .how-it-works {
          margin-bottom: 80px;
        }

        .how-it-works h2 {
          text-align: center;
          font-size: 2.5rem;
          margin-bottom: 50px;
          color: #2d3748;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 40px;
        }

        .step {
          text-align: center;
        }

        .step-number {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0 auto 20px;
        }

        .step h3 {
          font-size: 1.3rem;
          margin-bottom: 15px;
          color: #2d3748;
        }

        .step p {
          color: #718096;
          line-height: 1.7;
        }

        .social-impact-features {
          margin-bottom: 80px;
        }

        .social-impact-features h2 {
          text-align: center;
          font-size: 2.5rem;
          margin-bottom: 50px;
          color: #2d3748;
        }

        .features-showcase {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 40px;
        }

        .feature-showcase {
          text-align: center;
          padding: 40px 30px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 5px 25px rgba(0,0,0,0.08);
        }

        .feature-icon-large {
          font-size: 4rem;
          margin-bottom: 20px;
        }

        .feature-showcase h3 {
          font-size: 1.5rem;
          margin-bottom: 15px;
          color: #2d3748;
        }

        .feature-showcase p {
          color: #718096;
          line-height: 1.7;
        }

        .beta-cta {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 60px 40px;
          border-radius: 25px;
          text-align: center;
          margin-bottom: 40px;
        }

        .beta-cta h2 {
          font-size: 2.5rem;
          margin-bottom: 20px;
        }

        .beta-cta p {
          font-size: 1.2rem;
          margin-bottom: 40px;
          opacity: 0.95;
        }

        .founding-member-benefits {
          display: flex;
          justify-content: center;
          gap: 30px;
          flex-wrap: wrap;
          margin-bottom: 40px;
        }

        .benefit {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          padding: 15px 25px;
          border-radius: 30px;
          font-weight: 600;
          font-size: 1.1rem;
        }

        .btn-cta-large {
          display: inline-block;
          padding: 20px 60px;
          background: white;
          color: #667eea;
          font-size: 1.3rem;
          font-weight: 800;
          border-radius: 50px;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .btn-cta-large:hover {
          transform: scale(1.05);
          box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2rem;
          }

          .hero-subtitle {
            font-size: 1.1rem;
          }

          .tiers-grid {
            grid-template-columns: 1fr;
          }

          .impact-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .founding-member-benefits {
            flex-direction: column;
            gap: 15px;
          }
        }
      `}</style>
    </div>
  );
}
