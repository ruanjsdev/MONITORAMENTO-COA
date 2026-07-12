import{defineConfig}from"vitest/config";import path from"node:path";
export default defineConfig({resolve:{alias:{"@coa-bot/shared":path.resolve(__dirname,"packages/shared/src/index.ts"),"@coa-bot/excel-contracts":path.resolve(__dirname,"packages/excel-contracts/src/index.ts")}},test:{environment:"node",include:["tests/**/*.integration.test.ts"],testTimeout:60_000}});
