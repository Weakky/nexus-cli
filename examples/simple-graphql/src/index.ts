import { makePrismaSchema } from '@generated/nexus-prisma'
import { Photon } from '@generated/photon'
import { ApolloServer } from 'apollo-server-express'
import * as express from 'express'
import * as path from 'path'
import * as types from './graphql'

async function main() {
  const photon = new Photon({ ... })
  
  const schema = makePrismaSchema({
    types,
    outputs: {
      schema: path.join(__dirname, './schema.graphql'),
    },
    typegenAutoConfig: {
      sources: [
        {
          source: path.join(__dirname, './types.ts'),
          alias: 'types',
        },
      ],
      contextType: 'types.Context',
    },
  })

  const apolloServer = new ApolloServer({
    schema,
    context: ({ req }) => ({ req, photon }),
  })
  const app = express()

  apolloServer.applyMiddleware({ app, path: '/' })
  await photon.start()

  app.listen({ port: 4000 }, () => {
    console.log(`🚀  Server ready at http://localhost:4000/`)
  })
}

main()