import { useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader.jsx';

// Placeholder — replaced by its own task in the implementation plan. Still gets a real landmark
// and heading now: a stub is still a screen a reader can land on, and retrofitting this once the
// build catches up costs more than writing it alongside the stub.
//
// `onBack` is not decoration: installed as a standalone PWA there is no browser chrome and no
// back gesture, so without it this screen was a dead end (see the critique this fixes).
const About = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-paper">
      <AppHeader wordmark onBack={() => navigate(-1)} search={false} />
      <main className="p-4">
        <h1 className="sr-only">About</h1>
        <p className="caps text-xs font-bold text-ink-soft">About — not built</p>
      </main>
    </div>
  );
};

export default About;
