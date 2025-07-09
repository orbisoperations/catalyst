import { QueryItem } from '@/components/contexts/AppState';
import { storage } from '@/app/storage';

export type QueryAction =
    | { type: 'create'; payload: QueryItem }
    | { type: 'delete'; id: string }
    | { type: 'load'; payload: QueryItem[] }
    | { type: 'input'; payload: Partial<QueryItem> };

export type QueryState = {
    queryInput: Partial<QueryItem>;
    queryItems: ({ id?: string } & QueryItem)[];
};

export const queryItemsReducer = (state: QueryState, action: QueryAction): QueryState => {
    switch (action.type) {
        case 'load': {
            return {
                ...state,
                // react magic happens right about here
                queryItems: action.payload,
            };
        }
        case 'create': {
            console.log('adding query');
            const id = crypto.randomUUID();

            (async () => {
                const data = JSON.stringify({ id, ...state.queryInput });
                console.log({ data });
                await storage.setItem(id, data);
            })();

            return {
                ...state,
                // react magic happens right about here
                queryItems: [...state.queryItems, { id, ...action.payload }],
            };
        }
        // Stores the input for Activation Widget
        case 'input': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatedQueryInput = { ...state.queryInput } as QueryItem & Record<string, any>;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const input = action.payload as any;
            Object.keys(input).forEach((key) => {
                if (input[key]) {
                    updatedQueryInput[key] = input[key];
                }
            });
            return {
                ...state,
                queryInput: updatedQueryInput,
            };
        }
        case 'delete': {
            (async () => {
                await storage.removeItem(`${action.id}`);
            })();
            return {
                ...state,
                queryItems: state.queryItems.filter((aq) => aq.id !== action.id),
            };
        }
        default: {
            return state;
        }
    }
};
