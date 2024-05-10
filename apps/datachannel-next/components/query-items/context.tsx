import {createContext, Reducer, useReducer, useState, Dispatch} from 'react';
import {queryItemsReducer, QueryState} from "@/components/query-items/reducer";

export const QueryItemsContext = createContext<QueryState | null>(null);
export const QueryItemsDispatchContext = createContext(null);

export function QueryItemsContextProvider({children}: any) {

  const [queryItemsState, setQueryItemsState] = useState<QueryState>({
    queryItems: [],
    queryInput: {}
  });

  const [queryItems, dispatch] = useReducer(queryItemsReducer, queryItemsState);

  return (
      <QueryItemsContext.Provider value={queryItems}>
        {/*// @ts-ignore*/}
        <QueryItemsDispatchContext.Provider value={dispatch}>
          {children}
        </QueryItemsDispatchContext.Provider>
      </QueryItemsContext.Provider>
  )
}
