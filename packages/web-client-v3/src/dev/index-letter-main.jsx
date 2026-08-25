import { createRoot } from 'react-dom/client';
import IndexLetterHarness from './IndexLetterHarness.jsx';
import '../index.css';

// Deliberately NOT main.jsx: no Amplify, no router, no auth gate. The harness exists to
// isolate IndexLetter from the rest of the app, not to re-test the app around it.
createRoot(document.getElementById('root')).render(<IndexLetterHarness />);
