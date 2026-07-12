import path from"node:path";import{fileURLToPath}from"node:url";
export const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
export const officialRoot=path.resolve(projectRoot,"planilhas");
export const homologationRoot=path.resolve(projectRoot,"planilhas-homologacao");
export const tempRoot=path.resolve(homologationRoot,"temp");
function inside(file:string,root:string){const relative=path.relative(root,path.resolve(file));return relative!==""&&!relative.startsWith("..")&&!path.isAbsolute(relative)}
export function validateDevWorkbook(file:string){const resolved=path.resolve(file);if(inside(resolved,officialRoot)||resolved===officialRoot)throw safety("OFFICIAL_WORKBOOK_BLOCKED","Planilhas oficiais nunca podem ser abertas para escrita.");if(!inside(resolved,homologationRoot))throw safety("UNAUTHORIZED_PATH","Arquivo fora de planilhas-homologacao.");if(path.extname(resolved).toLowerCase()!==".xlsm"||!path.basename(resolved).endsWith(".dev.xlsm"))throw safety("INVALID_DEV_WORKBOOK","Somente cópias .dev.xlsm são autorizadas.");return resolved}
export function validateTempImage(file:string){const resolved=path.resolve(file);if(!inside(resolved,tempRoot)||path.extname(resolved).toLowerCase()!==".png")throw safety("UNAUTHORIZED_TEMP_PATH","Imagem temporária fora da pasta autorizada.");return resolved}
export function safety(code:string,message:string){return Object.assign(new Error(message),{code})}
