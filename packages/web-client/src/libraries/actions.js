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

const creatingLibrary = () => ({ type: ACTION_TYPES.CREATING_LIBRARY });

const createLibrarySuccess = (data) => ({
  type: ACTION_TYPES.CREATE_LIBRARY_SUCCESS,
  payload: data,
});

const createLibraryError = (error) => ({
  type: ACTION_TYPES.CREATE_LIBRARY_ERROR,
  payload: error,
});

export default {
  fetchingLibraries,
  fetchLibrariesError,
  fetchLibrariesSuccess,
  creatingLibrary,
  createLibrarySuccess,
  createLibraryError,
};
