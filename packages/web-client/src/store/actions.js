import ACTION_TYPES from './types';

export const appWaiting = () => ({ type: ACTION_TYPES.APP_WAITING });

export const appError = (error) => ({
  type: ACTION_TYPES.APP_ERROR,
  payload: error,
});

export const appRefreshing = () => ({ type: ACTION_TYPES.APP_REFRESHING });

export const resetLibraryItems = () => ({
  type: ACTION_TYPES.RESET_LIBRARY_ITEMS,
});
