import {json, type ActionFunctionArgs, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, useActionData, Form} from '@remix-run/react';
import {useState} from 'react';
import {
  visualSearch,
  getSpaceDesignAdvice,
  type VisualSearchResult,
} from '~/lib/visual-intelligence.service';

export async function loader({context}: LoaderFunctionArgs) {
  let customerId;
  if (await context.customerAccount.isLoggedIn()) {
    const {data} = await context.customerAccount.query(
      `query getCustomer { customer { id } }`
    );
    customerId = data?.customer?.id;
  }

  return json({customerId});
}

export async function action({request, context}: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get('action');
  const imageUrl = formData.get('imageUrl') as string;

  let customerId;
  if (await context.customerAccount.isLoggedIn()) {
    const {data} = await context.customerAccount.query(
      `query getCustomer { customer { id } }`
    );
    customerId = data?.customer?.id;
  }

  if (action === 'visual_search') {
    const category = formData.get('category') as any;
    const occasion = formData.get('occasion') as string;

    try {
      const results = await visualSearch(imageUrl, {
        customerId,
        category,
        occasion,
      });

      return json({success: true, results, type: 'search'});
    } catch (error) {
      return json({success: false, error: 'Visual search failed'});
    }
  }

  if (action === 'space_design') {
    const roomType = formData.get('roomType') as any;
    const style = formData.get('style') as string;
    const budget = formData.get('budget') as any;

    try {
      const advice = await getSpaceDesignAdvice(imageUrl, {
        roomType,
        style,
        budget,
      });

      return json({success: true, advice, type: 'design'});
    } catch (error) {
      return json({success: false, error: 'Space design advice failed'});
    }
  }

  return json({success: false});
}

