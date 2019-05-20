import { generate as generateNexusPrisma } from "nexus-prisma-generator";
import { dirname, join } from "path";
import { findConfigFile, findPrismaConfigFile } from "../../helpers/config";

export default async () => {
  const packageJsonPath = findConfigFile("package.json", { required: true });
  const projectDir = dirname(packageJsonPath);
  const prismaYmlPath = findPrismaConfigFile(projectDir);

  if (prismaYmlPath) {
    await generateNexusPrisma(prismaYmlPath, {
      clientDir: "@generated/photon",
      outputPath: join(projectDir, "node_modules", "@generated/nexus-prisma")
    });
  }

  // const { nexusConfig } = require(indexTsPath);
  // const schema = makeSchema(nexusConfig);
  // new core.TypegenMetadata(nexusConfig).generateArtifacts(schema).catch(e => {
  //   console.error(e);
  // });
};
