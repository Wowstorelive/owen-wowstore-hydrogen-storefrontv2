import {json, type LoaderFunctionArgs, type MetaFunction} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {useState} from 'react';
import {CollaborationNetwork, type TeamMember, type CollaborationLink} from '~/components/d3-factory';

export const meta: MetaFunction<typeof loader> = () => {
  return [{title: 'POD Design Studio | WowStore'}];
};

export async function loader({context}: LoaderFunctionArgs) {
  // In production, fetch from Firestore/API
  const teamMembers: TeamMember[] = [
    {
      id: '1',
      name: 'You',
      role: 'designer',
      activeDesigns: 2,
    },
  ];

  const links: CollaborationLink[] = [];

  return json({
    teamMembers,
    links,
  });
}

export default function PODStudio() {
  const {teamMembers, links} = useLoaderData<typeof loader>();
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [designPrompt, setDesignPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerateDesign = async () => {
    setGenerating(true);
    try {
      // TODO: Call your API endpoint
      const response = await fetch('/api/creative/pod-design', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          prompt: designPrompt,
          userId: '1',
          style: 'artistic',
        }),
      });

      const result = await response.json();
      alert('Design generation started! Job ID: ' + result.jobId);
    } catch (error) {
      console.error('Error generating design:', error);
      alert('Failed to generate design. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="pod-studio-page" style={{background: '#0a0a0a', minHeight: '100vh', padding: '2rem'}}>
      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">
          WowStore POD Studio
        </h1>
        <p className="text-xl text-gray-400">
          Create with AI • Collaborate • Print on Demand
        </p>
        <p className="text-lg text-purple-400 italic mt-2">
          "Nano Banana alone, with friends, or as a team"
        </p>
      </header>

      {/* AI Design Generator */}
      <section className="mb-12 max-w-4xl mx-auto">
        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-4">
            AI Design Generator
          </h2>
          <p className="text-gray-400 mb-6">
            Describe your design idea and our AI will generate unique artwork for your products.
          </p>

          <div className="mb-4">
            <label htmlFor="design-prompt" className="block text-white font-semibold mb-2">
              Design Prompt
            </label>
            <textarea
              id="design-prompt"
              value={designPrompt}
              onChange={(e) => setDesignPrompt(e.target.value)}
              placeholder="e.g., Nano Banana surfing on cosmic waves with vibrant colors..."
              className="w-full h-32 px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={handleGenerateDesign}
            disabled={!designPrompt || generating}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {generating ? 'Generating...' : 'Generate Design'}
          </button>
        </div>
      </section>

      {/* Team Collaboration */}
      <section className="mb-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">
            Team Collaboration
          </h2>
          <p className="text-gray-400 mb-6 text-center">
            Work together on AI-generated designs. Invite friends or build a professional team.
          </p>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <CollaborationNetwork
              teamMembers={teamMembers}
              links={links}
              onNodeClick={(member) => {
                setSelectedMember(member);
              }}
              width={1200}
              height={600}
              theme="dark"
            />
          </div>

          {selectedMember && (
            <div className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
              <h3 className="text-xl font-bold mb-2">{selectedMember.name}</h3>
              <p className="mb-2">Role: {selectedMember.role}</p>
              <p>Active Designs: {selectedMember.activeDesigns}</p>
            </div>
          )}
        </div>
      </section>

      {/* Product Categories */}
      <section className="mb-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">
            Print-On-Demand Products
          </h2>
          <p className="text-gray-400 mb-8 text-center">
            Apply your designs to a wide range of products
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[
              {name: 'T-Shirts', price: '$24.99', icon: '👕'},
              {name: 'Hoodies', price: '$49.99', icon: '🧥'},
              {name: 'Hats', price: '$19.99', icon: '🧢'},
              {name: 'Mugs', price: '$14.99', icon: '☕'},
              {name: 'Phone Cases', price: '$19.99', icon: '📱'},
              {name: 'Tote Bags', price: '$16.99', icon: '👜'},
              {name: 'Posters', price: '$12.99', icon: '🖼️'},
              {name: 'Stickers', price: '$4.99', icon: '✨'},
            ].map((product) => (
              <div
                key={product.name}
                className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-purple-500 transition-all cursor-pointer text-center"
              >
                <div className="text-5xl mb-4">{product.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{product.name}</h3>
                <p className="text-purple-400 font-semibold">{product.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Design Ideas */}
      <section className="mb-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">
            AI Design Ideas
          </h2>
          <p className="text-gray-400 mb-8 text-center">
            Get inspired with these prompt ideas
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Nano Banana',
                prompt: 'A cute yellow banana riding a surfboard on cosmic waves',
                category: 'Fun & Quirky',
              },
              {
                title: 'Sunset Vibes',
                prompt: 'Abstract sunset with palm trees and retro 80s aesthetic',
                category: 'Aesthetic',
              },
              {
                title: 'Cosmic Adventure',
                prompt: 'Astronaut floating in colorful nebula with planets',
                category: 'Space',
              },
              {
                title: 'Mountain Escape',
                prompt: 'Minimalist mountain range with pine trees at sunset',
                category: 'Nature',
              },
            ].map((idea) => (
              <div
                key={idea.title}
                className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-purple-500 transition-all cursor-pointer"
                onClick={() => setDesignPrompt(idea.prompt)}
              >
                <div className="text-xs text-purple-400 mb-2">{idea.category}</div>
                <h4 className="text-lg font-bold text-white mb-2">{idea.title}</h4>
                <p className="text-sm text-gray-400">{idea.prompt}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Zendrop Integration Info */}
      <section>
        <div className="max-w-4xl mx-auto bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h3 className="text-2xl font-bold text-white mb-4">Powered by Zendrop</h3>
          <p className="text-gray-400 mb-6">
            All products are fulfilled automatically through Zendrop's print-on-demand network.
            No inventory required - we print and ship as orders come in.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold text-purple-500 mb-2">2-5 days</div>
              <div className="text-sm text-gray-400">Production time</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-500 mb-2">Worldwide</div>
              <div className="text-sm text-gray-400">Shipping available</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-500 mb-2">Premium</div>
              <div className="text-sm text-gray-400">Quality guaranteed</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
