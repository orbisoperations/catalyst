import {createContext, Dispatch, ReactNode, useContext, useEffect, useReducer} from "react";
import { QueryItem } from "@/components/contexts/AppState";
import {QueryAction, queryItemsReducer, QueryState} from "@/components/query-items-list/reducer";

type QueryItemsContextType = {
  queryItems: QueryItem[];
  queryInput: Partial<QueryItem>;
  dispatch: Dispatch<QueryAction>;
};

const QueryItemsContext = createContext<QueryItemsContextType | undefined>(undefined);

type QueryItemsProviderProps = {
  children: ReactNode;
};

export const QueryItemsProvider: React.FC<QueryItemsProviderProps> = ({ children }) => {

  const [state, dispatch] = useReducer(queryItemsReducer, {
    queryItems: [],
    queryInput: {},
  });

  return (
      <QueryItemsContext.Provider value={{ ...state, dispatch }}>
        {children}
      </QueryItemsContext.Provider>
  );
};

export const useQueryItems = () => {
  const context = useContext(QueryItemsContext);
  if (context === undefined) {
    throw new Error("useQueryItems must be used within a QueryItemsProvider");
  }
  return context;
};