export default function VisualSearchPage() {
  const {customerId} = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'product' | 'space'>('product');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to GCS (in production)
    // For now, use preview URL
    setUploadedImageUrl(reader.result as string);
  };

  return (
    <div className="visual-search-page">
      {/* Hero */}
      <section className="hero">
        <h1>Visual Intelligence</h1>
        <p className="hero-subtitle">
          Send a picture. Find the product. Get AI styling advice. Design your space.
        </p>
        <div className="mode-selector">
          <button
            className={`mode-btn ${searchMode === 'product' ? 'active' : ''}`}
            onClick={() => setSearchMode('product')}
          >
            🔍 Product Search & Styling
          </button>
          <button
            className={`mode-btn ${searchMode === 'space' ? 'active' : ''}`}
            onClick={() => setSearchMode('space')}
          >
            🏠 Space Design Advice
          </button>
        </div>
      </section>

      {/* Upload Section */}
      <section className="upload-section">
        <div className="upload-card">
          <h2>
            {searchMode === 'product'
              ? 'Upload Your Photo or Inspiration'
              : 'Upload Your Space Photo'}
          </h2>
          <p className="upload-description">
            {searchMode === 'product'
              ? 'Show us an outfit, a style you love, or what you\'re looking for. Our AI will find products or give you styling advice.'
              : 'Show us your room, and our AI will suggest products and design improvements.'}
          </p>

          <div className="upload-area">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              id="image-upload"
              className="file-input"
            />
            <label htmlFor="image-upload" className="upload-label">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="image-preview" />
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-icon">📸</div>
                  <div className="upload-text">
                    Click to upload or drag & drop
                  </div>
                  <div className="upload-subtext">JPG, PNG, or HEIC</div>
                </div>
              )}
            </label>
          </div>

          {uploadedImageUrl && (
            <Form method="post" className="search-form">
              <input type="hidden" name="imageUrl" value={uploadedImageUrl} />

              {searchMode === 'product' ? (
                <>
                  <input type="hidden" name="action" value="visual_search" />
                  <div className="form-row">
                    <div className="form-field">
                      <label>Category</label>
                      <select name="category">
                        <option value="">Any</option>
                        <option value="fashion">Fashion</option>
                        <option value="gadgets">Gadgets</option>
                        <option value="home">Home</option>
                        <option value="selfcare">Self Care</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Occasion (Optional)</label>
                      <input
                        type="text"
                        name="occasion"
                        placeholder="e.g., work, date night, casual"
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-search">
                    🔍 Find Products & Get Styling Advice
                  </button>
                </>
              ) : (
                <>
                  <input type="hidden" name="action" value="space_design" />
                  <div className="form-row">
                    <div className="form-field">
                      <label>Room Type</label>
                      <select name="roomType" required>
                        <option value="">Select...</option>
                        <option value="bedroom">Bedroom</option>
                        <option value="living_room">Living Room</option>
                        <option value="kitchen">Kitchen</option>
                        <option value="bathroom">Bathroom</option>
                        <option value="office">Office</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Desired Style</label>
                      <input
                        type="text"
                        name="style"
                        placeholder="e.g., modern, boho, minimalist"
                      />
                    </div>
                    <div className="form-field">
                      <label>Budget</label>
                      <select name="budget">
                        <option value="low">Budget-Friendly</option>
                        <option value="medium">Medium</option>
                        <option value="high">Premium</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="btn-search">
                    🏠 Get Design Advice
                  </button>
                </>
              )}
            </Form>
          )}
        </div>
      </section>

      {/* Results */}
      {actionData?.success && actionData.type === 'search' && (
        <section className="results-section">
          <h2>AI Analysis & Recommendations</h2>

          {actionData.results.aiAdvice && (
            <div className="ai-advice-card">
              <h3>✨ AI Insights</h3>
              <p className="advice-summary">{actionData.results.aiAdvice.summary}</p>
              <div className="suggestions">
                <h4>Suggestions:</h4>
                <ul>
                  {actionData.results.aiAdvice.suggestions.map((tip: string, i: number) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {actionData.results.products.length > 0 && (
            <div className="products-grid">
              <h3>Recommended Products</h3>
              <div className="product-cards">
                {actionData.results.products.map((product: any) => (
                  <div key={product.productId} className="product-card">
                    <img src={product.imageUrl} alt={product.title} />
                    <div className="product-info">
                      <h4>{product.title}</h4>
                      <p className="product-category">{product.category}</p>
                      <p className="product-reason">{product.reason}</p>
                      <div className="product-footer">
                        <span className="product-price">${product.price}</span>
                        <span className="match-score">
                          {Math.round(product.matchScore * 100)}% Match
                        </span>
                      </div>
                      <a href={`/products/${product.handle}`} className="btn-view">
                        View Product
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {actionData.results.stylingTips && (
            <div className="styling-tips">
              <h3>💡 Styling Tips</h3>
              <ul>
                {actionData.results.stylingTips.map((tip: string, i: number) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {actionData?.success && actionData.type === 'design' && (
        <section className="design-advice-section">
          <h2>🏠 Space Design Analysis</h2>

          <div className="design-analysis">
            <h3>Current Space Analysis</h3>
            <p>{actionData.advice.analysis}</p>
          </div>

          <div className="design-recommendations">
            <h3>Recommendations</h3>
            {actionData.advice.recommendations.map((rec: any, i: number) => (
              <div key={i} className={`recommendation priority-${rec.priority}`}>
                <div className="rec-header">
                  <span className="rec-product">{rec.productType}</span>
                  <span className={`rec-priority ${rec.priority}`}>
                    {rec.priority} priority
                  </span>
                </div>
                <p className="rec-reason">{rec.reason}</p>
                <p className="rec-placement">💡 {rec.placement}</p>
              </div>
            ))}
          </div>

          <div className="color-scheme">
            <h3>Suggested Color Scheme</h3>
            <div className="color-palette">
              {actionData.advice.colorScheme.map((color: string, i: number) => (
                <div
                  key={i}
                  className="color-swatch"
                  style={{backgroundColor: color}}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className="shopping-list">
            <h3>🛍️ Shopping List</h3>
            <div className="shopping-items">
              {actionData.advice.shoppingList.map((item: any, i: number) => (
                <a
                  key={i}
                  href={`/search?q=${encodeURIComponent(item.searchQuery)}`}
                  className="shopping-item"
                >
                  <span className="item-category">{item.category}</span>
                  <span className="item-query">{item.searchQuery}</span>
                  <span className="item-action">Search →</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Showcase */}
      <section className="features-showcase">
        <h2>What You Can Do with Visual Intelligence</h2>
        <div className="features-grid">
          <div className="feature">
            <div className="feature-icon">🔍</div>
            <h3>Find Any Product</h3>
            <p>See something you love? Upload a photo and we'll find it or similar items.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">👗</div>
            <h3>Complete Your Outfit</h3>
            <p>Show us what you have, we'll suggest what goes with it perfectly.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🏠</div>
            <h3>Design Your Space</h3>
            <p>Upload room photos, get professional design advice and product recommendations.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">✨</div>
            <h3>AI Styling Coach</h3>
            <p>Get personalized style advice for any occasion, mood, or moment.</p>
          </div>
        </div>
      </section>

      <style>{`
        .visual-search-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .hero {
          text-align: center;
          padding: 60px 20px;
          margin-bottom: 60px;
        }

        .hero h1 {
          font-size: 3.5rem;
          font-weight: 900;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 1.4rem;
          color: #718096;
          margin-bottom: 40px;
        }

        .mode-selector {
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .mode-btn {
          padding: 15px 40px;
          border: 3px solid #e2e8f0;
          background: white;
          border-radius: 50px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .mode-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: #667eea;
        }

        .mode-btn:hover {
          transform: scale(1.05);
        }

        .upload-section {
          margin-bottom: 80px;
        }

        .upload-card {
          background: white;
          border-radius: 25px;
          padding: 60px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }

        .upload-card h2 {
          font-size: 2rem;
          margin-bottom: 15px;
          color: #2d3748;
        }

        .upload-description {
          font-size: 1.1rem;
          color: #718096;
          margin-bottom: 40px;
        }

        .upload-area {
          margin-bottom: 30px;
        }

        .file-input {
          display: none;
        }

        .upload-label {
          display: block;
          cursor: pointer;
        }

        .upload-placeholder {
          border: 3px dashed #cbd5e0;
          border-radius: 20px;
          padding: 80px 40px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .upload-placeholder:hover {
          border-color: #667eea;
          background: #f7fafc;
        }

        .upload-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }

        .upload-text {
          font-size: 1.3rem;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 10px;
        }

        .upload-subtext {
          color: #a0aec0;
        }

        .image-preview {
          width: 100%;
          max-height: 500px;
          object-fit: contain;
          border-radius: 20px;
        }

        .search-form {
          margin-top: 30px;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .form-field label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #2d3748;
        }

        .form-field input,
        .form-field select {
          width: 100%;
          padding: 12px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 1rem;
        }

        .btn-search {
          width: 100%;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 15px;
          font-size: 1.3rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-search:hover {
          transform: scale(1.02);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }

        .results-section, .design-advice-section {
          margin-bottom: 80px;
        }

        .ai-advice-card {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          padding: 40px;
          border-radius: 20px;
          margin-bottom: 40px;
        }

        .ai-advice-card h3 {
          font-size: 1.8rem;
          margin-bottom: 20px;
          color: #92400e;
        }

        .advice-summary {
          font-size: 1.2rem;
          color: #78350f;
          margin-bottom: 30px;
          line-height: 1.7;
        }

        .suggestions h4 {
          font-size: 1.2rem;
          margin-bottom: 15px;
          color: #92400e;
        }

        .suggestions ul {
          list-style: none;
          padding: 0;
        }

        .suggestions li {
          padding: 12px 0;
          padding-left: 30px;
          position: relative;
          color: #78350f;
        }

        .suggestions li::before {
          content: '✨';
          position: absolute;
          left: 0;
        }

        .products-grid h3 {
          font-size: 2rem;
          margin-bottom: 30px;
          color: #2d3748;
        }

        .product-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 30px;
        }

        .product-card {
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 5px 20px rgba(0,0,0,0.08);
          transition: transform 0.3s ease;
        }

        .product-card:hover {
          transform: translateY(-5px);
        }

        .product-card img {
          width: 100%;
          height: 250px;
          object-fit: cover;
        }

        .product-info {
          padding: 20px;
        }

        .product-info h4 {
          font-size: 1.2rem;
          margin-bottom: 10px;
          color: #2d3748;
        }

        .product-category {
          text-transform: uppercase;
          font-size: 0.8rem;
          color: #667eea;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .product-reason {
          font-size: 0.95rem;
          color: #718096;
          margin-bottom: 15px;
          line-height: 1.5;
        }

        .product-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .product-price {
          font-size: 1.5rem;
          font-weight: 800;
          color: #2d3748;
        }

        .match-score {
          background: #d1fae5;
          color: #065f46;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .btn-view {
          display: block;
          width: 100%;
          padding: 12px;
          background: #667eea;
          color: white;
          text-align: center;
          text-decoration: none;
          border-radius: 10px;
          font-weight: 700;
          transition: all 0.3s ease;
        }

        .btn-view:hover {
          background: #764ba2;
        }

        .styling-tips {
          background: white;
          padding: 40px;
          border-radius: 20px;
          margin-top: 40px;
        }

        .styling-tips h3 {
          font-size: 1.8rem;
          margin-bottom: 20px;
          color: #2d3748;
        }

        .styling-tips ul {
          list-style: none;
          padding: 0;
        }

        .styling-tips li {
          padding: 15px 0;
          padding-left: 35px;
          position: relative;
          color: #4a5568;
          font-size: 1.05rem;
          line-height: 1.6;
          border-bottom: 1px solid #e2e8f0;
        }

        .styling-tips li::before {
          content: '💡';
          position: absolute;
          left: 0;
          font-size: 1.3rem;
        }

        .design-analysis, .design-recommendations, .color-scheme, .shopping-list {
          background: white;
          padding: 40px;
          border-radius: 20px;
          margin-bottom: 30px;
        }

        .recommendation {
          padding: 20px;
          border-left: 4px solid #cbd5e0;
          margin-bottom: 20px;
          background: #f7fafc;
          border-radius: 0 10px 10px 0;
        }

        .recommendation.priority-high {
          border-left-color: #f56565;
        }

        .recommendation.priority-medium {
          border-left-color: #ed8936;
        }

        .recommendation.priority-low {
          border-left-color: #48bb78;
        }

        .rec-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .rec-product {
          font-weight: 700;
          font-size: 1.1rem;
          color: #2d3748;
        }

        .rec-priority {
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .rec-priority.high {
          background: #fed7d7;
          color: #c53030;
        }

        .rec-priority.medium {
          background: #feebc8;
          color: #c05621;
        }

        .rec-priority.low {
          background: #c6f6d5;
          color: #276749;
        }

        .color-palette {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }

        .color-swatch {
          width: 100px;
          height: 100px;
          border-radius: 15px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .color-swatch:hover {
          transform: scale(1.1);
        }

        .shopping-items {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .shopping-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: #f7fafc;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .shopping-item:hover {
          background: #667eea;
          color: white;
          transform: translateX(10px);
        }

        .item-category {
          text-transform: uppercase;
          font-size: 0.85rem;
          font-weight: 700;
          padding: 5px 12px;
          background: white;
          border-radius: 20px;
          color: #667eea;
        }

        .item-query {
          flex: 1;
          padding: 0 20px;
          font-weight: 600;
        }

        .item-action {
          font-weight: 700;
        }

        .features-showcase {
          padding: 80px 20px;
        }

        .features-showcase h2 {
          text-align: center;
          font-size: 2.5rem;
          margin-bottom: 60px;
          color: #2d3748;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 40px;
        }

        .feature {
          text-align: center;
          padding: 40px 30px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 5px 20px rgba(0,0,0,0.08);
        }

        .feature-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }

        .feature h3 {
          font-size: 1.4rem;
          margin-bottom: 15px;
          color: #2d3748;
        }

        .feature p {
          color: #718096;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .hero h1 {
            font-size: 2.2rem;
          }

          .upload-card {
            padding: 30px 20px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .product-cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
