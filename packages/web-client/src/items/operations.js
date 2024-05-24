import {
  fetchItemHistorySuccess,
  refreshItemHistorySuccess,
  deleteItemHistorySuccess,
} from './actions';
import { appError, appWaiting, appRefreshing } from '../store';
import { api } from '../api';

export const deleteLibraryItemHistory = (item) => async (dispatch) => {
  dispatch(appWaiting());

  try {
    await api.del(`/v1/libraries/${item.libraryId}/items/${item.id}/events`);
    dispatch(deleteItemHistorySuccess());
  } catch (e) {
    dispatch(appError(e));
  }
};

export const fetchItemHistory =
  (item, nextToken, refresh = false) =>
  async (dispatch) => {
    dispatch(refresh ? appRefreshing() : appWaiting());

    try {
      let url = `/v1/libraries/${item.libraryId}/items/${item.id}/events`;
      if (nextToken) {
        url += `?nextToken=${nextToken}`;
      }
      const data = await api.get(url);
      dispatch(refresh ? refreshItemHistorySuccess(data) : fetchItemHistorySuccess(data));
    } catch (e) {
      dispatch(appError(e));
    }
  };
