import { ACTION_TYPES } from '../store';

export const searchItemsSuccess = (data) => ({
  type: ACTION_TYPES.SEARCH_ITEMS_SUCCESS,
  payload: data,
});
