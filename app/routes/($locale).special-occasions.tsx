import {json, type LoaderFunctionArgs, type MetaFunction} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {useState} from 'react';
import {OccasionTimeline, type Occasion, type Gift} from '~/components/d3-factory';

export const meta: MetaFunction<typeof loader> = () => {
  return [{title: 'Special Occasions | WowStore'}];
};

export async function loader({context}: LoaderFunctionArgs) {
  // In production, fetch from Firestore/API
  const occasions: Occasion[] = [
    {
      id: '1',
      title: "Mom's Birthday",
      date: new Date('2025-03-15'),
      type: 'birthday',
      description: 'Mom turns 55! Planning a surprise dinner party',
      recipient: 'Mom',
      mood: 'excited',
    },
    {
      id: '2',
      title: 'Our Anniversary',
      date: new Date('2025-06-20'),
      type: 'anniversary',
      description: '5 years together',
      recipient: 'Sarah',
      mood: 'romantic',
    },
    {
      id: '3',
      title: 'Self-Love Sunday',
      date: new Date('2025-02-28'),
      type: 'self-love',
      description: 'Treating myself because I deserve it',
      mood: 'joyful',
    },
  ];

  const gifts: Gift[] = [];

  return json({
    occasions,
    gifts,
  });
}

export default function SpecialOccasions() {
  const {occasions, gifts} = useLoaderData<typeof loader>();
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion | null>(null);

  return (
    <div className="special-occasions-page" style={{background: '#0a0a0a', minHeight: '100vh', padding: '2rem'}}>
      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">
          Special Moments Platform
        </h1>
        <p className="text-2xl text-pink-500 italic mb-4">
          "Why give roses when you can give a dress?"
        </p>
        <p className="text-lg text-gray-400">
          Create lasting memories • Plan surprises • Celebrate special moments
        </p>
      </header>

      {/* Timeline Visualization */}
      <section className="mb-12">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <OccasionTimeline
              occasions={occasions}
              gifts={gifts}
              onOccasionClick={(occasion) => {
                setSelectedOccasion(occasion);
              }}
              width={1200}
              height={600}
              theme="dark"
              showFuture={true}
            />
          </div>
        </div>
      </section>

      {/* Selected Occasion Details */}
      {selectedOccasion && (
        <section className="mb-12">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-pink-600 to-rose-600 rounded-xl p-8 text-white">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-3xl font-bold mb-2">{selectedOccasion.title}</h3>
                  <p className="text-lg opacity-90">
                    {selectedOccasion.date.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  {selectedOccasion.recipient && (
                    <p className="text-sm opacity-80 mt-2">For: {selectedOccasion.recipient}</p>
                  )}
                </div>
                <div className="text-6xl">
                  {selectedOccasion.type === 'birthday' && '🎂'}
                  {selectedOccasion.type === 'anniversary' && '💕'}
                  {selectedOccasion.type === 'achievement' && '🏆'}
                  {selectedOccasion.type === 'self-love' && '💝'}
                  {selectedOccasion.type === 'surprise' && '🎁'}
                  {selectedOccasion.type === 'other' && '✨'}
                </div>
              </div>

              {selectedOccasion.description && (
                <p className="text-lg mb-6 opacity-90">{selectedOccasion.description}</p>
              )}

              <div className="flex gap-4 flex-wrap">
                <button className="px-6 py-3 bg-white text-pink-600 font-bold rounded-lg hover:bg-gray-100 transition-all">
                  Find the Perfect Dress
                </button>
                <button className="px-6 py-3 bg-white/20 text-white font-bold rounded-lg border-2 border-white hover:bg-white/30 transition-all">
                  Schedule Surprise
                </button>
                <button className="px-6 py-3 bg-white/20 text-white font-bold rounded-lg border-2 border-white hover:bg-white/30 transition-all">
                  Add Memories
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Feature Highlights */}
      <section className="mb-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">
            Why Special Moments Matter
          </h2>
          <p className="text-gray-400 mb-8 text-center">
            Every occasion deserves to be celebrated with something meaningful
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '👗',
                title: 'Dress for the Occasion',
                description:
                  'Every special moment deserves a special outfit. Browse curated collections for birthdays, anniversaries, achievements, and more.',
              },
              {
                icon: '📅',
                title: 'Plan Ahead',
                description:
                  'Never miss a special date. Schedule gifts and surprises in advance with automatic reminders.',
              },
              {
                icon: '💌',
                title: 'Personal Messages',
                description:
                  'Add heartfelt messages and video greetings that make your gifts truly unforgettable.',
              },
              {
                icon: '📸',
                title: 'Memory Timeline',
                description:
                  "Document special moments with photos and outfits. Build a beautiful timeline of your life's celebrations.",
              },
              {
                icon: '💝',
                title: 'Self-Love Mode',
                description:
                  'Treat yourself! Set reminders to celebrate your own achievements and practice self-care.',
              },
              {
                icon: '🎁',
                title: 'Surprise Scheduling',
                description:
                  'Plan secret surprises with scheduled deliveries. Make any day special for someone you love.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-center"
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Occasion Ideas */}
      <section className="mb-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">
            Occasions to Celebrate
          </h2>
          <p className="text-gray-400 mb-8 text-center">
            Life is full of moments worth celebrating
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                type: 'Birthdays',
                color: '#ec4899',
                ideas: ["Mom's 50th", "Kid's Birthday", "Friend's Party"],
              },
              {
                type: 'Anniversaries',
                color: '#f43f5e',
                ideas: ['Dating', 'Marriage', 'First Date'],
              },
              {
                type: 'Achievements',
                color: '#8b5cf6',
                ideas: ['Graduation', 'Promotion', 'New Job'],
              },
              {
                type: 'Self-Love',
                color: '#06b6d4',
                ideas: ['Spa Day', 'Personal Milestone', 'Just Because'],
              },
              {
                type: 'Holidays',
                color: '#f59e0b',
                ideas: ["Valentine's", 'Christmas', 'New Year'],
              },
              {
                type: 'Life Events',
                color: '#10b981',
                ideas: ['Wedding', 'Baby Shower', 'Housewarming'],
              },
            ].map((category) => (
              <div
                key={category.type}
                className="bg-gray-900 rounded-xl p-6 border-2 hover:shadow-lg transition-all"
                style={{borderColor: category.color}}
              >
                <h4
                  className="text-lg font-bold mb-3"
                  style={{color: category.color}}
                >
                  {category.type}
                </h4>
                <ul className="text-sm text-gray-400 space-y-2">
                  {category.ideas.map((idea) => (
                    <li key={idea} className="flex items-center">
                      <span className="mr-2">•</span>
                      {idea}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section>
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Start Creating Special Moments</h2>
          <p className="text-xl mb-8 opacity-90">
            Because the gift that keeps on giving is a memory dressed in love
          </p>
          <button className="px-12 py-4 bg-white text-pink-600 font-bold text-lg rounded-xl hover:bg-gray-100 transition-all shadow-lg">
            Plan Your First Occasion
          </button>
        </div>
      </section>
    </div>
  );
}
