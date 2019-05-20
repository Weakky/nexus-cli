import { ApolloServer } from "apollo-server-express";
import * as express from "express";
import { makeSchema } from "nexus";
import * as path from "path";
import * as types from "./graphql";

const schema = makeSchema({
  types,
  outputs: {
    schema: path.join(__dirname, "./schema.graphql"),
    typegen: path.join(__dirname, "../node_modules/@types/nexus/nexus.d.ts")
  },
  typegenAutoConfig: {
    sources: [
      {
        source: path.join(__dirname, "./types.ts"),
        alias: "types"
      }
    ],
    contextType: "types.Context"
  }
});

const apolloServer = new ApolloServer({
  schema,
  context: ({ req }) => ({ req })
});

const app = express();

apolloServer.applyMiddleware({ app, path: "/" });

app.listen({ port: 4000 }, () => {
  console.log(`🚀  Server ready at http://localhost:4000/`);
});
