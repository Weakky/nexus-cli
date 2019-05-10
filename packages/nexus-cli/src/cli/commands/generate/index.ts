import { generate as generateNexusPrisma } from "nexus-prisma-generator";
import { core, makeSchema } from "nexus";
import { findConfigFile, findPrismaConfigFile } from "../../../config";
import { join, relative } from "path";
import { existsSync } from "fs";

export default async () => {
  const packageJsonPath = findConfigFile("package.json", { required: true });
  const prismaYmlPath = findPrismaConfigFile(packageJsonPath);

  if (!prismaYmlPath) {
    throw new Error(
      `Could not find an "prisma.yml" file at "prisma/prisma.yml"`
    );
  }

  await generateNexusPrisma(prismaYmlPath, {
    outputPath: "@generated/nexus-prisma",
    clientDir: "@generated/photon"
  });

  const indexTsPath = join(packageJsonPath, "src", "index.ts");

  if (existsSync(indexTsPath)) {
    throw new Error(
      `Could not find an "index.ts" file at "${relative(
        packageJsonPath,
        indexTsPath
      )}"`
    );
  }

  const nexusConfig = require(indexTsPath);
  const schema = makeSchema(nexusConfig);
  new core.TypegenMetadata(nexusConfig).generateArtifacts(schema).catch(e => {
    console.error(e);
  });
};
