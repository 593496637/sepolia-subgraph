import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

// Subgraph GraphQL endpoint from The Graph Studio
// 注意：如果此端点不可用，请在 The Graph Studio 中检查最新的端点 URL
const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/119398/sepolia-transactions/v1.1.0';

const httpLink = createHttpLink({
  uri: SUBGRAPH_URL,
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});