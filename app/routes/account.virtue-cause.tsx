import {json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, Form} from '@remix-run/react';
import {
  getUserVirtueCause,
  setUserVirtueCause,
  getUserVirtueImpact,
} from '~/lib/virtue-impact.service.server';
import {VIRTUE_CAUSES, type VirtueCause} from '~/lib/virtue-impact.types';
import {generateQRCode, createWowMoment} from '~/lib/qr-share-rewards.service';

export async function loader({context}: LoaderFunctionArgs) {
  // Require authentication
  if (!(await context.customerAccount.isLoggedIn())) {
    return redirect('/account/login');
  }

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

  // Get current selection and impact
  const selectedCause = await getUserVirtueCause(customerId);
  const impact = await getUserVirtueImpact(customerId);

  // Generate QR code for impact sharing
  const {qrCodeDataUrl, shareUrl} =
    impact.totalDonated > 0
      ? await generateQRCode({
          contentType: 'my_impact',
          contentId: customerId,
          customerId,
          campaign: 'share_impact',
        })
      : {qrCodeDataUrl: null, shareUrl: null};

  return json({
    customer,
    selectedCause,
    impact,
    qrCodeDataUrl,
    shareUrl,
  });
}

export async function action({request, context}: ActionFunctionArgs) {
  if (!(await context.customerAccount.isLoggedIn())) {
    return redirect('/account/login');
  }

  const {data} = await context.customerAccount.query(
    `query getCustomer { customer { id } }`
  );
  const customerId = data?.customer?.id;

  if (!customerId) {
    return json({success: false, message: 'Not authenticated'});
  }

  const formData = await request.formData();
  const action = formData.get('action');

  if (action === 'select_cause') {
    const cause = formData.get('cause') as VirtueCause;

    try {
      await setUserVirtueCause(customerId, cause);

      // Create wow moment for selecting cause
      if (cause) {
        await createWowMoment(customerId, {
          type: 'milestone',
          metadata: {cause, action: 'selected_virtue_cause'},
        });
      }

      return json({success: true, message: 'Virtue cause updated!'});
    } catch (error) {
      return json({success: false, message: 'Failed to update cause'});
    }
  }

  return json({success: false});
}

