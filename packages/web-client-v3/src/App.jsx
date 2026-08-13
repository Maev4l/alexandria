import { BrowserRouter } from 'react-router-dom';
import { LibrariesProvider } from '@/state/LibrariesContext.jsx';
import AppRoutes from './routes.jsx';

const App = () => (
  <BrowserRouter>
    <LibrariesProvider>
      <AppRoutes />
    </LibrariesProvider>
  </BrowserRouter>
);

export default App;
