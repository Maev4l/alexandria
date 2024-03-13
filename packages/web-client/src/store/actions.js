import ACTION_TYPES from './types';

export const appWaiting = () => ({ type: ACTION_TYPES.APP_WAITING });

export const appError = (error) => ({
  type: ACTION_TYPES.APP_ERROR,
  payload: error,
});