export default function VirtueCausePage() {
  const {customer, selectedCause, impact, qrCodeDataUrl, shareUrl} =
    useLoaderData<typeof loader>();

  const causes: VirtueCause[] = [
    'education',
    'environment',
    'healthcare',
    'animal_welfare',
    'arts_culture',
    'economic_empowerment',
  ];

  return (
    <div className="virtue-cause-page">
      {/* Hero Section */}
      <section className="virtue-hero">
        <div className="hero-content">
          <h1>Your Impact. Your Choice.</h1>
          <p className="hero-subtitle">
            5% of every purchase goes to the cause YOU choose.
            <br />
            Powered by <strong>Virtue Impact</strong>
          </p>
        </div>
      </section>

      {/* Current Impact (if any) */}
      {impact.totalDonated > 0 && (
        <section className="current-impact">
          <h2>Your Change Maker Impact</h2>
          <div className="impact-grid">
            <div className="impact-stat-large">
              <div className="stat-icon">💚</div>
              <div className="stat-value">${impact.totalDonated.toFixed(2)}</div>
              <div className="stat-label">Total Donated</div>
            </div>
            <div className="impact-stat-large">
              <div className="stat-icon">🌟</div>
              <div className="stat-value">{impact.livesImpacted}</div>
              <div className="stat-label">Lives Impacted</div>
            </div>
            <div className="impact-stat-large">
              <div className="stat-icon">🛍️</div>
              <div className="stat-value">{impact.totalOrders}</div>
              <div className="stat-label">Impact Orders</div>
            </div>
            <div className="impact-stat-large">
              <div className="stat-icon">❤️</div>
              <div className="stat-value">{impact.causesSupported.length}</div>
              <div className="stat-label">Causes Supported</div>
            </div>
          </div>

          {/* Share Your Impact */}
          {qrCodeDataUrl && shareUrl && (
            <div className="share-impact">
              <h3>Share Your Impact</h3>
              <p>Show your friends the change you're making!</p>
              <div className="qr-share-container">
                <img src={qrCodeDataUrl} alt="Share QR Code" className="qr-code" />
                <div className="share-buttons">
                  <a
                    href={`https://www.instagram.com/stories/create?text=I've donated $${impact.totalDonated.toFixed(2)} and impacted ${impact.livesImpacted} lives through @wowstore! ${shareUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-share instagram"
                  >
                    📸 Instagram Story
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-share facebook"
                  >
                    📘 Share on Facebook
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=I've donated $${impact.totalDonated.toFixed(2)} and impacted ${impact.livesImpacted} lives through @wowstore! Join me in making a difference. &url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-share twitter"
                  >
                    🐦 Tweet Your Impact
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Recent Donations */}
          {impact.recentDonations.length > 0 && (
            <div className="recent-donations">
              <h3>Recent Donations</h3>
              <div className="donations-list">
                {impact.recentDonations.map((donation, i) => (
                  <div key={i} className="donation-item">
                    <div className="donation-info">
                      <span className="donation-order">Order #{donation.orderNumber}</span>
                      <span className="donation-cause">{donation.cause}</span>
                    </div>
                    <div className="donation-amount">${donation.amount.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Cause Selection */}
      <section className="cause-selection">
        <h2>Choose Your Virtue Cause</h2>
        <p className="section-subtitle">
          Select the cause that matters most to you. You can change it anytime.
        </p>

        <div className="causes-grid">
          {causes.map((cause) => {
            const causeData = VIRTUE_CAUSES[cause];
            const isSelected = selectedCause === cause;

            return (
              <Form method="post" key={cause} className="cause-card-form">
                <input type="hidden" name="action" value="select_cause" />
                <input type="hidden" name="cause" value={cause} />
                <button
                  type="submit"
                  className={`cause-card ${isSelected ? 'selected' : ''}`}
                >
                  <div className="cause-icon">{causeData.icon}</div>
                  <h3 className="cause-name">{causeData.causeName}</h3>
                  <p className="cause-description">{causeData.description}</p>
                  {isSelected && (
                    <div className="selected-badge">✓ Your Current Cause</div>
                  )}
                </button>
              </Form>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2>How Virtue Impact Works</h2>
        <div className="steps-grid">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Shop WowStore</h3>
            <p>Browse and purchase products you love, guilt-free.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>5% Donated Automatically</h3>
            <p>
              At checkout, 5% of your order total goes to your chosen cause via
              Virtue Impact.
            </p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Track Your Impact</h3>
            <p>
              See exactly how much you've donated and how many lives you've
              changed.
            </p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Share & Inspire</h3>
            <p>
              Share your impact with friends using QR codes and social posts.
              Build your tribe of change makers.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      {!selectedCause && (
        <section className="cta-section">
          <h2>Select Your Cause & Start Shopping</h2>
          <p>
            Every purchase creates impact. Choose your virtue cause above and
            start making a difference today.
          </p>
        </section>
      )}

      {selectedCause && impact.totalDonated === 0 && (
        <section className="cta-section">
          <h2>Ready to Make Your First Impact?</h2>
          <p>
            You've chosen <strong>{VIRTUE_CAUSES[selectedCause].causeName}</strong>
            . Start shopping and watch your impact grow!
          </p>
          <a href="/collections/all" className="btn-cta">
            Start Shopping
          </a>
        </section>
      )}

      <style>{`
        .virtue-cause-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .virtue-hero {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 80px 40px;
          border-radius: 25px;
          text-align: center;
          margin-bottom: 60px;
        }

        .virtue-hero h1 {
          font-size: 3.5rem;
          font-weight: 900;
          margin-bottom: 20px;
        }

        .hero-subtitle {
          font-size: 1.4rem;
          opacity: 0.95;
          line-height: 1.6;
        }

        .current-impact {
          margin-bottom: 80px;
        }

        .current-impact h2 {
          text-align: center;
          font-size: 2.5rem;
          margin-bottom: 40px;
          color: #2d3748;
        }

        .impact-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 30px;
          margin-bottom: 60px;
        }

        .impact-stat-large {
          background: white;
          padding: 40px;
          border-radius: 20px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          transition: transform 0.3s ease;
        }

        .impact-stat-large:hover {
          transform: translateY(-5px);
        }

        .stat-icon {
          font-size: 3rem;
          margin-bottom: 15px;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 800;
          color: #10b981;
          margin-bottom: 10px;
        }

        .stat-label {
          font-size: 1rem;
          color: #718096;
          font-weight: 600;
        }

        .share-impact {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          padding: 50px;
          border-radius: 25px;
          text-align: center;
          margin-bottom: 60px;
        }

        .share-impact h3 {
          font-size: 2rem;
          margin-bottom: 15px;
          color: #92400e;
        }

        .share-impact p {
          font-size: 1.2rem;
          color: #78350f;
          margin-bottom: 40px;
        }

        .qr-share-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 30px;
        }

        .qr-code {
          width: 200px;
          height: 200px;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }

        .share-buttons {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .btn-share {
          padding: 15px 30px;
          border-radius: 50px;
          text-decoration: none;
          font-weight: 700;
          font-size: 1.1rem;
          transition: all 0.3s ease;
          box-shadow: 0 5px 15px rgba(0,0,0,0.15);
        }

        .btn-share.instagram {
          background: linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);
          color: white;
        }

        .btn-share.facebook {
          background: #1877f2;
          color: white;
        }

        .btn-share.twitter {
          background: #1da1f2;
          color: white;
        }

        .btn-share:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 25px rgba(0,0,0,0.25);
        }

        .recent-donations {
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 5px 20px rgba(0,0,0,0.08);
        }

        .recent-donations h3 {
          font-size: 1.8rem;
          margin-bottom: 30px;
          color: #2d3748;
        }

        .donations-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .donation-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: #f7fafc;
          border-radius: 12px;
          border-left: 4px solid #10b981;
        }

        .donation-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .donation-order {
          font-weight: 600;
          color: #2d3748;
        }

        .donation-cause {
          font-size: 0.9rem;
          color: #718096;
        }

        .donation-amount {
          font-size: 1.3rem;
          font-weight: 800;
          color: #10b981;
        }

        .cause-selection {
          margin-bottom: 80px;
        }

        .cause-selection h2 {
          text-align: center;
          font-size: 2.5rem;
          margin-bottom: 20px;
          color: #2d3748;
        }

        .section-subtitle {
          text-align: center;
          font-size: 1.2rem;
          color: #718096;
          margin-bottom: 50px;
        }

        .causes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 30px;
        }

        .cause-card-form {
          width: 100%;
        }

        .cause-card {
          width: 100%;
          background: white;
          border: 3px solid transparent;
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 5px 20px rgba(0,0,0,0.08);
        }

        .cause-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(0,0,0,0.15);
          border-color: #10b981;
        }

        .cause-card.selected {
          border-color: #10b981;
          background: linear-gradient(135deg, #d1fae515 0%, #6ee7b715 100%);
        }

        .cause-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }

        .cause-name {
          font-size: 1.6rem;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 15px;
        }

        .cause-description {
          font-size: 1rem;
          color: #718096;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .selected-badge {
          background: #10b981;
          color: white;
          padding: 10px 20px;
          border-radius: 30px;
          font-weight: 700;
          display: inline-block;
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
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          font-weight: 900;
          margin: 0 auto 25px;
        }

        .step h3 {
          font-size: 1.4rem;
          margin-bottom: 15px;
          color: #2d3748;
        }

        .step p {
          color: #718096;
          line-height: 1.7;
        }

        .cta-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 60px 40px;
          border-radius: 25px;
          text-align: center;
          margin-bottom: 40px;
        }

        .cta-section h2 {
          font-size: 2.5rem;
          margin-bottom: 20px;
        }

        .cta-section p {
          font-size: 1.3rem;
          opacity: 0.95;
          margin-bottom: 40px;
        }

        .btn-cta {
          display: inline-block;
          padding: 20px 50px;
          background: white;
          color: #667eea;
          font-size: 1.3rem;
          font-weight: 800;
          border-radius: 50px;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .btn-cta:hover {
          transform: scale(1.05);
          box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }

        @media (max-width: 768px) {
          .virtue-hero h1 {
            font-size: 2.2rem;
          }

          .hero-subtitle {
            font-size: 1.1rem;
          }

          .impact-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .causes-grid {
            grid-template-columns: 1fr;
          }

          .share-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
