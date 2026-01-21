export function createPageUrl(pageName: string) {
    // Preserva a query string e normaliza apenas o caminho
    const [rawPath, rawQuery] = pageName.split('?');
    const path = '/' + rawPath.toLowerCase().replace(/ /g, '-');
    return rawQuery ? `${path}?${rawQuery}` : path;
}