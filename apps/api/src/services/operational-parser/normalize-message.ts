export function normalizeMessage(text:string){return text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[‐‑‒–—]/g,"-").replace(/\s+/g," ").trim().toLowerCase()}
