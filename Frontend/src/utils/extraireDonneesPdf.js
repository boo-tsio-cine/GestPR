const DEBUT = "__GESTPR_DATA__";
const FIN = "__FIN_GESTPR_DATA__";

function bytesToLatin1(bytes) {
    let out = "";
    const taille = 0x8000;
    for (let i = 0; i < bytes.length; i += taille) {
        out += String.fromCharCode.apply(null, bytes.subarray(i, i + taille));
    }
    return out;
}

async function decompresser(bytes) {
    if (typeof DecompressionStream === "undefined") return null;
    try {
        const flux = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
        return new Uint8Array(await new Response(flux).arrayBuffer());
    } catch {
        return null;
    }
}

function extraireFlux(brut) {
    const flux = [];
    let index = 0;
    while (index < brut.length) {
        const debut = brut.indexOf("stream", index);
        if (debut === -1) break;
        let start = debut + 6;
        if (brut[start] === "\r") start += 1;
        if (brut[start] === "\n") start += 1;
        const fin = brut.indexOf("endstream", start);
        if (fin === -1) break;
        flux.push(brut.slice(start, fin));
        index = fin + 9;
    }
    return flux;
}

function echapper(texte) {
    return texte
        .replace(/\\([nrtbf])/g, " ")
        .replace(/\\([()\\])/g, "$1");
}

function extraireTexte(contenu) {
    const morceaux = [];
    const litteral = /\(((?:\\.|[^\\()])*)\)/g;
    let m;
    while ((m = litteral.exec(contenu)) !== null) {
        morceaux.push(echapper(m[1]));
    }
    const hexa = /<([0-9A-Fa-f\s]{2,})>/g;
    while ((m = hexa.exec(contenu)) !== null) {
        const propre = m[1].replace(/\s+/g, "");
        if (propre.length % 2 !== 0) continue;
        let sortie = "";
        for (let i = 0; i < propre.length; i += 2) {
            sortie += String.fromCharCode(parseInt(propre.slice(i, i + 2), 16));
        }
        morceaux.push(sortie);
    }
    return morceaux;
}

function parserResume(texte) {
    if (!texte) return null;
    const debut = texte.indexOf(DEBUT);
    const fin = texte.lastIndexOf(FIN);
    if (debut === -1 || fin === -1 || fin < debut) return null;
    const brut = texte.slice(debut + DEBUT.length, fin).trim();
    if (!brut) return null;
    try {
        return JSON.parse(brut);
    } catch {
        return null;
    }
}

export async function extraireResumeDuPdf(source) {
    try {
        const buffer = source instanceof Blob ? await source.arrayBuffer() : source;
        const brut = bytesToLatin1(new Uint8Array(buffer));
        const sources = [brut];
        for (const octets of extraireFlux(brut)) {
            const decompresse = await decompresser(new Uint8Array(octets.map((c) => c.charCodeAt(0) & 0xff)));
            sources.push(decompresse ? bytesToLatin1(decompresse) : octets);
        }
        for (const contenu of sources) {
            const trouve = parserResume(contenu);
            if (trouve) return trouve;
            const joint = extraireTexte(contenu).join("");
            if (joint.includes(DEBUT)) {
                const trouve2 = parserResume(joint);
                if (trouve2) return trouve2;
            }
        }
    } catch (err) {
        console.warn("Impossible d'extraire les données JSON masquées du PDF", err);
    }
    return null;
}