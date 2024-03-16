import ACTION_TYPES from './types';

export const INITIAL_STATE = {
  loading: false,
  refreshing: false,
  preferences: {
    darkMode: false,
  },
  authn: {
    state: 'FETCHING_TOKEN', // LOGGED_IN, LOGGED_OUT
    token: null,
  },
  notification: {
    text: null,
    severity: '', // error, success
  },
  resolvedBooks: [],
  libraries: [],
  lastAction: '',
  libraryItems: {
    items: [],
    nextToken: '',
  },
};

export const reducer = (state, action) => {
  const { type, payload } = action;

  const newState = { ...state, lastAction: type };

  switch (type) {
    case ACTION_TYPES.UPDATE_BOOK_SUCCESS:
    case ACTION_TYPES.CREATE_BOOK_SUCCESS:
    case ACTION_TYPES.DELETE_LIBRARY_ITEM_SUCCESS:
    case ACTION_TYPES.REFRESH_LIBRARY_ITEMS_SUCCESS: {
      const { items, nextToken } = payload;
      return {
        ...newState,
        loading: false,
        refreshing: false,
        libraryItems: { items: [...items], nextToken },
      };
    }

    case ACTION_TYPES.FETCH_LIBRARY_ITEMS_SUCCESS: {
      const { items, nextToken } = payload;
      return {
        ...newState,
        loading: false,
        refreshing: false,
        libraryItems: { items: [...newState.libraryItems.items, ...items], nextToken },
      };
    }

    case ACTION_TYPES.SIGN_IN_SUCCESS: {
      const authn = {
        state: 'LOGGED_IN',
        token: payload,
      };
      return { ...newState, loading: false, authn };
    }

    case ACTION_TYPES.FETCH_TOKEN_SUCCESS: {
      const token = payload;
      const authn = {
        state: '',
        token: null,
      };

      if (token) {
        authn.state = 'LOGGED_IN';
        authn.token = token;
      } else {
        authn.state = 'LOGGED_OUT';
      }
      return { ...newState, loading: false, authn };
    }

    case ACTION_TYPES.DETECT_BOOK_SUCCESS: {
      const { detectedBooks } = payload;
      return { ...newState, loading: false, resolvedBooks: detectedBooks };
    }

    case ACTION_TYPES.DISMISS_NOTIFICATION: {
      return {
        ...newState,
        loading: false,
        notification: { text: null, severity: '' },
      };
    }

    case ACTION_TYPES.SIGN_OUT_SUCCESS: {
      return {
        ...newState,
        loading: false,
        authn: {
          state: 'LOGGED_OUT',
          token: null,
        },
        weekCursor: null,
        schedules: [],
      };
    }

    case ACTION_TYPES.READ_APP_PREFERENCES_SUCCESS: {
      if (payload !== null) {
        return { ...newState, preferences: payload, loading: false };
      }
      return { ...newState, loading: false };
    }

    case ACTION_TYPES.WRITE_APP_PREFERENCES_SUCCESS: {
      return { ...newState, preferences: payload, loading: false };
    }

    case ACTION_TYPES.SIGNUP_SUCCESS: {
      return {
        ...newState,
        loading: false,
        notification: {
          text: 'Your request is being processed.\nAn administrator will finalize your registration.',
          severity: 'success',
        },
      };
    }

    case ACTION_TYPES.UPDATE_LIBRARY_SUCCESS: {
      const { libraries } = payload;
      return {
        ...newState,
        loading: false,
        libraries,
        notification: {
          text: 'Library updated.',
          severity: 'success',
        },
      };
    }

    case ACTION_TYPES.CREATE_LIBRARY_SUCCESS: {
      const { libraries } = payload;
      return {
        ...newState,
        loading: false,
        libraries,
        notification: {
          text: 'Library added.',
          severity: 'success',
        },
      };
    }

    case ACTION_TYPES.DELETE_LIBRARY_SUCCESS: {
      const { libraries } = payload;
      return {
        ...newState,
        loading: false,
        libraries,
        notification: {
          text: 'Library deleted.',
          severity: 'success',
        },
      };
    }

    case ACTION_TYPES.FETCH_LIBRARIES_SUCCESS: {
      const { libraries } = payload;
      return {
        ...newState,
        loading: false,
        refreshing: false,
        libraries,
      };
    }

    case ACTION_TYPES.APP_WAITING: {
      return { ...newState, loading: true };
    }

    case ACTION_TYPES.APP_REFRESHING: {
      return { ...newState, refreshing: true };
    }

    case ACTION_TYPES.APP_ERROR: {
      const error = payload;
      return {
        ...newState,
        loading: false,
        refreshing: false,
        notification: { text: error.message, severity: 'error' },
      };
    }

    default:
      return newState;
  }
};
