import {json, type LoaderFunctionArgs, type MetaFunction} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {useState} from 'react';

export const meta: MetaFunction<typeof loader> = () => {
  return [{title: 'Creative Studio | WowStore'}];
};

export async function loader({context}: LoaderFunctionArgs) {
  return json({});
}

type ProjectType = 'storybook' | 'video' | 'campaign';

export default function CreativeStudio() {
  const [projectType, setProjectType] = useState<ProjectType>('storybook');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // TODO: Call n8n webhook
      const response = await fetch('/api/creative/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          projectType,
          prompt,
          userId: '1',
        }),
      });

      const result = await response.json();
      alert(`${projectType} generation started! Check back in a few minutes.`);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to start generation. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="creative-studio-page" style={{background: '#0a0a0a', minHeight: '100vh', padding: '2rem'}}>
      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">
          WowStore Creative Studio
        </h1>
        <p className="text-xl text-gray-400 mb-4">
          From Nano Banana to Short Films - Your AI Creative Partner
        </p>
        <p className="text-lg text-purple-400">
          6 Image Models + 7 Video Models = Unlimited Creativity
        </p>
      </header>

      {/* Project Type Selector */}
      <section className="mb-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            What Would You Like to Create?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button
              onClick={() => setProjectType('storybook')}
              className={`p-8 rounded-xl border-2 transition-all text-center ${
                projectType === 'storybook'
                  ? 'bg-purple-600/20 border-purple-500'
                  : 'bg-gray-900 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-bold text-white mb-2">Storybook</h3>
              <p className="text-sm text-gray-400">
                Illustrated books with consistent characters
              </p>
              <p className="text-xs text-purple-400 mt-2">10-15 minutes</p>
            </button>

            <button
              onClick={() => setProjectType('video')}
              className={`p-8 rounded-xl border-2 transition-all text-center ${
                projectType === 'video'
                  ? 'bg-blue-600/20 border-blue-500'
                  : 'bg-gray-900 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="text-6xl mb-4">🎬</div>
              <h3 className="text-xl font-bold text-white mb-2">Short Film</h3>
              <p className="text-sm text-gray-400">
                Cinematic videos up to 2 minutes
              </p>
              <p className="text-xs text-blue-400 mt-2">15-20 minutes</p>
            </button>

            <button
              onClick={() => setProjectType('campaign')}
              className={`p-8 rounded-xl border-2 transition-all text-center ${
                projectType === 'campaign'
                  ? 'bg-green-600/20 border-green-500'
                  : 'bg-gray-900 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-white mb-2">Full Campaign</h3>
              <p className="text-sm text-gray-400">
                Images, videos, and social content
              </p>
              <p className="text-xs text-green-400 mt-2">50-70 minutes</p>
            </button>
          </div>
        </div>
      </section>

      {/* Creator Interface */}
      <section className="mb-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
            <h3 className="text-2xl font-bold text-white mb-6">
              {projectType === 'storybook' && 'Storybook Generator'}
              {projectType === 'video' && 'Video Producer'}
              {projectType === 'campaign' && 'Campaign Creator'}
            </h3>

            <div className="mb-6">
              <label htmlFor="prompt" className="block text-white font-semibold mb-2">
                {projectType === 'storybook' && 'Story Concept'}
                {projectType === 'video' && 'Video Concept'}
                {projectType === 'campaign' && 'Campaign Theme'}
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  projectType === 'storybook'
                    ? "e.g., The Adventures of Nano Banana - A brave banana discovers a magical surfboard and surfs through space..."
                    : projectType === 'video'
                      ? "e.g., 2-minute brand film about sustainable fashion, showing the journey from design to delivery..."
                      : "e.g., Summer beach collection launch - vibrant designs, product showcases, social teasers..."
                }
                className="w-full h-40 px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none resize-none"
              />
            </div>

            {/* Settings based on project type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {projectType === 'storybook' && (
                <>
                  <div>
                    <label className="block text-white text-sm mb-2">Number of Pages</label>
                    <select className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700">
                      <option>10 pages</option>
                      <option>15 pages</option>
                      <option>20 pages</option>
                      <option>30 pages</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white text-sm mb-2">Art Style</label>
                    <select className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700">
                      <option>Watercolor</option>
                      <option>Cartoon</option>
                      <option>Realistic</option>
                      <option>Anime</option>
                    </select>
                  </div>
                </>
              )}

              {projectType === 'video' && (
                <>
                  <div>
                    <label className="block text-white text-sm mb-2">Video Length</label>
                    <select className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700">
                      <option>30 seconds</option>
                      <option>60 seconds</option>
                      <option>90 seconds</option>
                      <option>2 minutes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white text-sm mb-2">Video Style</label>
                    <select className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700">
                      <option>Cinematic</option>
                      <option>Product Showcase</option>
                      <option>Narrative</option>
                      <option>Artistic</option>
                    </select>
                  </div>
                </>
              )}

              {projectType === 'campaign' && (
                <>
                  <div>
                    <label className="block text-white text-sm mb-2">Number of Designs</label>
                    <select className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700">
                      <option>5 designs</option>
                      <option>10 designs</option>
                      <option>15 designs</option>
                      <option>20 designs</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white text-sm mb-2">Include Video</label>
                    <select className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700">
                      <option>Yes - 60s commercial</option>
                      <option>Yes - Multiple shorts</option>
                      <option>No</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={!prompt || generating}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {generating ? 'Generating...' : `Generate ${projectType === 'storybook' ? 'Storybook' : projectType === 'video' ? 'Video' : 'Campaign'}`}
            </button>
          </div>
        </div>
      </section>

      {/* AI Models Showcase */}
      <section className="mb-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Powered by Multi-Model AI
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Image Models */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-xl font-bold text-purple-400 mb-4">
                6 Image Generation Models
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center">
                  <span className="text-purple-500 mr-3">•</span>
                  <div>
                    <strong>Imagen 3</strong> - High quality designs
                  </div>
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-3">•</span>
                  <div>
                    <strong>DALL-E 3</strong> - Creative concepts
                  </div>
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-3">•</span>
                  <div>
                    <strong>Stable Diffusion XL</strong> - Fast iterations
                  </div>
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-3">•</span>
                  <div>
                    <strong>Midjourney</strong> - Artistic quality
                  </div>
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-3">•</span>
                  <div>
                    <strong>Ideogram</strong> - Typography & text
                  </div>
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-3">•</span>
                  <div>
                    <strong>Flux Pro</strong> - Photorealistic
                  </div>
                </li>
              </ul>
            </div>

            {/* Video Models */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-xl font-bold text-blue-400 mb-4">
                7 Video Generation Models
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">•</span>
                  <div>
                    <strong>Veo 3</strong> - Cinematic films (2 min)
                  </div>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">•</span>
                  <div>
                    <strong>Sora</strong> - High-quality narratives
                  </div>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">•</span>
                  <div>
                    <strong>Runway Gen-3</strong> - Product showcases
                  </div>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">•</span>
                  <div>
                    <strong>Pika 2.0</strong> - Quick loops
                  </div>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">•</span>
                  <div>
                    <strong>Seedream</strong> - Artistic videos
                  </div>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">•</span>
                  <div>
                    <strong>Kling AI</strong> - Character animation
                  </div>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">•</span>
                  <div>
                    <strong>LumaLabs</strong> - 3D visualizations
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Example Projects */}
      <section>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            What Others Have Created
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                type: 'Storybook',
                title: 'The Adventures of Nano Banana',
                time: '12 minutes',
                description: '15-page illustrated children\'s book',
                color: 'purple',
              },
              {
                type: 'Video',
                title: 'WowStore Brand Film',
                time: '18 minutes',
                description: '2-minute cinematic brand story',
                color: 'blue',
              },
              {
                type: 'Campaign',
                title: 'Summer Beach Collection',
                time: '65 minutes',
                description: '10 designs + videos + social content',
                color: 'green',
              },
            ].map((project) => (
              <div
                key={project.title}
                className="bg-gray-900 rounded-xl p-6 border border-gray-800"
              >
                <div className={`text-sm text-${project.color}-400 mb-2`}>{project.type}</div>
                <h3 className="text-lg font-bold text-white mb-2">{project.title}</h3>
                <p className="text-sm text-gray-400 mb-3">{project.description}</p>
                <div className="text-xs text-gray-500">Completed in {project.time}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
