import { prismaObjectType } from '@generated/nexus-prisma'
import { idArg, stringArg } from 'nexus'

/*
type Mutation {
  deletePost(id: ID!): Post
  signupUser(name: String!, email: String!): User!
  createDraft(title: String!, content: String!, authorEmail: String!): Post!
  publish(id: ID!): Post!
}
 */
export const Mutation = prismaObjectType({
  name: 'Mutation',
  definition(t) {
    t.field('deletePost', {
      type: 'Post',
      nullable: true,
      args: {
        id: idArg(),
      },
      resolve: (parent, args, ctx) => {
        return ctx.photon.deletePost({ id: args.id })
      },
    })

    t.field('signupUser', {
      type: 'User',
      args: {
        name: stringArg(),
        email: stringArg(),
      },
      resolve: (parent, { name, email }, ctx) => {
        return ctx.photon.createUser({ name, email })
      },
    })

    t.field('createDraft', {
      type: 'Post',
      args: {
        title: stringArg(),
        content: stringArg(),
        authorEmail: stringArg(),
      },
      resolve: (parent, { title, content, authorEmail }, ctx) => {
        return ctx.photon.createPost({
          title,
          content,
          author: { connect: { email: authorEmail } },
        })
      },
    })

    t.field('publish', {
      type: 'Post',
      args: {
        id: idArg(),
      },
      resolve: (parent, { id }, ctx) => {
        return ctx.photon.updatePost({
          where: { id },
          data: { published: true },
        })
      },
    })
  },
})
