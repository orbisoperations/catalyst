import {QueryItem} from "@/components/contexts/AppState";

type QueryAction = { type: "create", payload: QueryItem } | { type: "delete", name: string } | { type: "input", payload: Partial<QueryItem> };

export type QueryState = {
  queryInput: Partial<QueryItem>,
  queryItems: QueryItem[],
};

export function queryItemsReducer(state: QueryState, action: QueryAction): QueryState {
  switch (action.type) {
    case 'create': {
      console.log('adding query')
      state.queryItems = state.queryItems ? state.queryItems.concat(action.payload) : [action.payload];

      return state;
    }
    case 'input': {
      Object.keys(action.payload).map(key => {
        // @ts-ignore typescript doesn't like this
        if(action.payload[key]) {
        // @ts-ignore typescript doesn't like this
          state.queryInput[key] = action.payload[key]
        }
      })
      return state;
    }
    case 'delete': {
      state.queryItems = state.queryItems.filter(aq => aq.name === action.name)
      return state;
    }
    default: {
      return state;
    }
  }
}