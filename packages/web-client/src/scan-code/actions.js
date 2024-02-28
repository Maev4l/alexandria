import { ACTION_TYPES } from '../store';

const detectingBook = () => ({ type: ACTION_TYPES.DETECTING_BOOK });

const detectBookError = (error) => ({
  type: ACTION_TYPES.DETECT_BOOK_ERROR,
  payload: error,
});

const detectBookSuccess = (data) => ({
  type: ACTION_TYPES.DETECT_BOOK_SUCCESS,
  payload: data,
});

export default {
  detectingBook,
  detectBookError,
  detectBookSuccess,
};
