import { ACTION_TYPES } from '../store';

const fetchingLibraries = () => ({ type: ACTION_TYPES.FETCHING_LIBRARIES });

const fetchLibrariesError = (error) => ({
  type: ACTION_TYPES.FETCH_LIBRARIES_ERROR,
  payload: error,
});

const fetchLibrariesSuccess = (data) => ({
  type: ACTION_TYPES.FETCH_LIBRARIES_SUCCESS,
  payload: data,
});

export default {
  fetchingLibraries,
  fetchLibrariesError,
  fetchLibrariesSuccess,
};
