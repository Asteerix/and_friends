/**
 * Utilitaires de compression pour le cache
 * Utilise des algorithmes simples adaptés au mobile
 */

/**
 * Compresse une chaîne de caractères
 * @param data Données à compresser
 * @returns Données compressées
 */
export function compress(data: string): string {
  // Pour React Native, on utilise une compression simple
  // Dans un cas réel, vous pourriez utiliser une librairie comme lz-string
  try {
    // Compression basique : remplacer les répétitions
    return data.replace(/(.)\1+/g, (match, char) => {
      return char + match.length;
    });
  } catch {
    return data;
  }
}

/**
 * Décompresse une chaîne de caractères
 * @param data Données compressées
 * @returns Données décompressées
 */
export function decompress(data: string): string {
  try {
    // Décompression basique
    return data.replace(/(.)\d+/g, (match, char) => {
      const count = parseInt(match.slice(1), 10);
      return char.repeat(count);
    });
  } catch {
    return data;
  }
}

/**
 * Calcule la taille en octets d'une chaîne
 * @param str Chaîne à mesurer
 * @returns Taille en octets
 */
export function getByteSize(str: string): number {
  return new Blob([str]).size || str.length * 2; // Approximation si Blob n'est pas disponible
}