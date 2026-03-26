export function createPageUrl(pageName: string) {
    // Preserva a query string e normaliza apenas o caminho (mantém case para casar com rotas existentes)
    const [rawPath, rawQuery] = pageName.split('?');
    const path = '/' + rawPath.replace(/ /g, '-');
    return rawQuery ? `${path}?${rawQuery}` : path;
}