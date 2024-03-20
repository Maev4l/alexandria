import { searchItemsSuccess } from './actions';
import { api } from '../api';
import { appError, appWaiting } from '../store';

export const searchItems = (terms) => async (dispatch) => {
  dispatch(appWaiting());

  try {
    const data = await api.post('/v1/search', { terms: terms.split(' ') });
    dispatch(searchItemsSuccess(data));
  } catch (e) {
    dispatch(appError(e));
  }
};
