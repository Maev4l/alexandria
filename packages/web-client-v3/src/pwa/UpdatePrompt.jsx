import UpdateNotice from './UpdateNotice.jsx';
import { usePWA } from './PWAContext.jsx';

// The notice alone. Registration, the hourly check and the manual one all live in `PWAContext`,
// because `useRegisterSW` must be called once and the registration it returns is the only thing
// that can be asked to check — see that file for why a manual check exists at all.
const UpdatePrompt = () => {
  const { needRefresh, applyUpdate } = usePWA();
  if (!needRefresh) return null;
  return <UpdateNotice onApply={applyUpdate} />;
};

export default UpdatePrompt;
