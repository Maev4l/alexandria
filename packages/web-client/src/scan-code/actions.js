import { ACTION_TYPES } from '../store';

export const detectBookSuccess = (data) => ({
  type: ACTION_TYPES.DETECT_BOOK_SUCCESS,
  payload: data,
});
