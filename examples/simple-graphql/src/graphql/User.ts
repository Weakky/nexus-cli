import { objectType } from "nexus";

/*
type User {
  id: ID!
  name: String!
}
*/
export const User = objectType({
  name: "User",
  definition(t) {
    t.id("id");
    t.string("name");
  }
});
