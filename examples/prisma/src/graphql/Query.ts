import { prismaObjectType } from '@generated/nexus-prisma'
import { stringArg } from 'nexus'

/*
type Query {
  feed: [Post!]!
  filterPosts(searchString: String!): [Post!]!
}
*/
export const Query = prismaObjectType({
  name: 'Query',
  definition(t) {
    t.list.field('feed', {
      type: 'Post',
      resolve: (parent, args, ctx) => {
        return ctx.photon.posts({
          where: { published: true },
        })
      },
    })

    t.list.field('filterPosts', {
      type: 'Post',
      args: {
        searchString: stringArg(),
      },
      resolve: (parent, { searchString }, ctx) => {
        return ctx.photon.posts({
          where: {
            OR: [
              { title_contains: searchString },
              { content_contains: searchString },
            ],
          },
        })
      },
    })
  },
})
