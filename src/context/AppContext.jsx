import { createContext, useContext, useMemo, useReducer } from 'react';

const AppContext = createContext(null);

const initialState = {
  theme: 'dark',
  language: 'en-GB',
  history: []
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'PUSH_HISTORY':
      return { ...state, history: [...state.history, action.payload] };
    case 'CLEAR_HISTORY':
      return { ...state, history: [] };
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used inside AppProvider');
  }

  return context;
};
