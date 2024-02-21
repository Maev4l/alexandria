import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import log from 'loglevel';

import { reducer, INITIAL_STATE } from './reducer';

const StoreContext = createContext();

const isDevelopement = process.env.NODE_ENV === 'development';
log.setLevel(log.levels.DEBUG);

export const StoreProvider = ({ children }) => {
  const prevState = useRef(INITIAL_STATE);

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    if (isDevelopement) {
      log.debug('Prev state: ', prevState.current);

      log.debug('Next state: ', state);

      prevState.current = state;
    }
  }, [state]);

  const withLogger = (d) => (action) => {
    if (isDevelopement) {
      log.debug('Action Type:', action);
    }

    return d(action);
  };

  const asyncDispatch = (action) => {
    if (typeof action === 'function') {
      return action(withLogger(dispatch));
    }
    return withLogger(dispatch(action));
  };

  const stableDispatch = useCallback(asyncDispatch, [dispatch]);

  const v = useMemo(
    () => ({
      state,

      dispatch: stableDispatch,
    }),

    [state, stableDispatch],
  );

  return <StoreContext.Provider value={v}>{children}</StoreContext.Provider>;
};

export const useDispatch = () => {
  const { dispatch } = useContext(StoreContext);
  return dispatch;
};

export const useSelector = (fn) => {
  const { state: rootStore } = useContext(StoreContext);

  const selectionResult = fn(rootStore);
  return selectionResult;
};

export const useAuth = () => {
  const { state: rootStore } = useContext(StoreContext);
  const {
    authn: {
      token: {
        payload: { sub },
      },
    },
  } = rootStore;

  return {
    userId: sub.replaceAll('-', '').toUpperCase(),
  };
};
